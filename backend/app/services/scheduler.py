"""Background scheduler — runs periodic jobs in the FastAPI event loop.

Currently dispatches event-reminder notifications:
- 24-hour window: nudge every RSVP'd volunteer (and the host NGO) the day before.
- 1-hour window: final reminder shortly before the event starts.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta

from app.core.firebase import db
from app.services.user_service import get_user
from app.services.ngo_service import get_ngo_by_id
from app.services.cause_service import get_cause
from app.services.notification_service import notify

logger = logging.getLogger("scheduler")

REMINDER_WINDOWS = [
    # (label, lead-time, +/- tolerance, sentinel field on event doc)
    ("24h", timedelta(hours=24), timedelta(minutes=20), "reminder_24h_sent"),
    ("1h",  timedelta(hours=1),  timedelta(minutes=15), "reminder_1h_sent"),
]

# How often the loop wakes up (seconds). Each sweep handles all pending reminders.
TICK_SECONDS = 600  # 10 minutes


def _parse_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        # Handle trailing Z
        s = value.replace("Z", "+00:00") if isinstance(value, str) else value
        dt = datetime.fromisoformat(s)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


async def _send_reminders_for(event: dict, label: str, sentinel: str):
    """Fan out reminders for a single event."""
    cause = get_cause(event.get("cause_id")) or {}
    ngo = get_ngo_by_id(event.get("ngo_id")) or {}
    cause_title = cause.get("title") or "your cause"
    ev_title = event.get("title") or "Upcoming event"
    when = event.get("starts_at") or "soon"
    where = event.get("location") or ""

    coros = []
    rsvps = event.get("rsvps") or []
    pretty_when = "in 24 hours" if label == "24h" else "in 1 hour"
    for uid in rsvps:
        u = get_user(uid) or {}
        coros.append(notify(
            user_id=uid,
            email=u.get("email"),
            phone=None,
            title=f"Reminder: {ev_title} starts {pretty_when}",
            message=f"Don't forget — '{ev_title}' for {cause_title} starts at {when}{(' · ' + where) if where else ''}.",
            kind="info",
            link=f"/v/causes/{event.get('cause_id')}",
        ))

    # Heads up to NGO owner too (only on 24h reminder)
    if label == "24h" and ngo.get("user_id"):
        owner = get_user(ngo["user_id"]) or {}
        coros.append(notify(
            user_id=owner.get("id"),
            email=owner.get("email") or ngo.get("contact_email"),
            phone=ngo.get("contact_phone"),
            title=f"Tomorrow: {ev_title}",
            message=f"Your event '{ev_title}' is scheduled for {when}. {len(rsvps)} volunteer(s) confirmed.",
            kind="info",
            link=f"/ngo/causes/{event.get('cause_id')}",
        ))

    if coros:
        await asyncio.gather(*coros, return_exceptions=True)

    # Mark sentinel so we don't double-send
    db.collection("events").document(event["id"]).update({sentinel: True})
    logger.info("reminders[%s] sent for event=%s recipients=%s", label, event.get("id"), len(rsvps))


async def _sweep_once():
    """Find events whose start time is inside any reminder window and send."""
    now = datetime.now(timezone.utc)
    docs = list(db.collection("events").stream())
    for d in docs:
        data = d.to_dict() or {}
        data["id"] = d.id
        starts_at = _parse_dt(data.get("starts_at"))
        if not starts_at:
            continue
        if starts_at < now:
            continue  # already started
        for label, lead, tol, sentinel in REMINDER_WINDOWS:
            if data.get(sentinel):
                continue
            target = starts_at - lead
            if abs((target - now).total_seconds()) <= tol.total_seconds() or (now >= target and not data.get(sentinel) and (now - target) <= tol):
                try:
                    await _send_reminders_for(data, label, sentinel)
                except Exception as exc:
                    logger.warning("reminder send failed event=%s err=%s", data.get("id"), exc)


_task: asyncio.Task | None = None
_stopping = False


async def _loop():
    global _stopping
    logger.info("scheduler loop started; tick=%ss", TICK_SECONDS)
    while not _stopping:
        try:
            await _sweep_once()
        except Exception as exc:
            logger.exception("sweep failed: %s", exc)
        try:
            await asyncio.sleep(TICK_SECONDS)
        except asyncio.CancelledError:
            break
    logger.info("scheduler loop stopped")


def start():
    global _task, _stopping
    if _task and not _task.done():
        return
    _stopping = False
    loop = asyncio.get_event_loop()
    _task = loop.create_task(_loop())


async def stop():
    global _stopping, _task
    _stopping = True
    if _task:
        _task.cancel()
        try:
            await _task
        except Exception:
            pass


# Manual trigger (useful for tests/admin tools)
async def run_once_now() -> dict:
    await _sweep_once()
    return {"ok": True, "ran_at": datetime.now(timezone.utc).isoformat()}
