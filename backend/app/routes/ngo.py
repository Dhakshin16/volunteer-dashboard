from fastapi import APIRouter, Depends, HTTPException
from app.utils.dependencies import get_current_user
from app.services.ngo_service import (
    upsert_ngo_profile, get_ngo_profile, list_ngos, get_ngo_by_id,
)
from app.services.cause_service import list_causes
from app.services.analytics_service import ngo_stats
from app.services.user_service import list_admin_users
from app.services.notification_service import notify
from app.schemas.models import NgoProfileIn

import asyncio

router = APIRouter()


@router.get("/me")
def my_ngo(user=Depends(get_current_user)):
    return get_ngo_profile(user["id"])


@router.post("/me")
async def upsert_ngo(payload: NgoProfileIn, user=Depends(get_current_user)):
    existing = get_ngo_profile(user["id"])
    is_new = existing is None
    is_resubmit = bool(existing and existing.get("rejection_reason"))

    profile = upsert_ngo_profile(user["id"], payload.model_dump())

    # Confirmation to the org owner
    org_name = profile.get("org_name") or "your organisation"
    if is_new:
        owner_title = "Application submitted"
        owner_msg = f"Thanks for applying with {org_name}. An admin will review your submission shortly."
    elif is_resubmit:
        owner_title = "Re-submission received"
        owner_msg = f"Your updated application for {org_name} is back in review."
    else:
        owner_title = "Organisation profile updated"
        owner_msg = f"Your organisation profile for {org_name} was updated successfully."

    coros = [
        notify(
            user_id=user["id"],
            email=user.get("email") or profile.get("contact_email"),
            phone=profile.get("contact_phone"),
            title=owner_title,
            message=owner_msg,
            kind="info",
            link="/ngo/pending",
        )
    ]

    # Heads-up to admins for new submissions or resubmissions
    if is_new or is_resubmit:
        admins = list_admin_users()
        admin_msg = f"{org_name} has {'re-submitted' if is_resubmit else 'submitted'} an application for review."
        for adm in admins:
            coros.append(notify(
                user_id=adm.get("id"),
                email=adm.get("email"),
                phone=None,
                title="New organisation pending review",
                message=admin_msg,
                kind="info",
                link="/admin/ngos",
            ))

    await asyncio.gather(*coros, return_exceptions=True)
    return profile


@router.get("/list")
def list_all(approved_only: bool = True):
    return list_ngos(approved_only=approved_only)


@router.get("/{ngo_id}")
def get_ngo(ngo_id: str):
    return get_ngo_by_id(ngo_id)


@router.get("/me/stats")
def my_stats(user=Depends(get_current_user)):
    n = get_ngo_profile(user["id"])
    if not n:
        return {}
    return ngo_stats(n["id"])


@router.get("/me/causes")
def my_causes(user=Depends(get_current_user)):
    n = get_ngo_profile(user["id"])
    if not n:
        return []
    return list_causes(ngo_id=n["id"])
