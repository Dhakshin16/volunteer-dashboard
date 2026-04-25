from fastapi import APIRouter, Depends, HTTPException
from app.utils.dependencies import get_current_user
from app.services.cause_service import (
    create_cause, update_cause, get_cause, list_causes, delete_cause,
)
from app.services.ngo_service import get_ngo_profile
from app.services.ai_service import summarize_cause
from app.services.enrollment_service import list_cause_enrollments
from app.services.report_service import list_reports_by_cause
from app.services.donation_service import list_donations_by_cause
from app.services.event_service import list_events_by_cause
from app.services.notification_service import notify
from app.schemas.models import CauseIn

import asyncio

router = APIRouter()


@router.get("/")
def list_all(category: str = None, status: str = "open"):
    return list_causes(status=status, category=category, limit=100)


@router.post("/")
async def create(payload: CauseIn, user=Depends(get_current_user)):
    ngo = get_ngo_profile(user["id"])
    if not ngo:
        raise HTTPException(403, "Create your NGO profile first")
    if not ngo.get("is_approved"):
        raise HTTPException(403, "NGO not yet approved by admin")
    cause = create_cause(ngo["id"], payload.model_dump())
    # add ai summary
    summary = await summarize_cause(cause)
    update_cause(cause["id"], {"ai_summary": summary})
    cause["ai_summary"] = summary
    # Confirm to NGO owner
    asyncio.ensure_future(notify(
        user_id=user["id"],
        email=user.get("email") or ngo.get("contact_email"),
        phone=ngo.get("contact_phone"),
        title=f"Cause published: {cause.get('title')}",
        message=f"Your new opportunity '{cause.get('title')}' is now live and discoverable to volunteers.",
        kind="success",
        link=f"/ngo/causes/{cause['id']}",
    ))
    return cause


@router.get("/{cause_id}")
def get_one(cause_id: str):
    c = get_cause(cause_id)
    if not c:
        raise HTTPException(404, "Cause not found")
    return c


@router.patch("/{cause_id}")
def patch(cause_id: str, payload: dict, user=Depends(get_current_user)):
    cause = get_cause(cause_id)
    if not cause:
        raise HTTPException(404, "Not found")
    ngo = get_ngo_profile(user["id"])
    if not ngo or ngo["id"] != cause["ngo_id"]:
        if user.get("role") != "admin":
            raise HTTPException(403, "Not your cause")
    return update_cause(cause_id, payload)


@router.delete("/{cause_id}")
def delete(cause_id: str, user=Depends(get_current_user)):
    cause = get_cause(cause_id)
    if not cause:
        raise HTTPException(404, "Not found")
    ngo = get_ngo_profile(user["id"])
    if not ngo or ngo["id"] != cause["ngo_id"]:
        if user.get("role") != "admin":
            raise HTTPException(403, "Not your cause")
    delete_cause(cause_id)
    return {"ok": True}


@router.get("/{cause_id}/volunteers")
def cause_volunteers(cause_id: str):
    return list_cause_enrollments(cause_id)


@router.get("/{cause_id}/reports")
def cause_reports(cause_id: str):
    return list_reports_by_cause(cause_id)


@router.get("/{cause_id}/donations")
def cause_donations(cause_id: str):
    return list_donations_by_cause(cause_id)


@router.get("/{cause_id}/events")
def cause_events(cause_id: str):
    return list_events_by_cause(cause_id)
