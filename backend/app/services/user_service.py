"""User service — manages user docs in Firestore (linked by Firebase UID)."""
from app.core.firebase import db
from app.core.config import ADMIN_EMAILS
from app.utils.firestore_utils import now_iso, serialize_doc


def get_or_create_user(fb_user: dict) -> dict:
    uid = fb_user["uid"]
    email = (fb_user.get("email") or "").lower()
    name = fb_user.get("name") or fb_user.get("display_name") or email.split("@")[0]
    photo = fb_user.get("picture")

    ref = db.collection("users").document(uid)
    snap = ref.get()
    if snap.exists:
        existing = serialize_doc(snap)
        # auto-promote admin if email in ADMIN_EMAILS
        if email in ADMIN_EMAILS and existing.get("role") != "admin":
            ref.update({"role": "admin"})
            existing["role"] = "admin"
        return existing

    role = "admin" if email in ADMIN_EMAILS else None
    payload = {
        "email": email,
        "name": name,
        "photo_url": photo,
        "role": role,
        "onboarded": False,
        "created_at": now_iso(),
    }
    ref.set(payload)
    payload["id"] = uid
    return payload


def set_role(user_id: str, role: str) -> dict:
    if role not in ("volunteer", "ngo", "admin"):
        raise ValueError("Invalid role")
    ref = db.collection("users").document(user_id)
    ref.update({"role": role, "onboarded": True})
    return serialize_doc(ref.get())


def is_admin_user(user: dict) -> bool:
    return user.get("role") == "admin" or (user.get("email", "").lower() in ADMIN_EMAILS)


def get_user(user_id: str) -> dict:
    return serialize_doc(db.collection("users").document(user_id).get())


def list_admin_users() -> list:
    """Return all users with role=admin (used for admin notifications)."""
    return [serialize_doc(d) for d in db.collection("users").where("role", "==", "admin").stream()]
