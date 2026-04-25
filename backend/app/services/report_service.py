"""Field-report service."""
from app.core.firebase import db
from app.utils.firestore_utils import now_iso, serialize_doc, new_id
from app.services.ai_service import analyze_field_report
from app.services.volunteer_service import add_impact


async def create_report(user_id: str, payload: dict) -> dict:
    analysis = await analyze_field_report(payload.get("text", ""), payload.get("image_base64"))
    rid = new_id()
    data = {
        "cause_id": payload.get("cause_id"),
        "user_id": user_id,
        "text": payload.get("text", ""),
        "image_base64": payload.get("image_base64"),  # store small inline; in prod use storage
        "voice_transcript": payload.get("voice_transcript"),
        "location_lat": payload.get("location_lat"),
        "location_lng": payload.get("location_lng"),
        "ai_analysis": analysis,
        "is_crisis": bool(analysis.get("is_crisis")),
        "created_at": now_iso(),
    }
    db.collection("field_reports").document(rid).set(data)
    add_impact(user_id, points=15)
    out = dict(data); out["id"] = rid
    out.pop("image_base64", None)
    return out


def list_reports_by_user(user_id: str) -> list:
    out = []
    for d in db.collection("field_reports").where("user_id", "==", user_id).stream():
        x = serialize_doc(d); x.pop("image_base64", None); out.append(x)
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return out


def list_reports_by_cause(cause_id: str) -> list:
    out = []
    for d in db.collection("field_reports").where("cause_id", "==", cause_id).stream():
        x = serialize_doc(d); x.pop("image_base64", None); out.append(x)
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return out


def list_crisis_reports(limit: int = 50) -> list:
    out = []
    for d in db.collection("field_reports").where("is_crisis", "==", True).limit(limit).stream():
        x = serialize_doc(d); x.pop("image_base64", None); out.append(x)
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return out


def list_all_reports(limit: int = 100) -> list:
    out = []
    for d in db.collection("field_reports").limit(limit).stream():
        x = serialize_doc(d); x.pop("image_base64", None); out.append(x)
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return out
