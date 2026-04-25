"""Donation service."""
from app.core.firebase import db
from app.utils.firestore_utils import now_iso, serialize_doc, new_id
from app.services.cause_service import get_cause
from app.services.user_service import get_user
from app.services.volunteer_service import add_impact


def create_donation(user_id: str, payload: dict) -> dict:
    cause = get_cause(payload["cause_id"])
    if not cause:
        raise ValueError("Cause not found")
    user = get_user(user_id)
    did = new_id()
    data = {
        **payload,
        "user_id": user_id,
        "user_name": user.get("name") if user else None,
        "created_at": now_iso(),
    }
    db.collection("donations").document(did).set(data)
    # update cause resources_received
    received = list(cause.get("resources_received") or [])
    if payload.get("type") == "in-kind":
        received.append({"item": payload.get("item"), "quantity": payload.get("quantity"), "unit": payload.get("unit"), "donor_name": user.get("name") if user else "Anon"})
    else:
        received.append({"amount": payload.get("amount"), "currency": payload.get("currency"), "donor_name": user.get("name") if user else "Anon"})
    db.collection("causes").document(payload["cause_id"]).update({"resources_received": received})
    # award points
    pts = int((payload.get("amount") or 0) / 10) if payload.get("type") == "money" else 30
    add_impact(user_id, points=max(10, min(pts, 200)))
    data["id"] = did
    return data


def list_donations_by_user(user_id: str) -> list:
    out = [serialize_doc(d) for d in db.collection("donations").where("user_id", "==", user_id).stream()]
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return out


def list_donations_by_cause(cause_id: str) -> list:
    out = [serialize_doc(d) for d in db.collection("donations").where("cause_id", "==", cause_id).stream()]
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return out
