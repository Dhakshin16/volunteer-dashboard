"""Volunteer profile service."""
from app.core.firebase import db
from app.utils.firestore_utils import now_iso, serialize_doc, new_id


def get_volunteer_profile(user_id: str) -> dict:
    docs = db.collection("volunteer_profiles").where("user_id", "==", user_id).limit(1).stream()
    for d in docs:
        return serialize_doc(d)
    return None


def upsert_volunteer_profile(user_id: str, payload: dict) -> dict:
    existing = get_volunteer_profile(user_id)
    if existing:
        ref = db.collection("volunteer_profiles").document(existing["id"])
        ref.update({**payload})
        return serialize_doc(ref.get())
    pid = new_id()
    data = {
        **payload,
        "user_id": user_id,
        "impact_points": 0,
        "badges": [],
        "hours_logged": 0,
        "causes_supported": 0,
        "created_at": now_iso(),
    }
    db.collection("volunteer_profiles").document(pid).set(data)
    data["id"] = pid
    return data


def list_volunteers() -> list:
    return [serialize_doc(d) for d in db.collection("volunteer_profiles").stream()]


def add_impact(user_id: str, points: int = 0, hours: int = 0):
    p = get_volunteer_profile(user_id)
    if not p:
        return
    new_points = (p.get("impact_points") or 0) + points
    new_hours = (p.get("hours_logged") or 0) + hours
    badges = list(p.get("badges") or [])
    # Award badges by thresholds
    if new_points >= 100 and "Rising Star" not in badges:
        badges.append("Rising Star")
    if new_points >= 500 and "Impact Maker" not in badges:
        badges.append("Impact Maker")
    if new_points >= 1000 and "Community Hero" not in badges:
        badges.append("Community Hero")
    if new_hours >= 50 and "Time Giver" not in badges:
        badges.append("Time Giver")
    db.collection("volunteer_profiles").document(p["id"]).update({
        "impact_points": new_points,
        "hours_logged": new_hours,
        "badges": badges,
    })
