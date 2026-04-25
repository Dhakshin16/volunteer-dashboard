from fastapi import APIRouter, Depends, HTTPException
from app.utils.dependencies import get_current_user
from app.services.event_service import (
    create_event, list_events_by_ngo, list_upcoming_events, rsvp_event,
)
from app.services.ngo_service import get_ngo_profile
from app.services.notification_service import notify
from app.services.user_service import get_user
from app.schemas.models import EventIn

import asyncio

router = APIRouter()


@router.post("/")
async def post_event(payload: EventIn, user=Depends(get_current_user)):
    ngo = get_ngo_profile(user["id"])
    if not ngo or not ngo.get("is_approved"):
        raise HTTPException(403, "Approved NGO required")
    event = create_event(ngo["id"], payload.model_dump())
    # Notify NGO owner of successful event creation
    asyncio.ensure_future(notify(
        user_id=user["id"],
        email=user.get("email") or ngo.get("contact_email"),
        phone=ngo.get("contact_phone"),
        title=f"Event scheduled: {event.get('title')}",
        message=f"Your event '{event.get('title')}' on {event.get('starts_at','')} is now live.",
        kind="success",
        link=f"/ngo/causes/{event.get('cause_id')}",
    ))
    return event


@router.get("/upcoming")
def upcoming():
    return list_upcoming_events()


@router.get("/me")
def my_events(user=Depends(get_current_user)):
    ngo = get_ngo_profile(user["id"])
    if not ngo:
        return []
    return list_events_by_ngo(ngo["id"])


@router.post("/{event_id}/rsvp")
async def rsvp(event_id: str, user=Depends(get_current_user)):
    event = rsvp_event(user["id"], event_id)
    is_rsvpd = user["id"] in (event.get("rsvps") or [])
    if is_rsvpd:
        asyncio.ensure_future(notify(
            user_id=user["id"],
            email=user.get("email"),
            phone=None,
            title=f"You're confirmed for {event.get('title')}",
            message=f"You've RSVP'd to '{event.get('title')}' on {event.get('starts_at','')} at {event.get('location','')}. We'll send a reminder before it starts.",
            kind="success",
            link=f"/v/causes/{event.get('cause_id')}",
        ))
    return event
