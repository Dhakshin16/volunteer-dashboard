from fastapi import APIRouter, Depends
from app.utils.dependencies import get_current_user
from app.services.enrollment_service import (
    enroll, list_my_enrollments, log_hours, withdraw,
)
from app.services.cause_service import get_cause
from app.services.ngo_service import get_ngo_by_id, get_ngo_owner
from app.services.notification_service import notify
from app.schemas.models import EnrollIn, HoursIn

import asyncio

router = APIRouter()


@router.post("/")
async def post_enroll(payload: EnrollIn, user=Depends(get_current_user)):
    enrollment = enroll(user["id"], payload.cause_id, payload.motivation)
    cause = get_cause(payload.cause_id) or {}
    cause_title = cause.get("title") or "your cause"

    coros = []
    # Confirm to volunteer
    coros.append(notify(
        user_id=user["id"],
        email=user.get("email"),
        phone=None,
        title=f"You've joined {cause_title}",
        message="Welcome aboard. The organising team has been notified and will be in touch soon.",
        kind="success",
        link=f"/v/causes/{payload.cause_id}",
    ))

    # Notify NGO owner
    ngo_owner = get_ngo_owner(cause.get("ngo_id")) or {}
    ngo = get_ngo_by_id(cause.get("ngo_id")) or {}
    volunteer_name = user.get("name") or user.get("email") or "A volunteer"
    if ngo_owner.get("id"):
        coros.append(notify(
            user_id=ngo_owner.get("id"),
            email=ngo_owner.get("email") or ngo.get("contact_email"),
            phone=ngo.get("contact_phone"),
            title=f"New volunteer for {cause_title}",
            message=f"{volunteer_name} just signed up to help with '{cause_title}'.",
            kind="info",
            link=f"/ngo/causes/{payload.cause_id}",
        ))

    await asyncio.gather(*coros, return_exceptions=True)
    return enrollment


@router.get("/me")
def my_enrollments(user=Depends(get_current_user)):
    return list_my_enrollments(user["id"])


@router.post("/hours")
def post_hours(payload: HoursIn, user=Depends(get_current_user)):
    return log_hours(user["id"], payload.enrollment_id, payload.hours, payload.note)


@router.post("/{enrollment_id}/withdraw")
def post_withdraw(enrollment_id: str, user=Depends(get_current_user)):
    return withdraw(user["id"], enrollment_id)
