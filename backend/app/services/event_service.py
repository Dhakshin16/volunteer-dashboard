"""Event service."""
from app.core.firebase import db
from app.utils.firestore_utils import now_iso, serialize_doc, new_id
from fastapi import HTTPException


def create_event(ngo_id: str, payload: dict) -> dict:
    eid = new_id()
    data = {**payload, "ngo_id": ngo_id, "rsvps": [], "created_at": now_iso()}
    db.collection("events").document(eid).set(data)
    data["id"] = eid
    return data


def list_events_by_cause(cause_id: str) -> list:
    out = [serialize_doc(d) for d in db.collection("events").where("cause_id", "==", cause_id).stream()]
    out.sort(key=lambda x: x.get("starts_at") or "", reverse=False)
    return out


def list_events_by_ngo(ngo_id: str) -> list:
    out = [serialize_doc(d) for d in db.collection("events").where("ngo_id", "==", ngo_id).stream()]
    out.sort(key=lambda x: x.get("starts_at") or "", reverse=False)
    return out


def list_upcoming_events(limit: int = 50) -> list:
    out = [serialize_doc(d) for d in db.collection("events").limit(limit).stream()]
    now = now_iso()
    out = [e for e in out if (e.get("ends_at") or "") >= now]
    out.sort(key=lambda x: x.get("starts_at") or "", reverse=False)
    return out


def rsvp_event(user_id: str, event_id: str) -> dict:
    ref = db.collection("events").document(event_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(404, "Event not found")
    e = serialize_doc(snap)
    rsvps = list(e.get("rsvps") or [])
    if user_id in rsvps:
        rsvps.remove(user_id)
    else:
        if e.get("max_attendees") and len(rsvps) >= e["max_attendees"]:
            raise HTTPException(400, "Event full")
        rsvps.append(user_id)
    ref.update({"rsvps": rsvps})
    return serialize_doc(ref.get())
