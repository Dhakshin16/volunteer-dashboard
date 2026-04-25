"""Enrollment & hours service."""
from app.core.firebase import db
from app.utils.firestore_utils import now_iso, serialize_doc, new_id
from app.services.cause_service import get_cause
from app.services.volunteer_service import get_volunteer_profile, add_impact
from fastapi import HTTPException


def enroll(user_id: str, cause_id: str, motivation: str = None) -> dict:
    cause = get_cause(cause_id)
    if not cause:
        raise HTTPException(404, "Cause not found")
    v = get_volunteer_profile(user_id)
    if not v:
        raise HTTPException(400, "Complete volunteer profile first")
    # check duplicate
    existing = list(
        db.collection("enrollments")
        .where("user_id", "==", user_id)
        .where("cause_id", "==", cause_id)
        .stream()
    )
    if existing:
        return serialize_doc(existing[0])
    eid = new_id()
    data = {
        "cause_id": cause_id, "volunteer_id": v["id"], "user_id": user_id,
        "status": "active", "hours_logged": 0, "motivation": motivation,
        "created_at": now_iso(),
    }
    db.collection("enrollments").document(eid).set(data)
    # bump cause volunteers_joined
    db.collection("causes").document(cause_id).update({
        "volunteers_joined": (cause.get("volunteers_joined") or 0) + 1
    })
    # bump volunteer causes_supported
    db.collection("volunteer_profiles").document(v["id"]).update({
        "causes_supported": (v.get("causes_supported") or 0) + 1
    })
    add_impact(user_id, points=20)
    data["id"] = eid
    return data


def list_my_enrollments(user_id: str) -> list:
    out = []
    for d in db.collection("enrollments").where("user_id", "==", user_id).stream():
        e = serialize_doc(d)
        c = get_cause(e["cause_id"])
        e["cause"] = c
        out.append(e)
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return out


def list_cause_enrollments(cause_id: str) -> list:
    from app.services.volunteer_service import get_volunteer_profile
    out = []
    for d in db.collection("enrollments").where("cause_id", "==", cause_id).stream():
        e = serialize_doc(d)
        v = serialize_doc(db.collection("volunteer_profiles").document(e["volunteer_id"]).get())
        e["volunteer"] = v
        out.append(e)
    return out


def log_hours(user_id: str, enrollment_id: str, hours: int, note: str = None) -> dict:
    ref = db.collection("enrollments").document(enrollment_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(404, "Enrollment not found")
    e = serialize_doc(snap)
    if e["user_id"] != user_id:
        raise HTTPException(403, "Not your enrollment")
    new_h = (e.get("hours_logged") or 0) + hours
    ref.update({"hours_logged": new_h})
    # log entry sub-collection
    db.collection("hour_logs").document(new_id()).set({
        "enrollment_id": enrollment_id, "user_id": user_id, "hours": hours,
        "note": note, "created_at": now_iso(),
    })
    add_impact(user_id, points=hours * 5, hours=hours)
    return serialize_doc(ref.get())


def withdraw(user_id: str, enrollment_id: str):
    ref = db.collection("enrollments").document(enrollment_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(404, "Enrollment not found")
    e = serialize_doc(snap)
    if e["user_id"] != user_id:
        raise HTTPException(403, "Not your enrollment")
    ref.update({"status": "withdrawn"})
    return {"ok": True}
