"""Auth helpers — currently exposes a DEV-ONLY login endpoint that mints
Firebase ID tokens via the Identity Toolkit REST API. This lets backend tests
(and other automated tooling) obtain real bearer tokens without driving the
browser through Firebase JS SDK.

Gated by ENABLE_DEV_AUTH=true in the environment. NEVER enable in production.
"""
import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.config import ADMIN_EMAILS
from app.services.user_service import set_role
from app.core.firebase import db
from app.utils.firestore_utils import now_iso

router = APIRouter()

ENABLE_DEV_AUTH = os.getenv("ENABLE_DEV_AUTH", "false").lower() == "true"
FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY")
IT_BASE = "https://identitytoolkit.googleapis.com/v1/accounts"


class DevLoginIn(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    role: Optional[str] = None  # volunteer | ngo | admin (forced for tests)


class DevLoginOut(BaseModel):
    id_token: str
    refresh_token: Optional[str] = None
    uid: str
    email: str
    role: Optional[str] = None
    created: bool = False


def _ensure_dev_enabled():
    if not ENABLE_DEV_AUTH:
        raise HTTPException(403, "Dev auth is disabled")
    if not FIREBASE_WEB_API_KEY:
        raise HTTPException(500, "FIREBASE_WEB_API_KEY not configured")


async def _signin(email: str, password: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{IT_BASE}:signInWithPassword?key={FIREBASE_WEB_API_KEY}",
            json={"email": email, "password": password, "returnSecureToken": True},
        )
        if r.status_code == 200:
            return r.json()
        return None


async def _signup(email: str, password: str, name: Optional[str]) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{IT_BASE}:signUp?key={FIREBASE_WEB_API_KEY}",
            json={
                "email": email,
                "password": password,
                "displayName": name or email.split("@")[0],
                "returnSecureToken": True,
            },
        )
        if r.status_code == 200:
            return r.json()
        try:
            detail = r.json().get("error", {}).get("message", r.text)
        except Exception:
            detail = r.text
        raise HTTPException(400, f"Signup failed: {detail}")


@router.post("/dev-login", response_model=DevLoginOut)
async def dev_login(payload: DevLoginIn):
    """Login or auto-register a Firebase user and return a real ID token.
    DEV ONLY. Enabled when ENABLE_DEV_AUTH=true."""
    _ensure_dev_enabled()

    created = False
    res = await _signin(payload.email, payload.password)
    if not res:
        res = await _signup(payload.email, payload.password, payload.name)
        created = True

    uid = res.get("localId")
    id_token = res.get("idToken")
    refresh_token = res.get("refreshToken")
    if not uid or not id_token:
        raise HTTPException(500, "Identity Toolkit response missing token/uid")

    # Ensure a Firestore user doc exists (mirror what get_or_create_user would do
    # on first authenticated request, so the role can be set immediately).
    ref = db.collection("users").document(uid)
    snap = ref.get()
    email_lower = payload.email.lower()
    if not snap.exists:
        role = "admin" if email_lower in ADMIN_EMAILS else None
        ref.set({
            "email": email_lower,
            "name": payload.name or email_lower.split("@")[0],
            "photo_url": None,
            "role": role,
            "onboarded": False,
            "created_at": now_iso(),
        })
    elif email_lower in ADMIN_EMAILS:
        existing = snap.to_dict() or {}
        if existing.get("role") != "admin":
            ref.update({"role": "admin"})

    # Optionally force a role (skipped for admin email — that's auto)
    role = None
    if payload.role and email_lower not in ADMIN_EMAILS:
        if payload.role not in ("volunteer", "ngo", "admin"):
            raise HTTPException(400, "Invalid role")
        updated = set_role(uid, payload.role)
        role = updated.get("role")
    else:
        role = (ref.get().to_dict() or {}).get("role")

    return DevLoginOut(
        id_token=id_token,
        refresh_token=refresh_token,
        uid=uid,
        email=email_lower,
        role=role,
        created=created,
    )
