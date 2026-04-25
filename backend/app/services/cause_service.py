"""Cause CRUD + listing."""
from app.core.firebase import db
from app.utils.firestore_utils import now_iso, serialize_doc, new_id
from app.services.ngo_service import get_ngo_by_id


def create_cause(ngo_id: str, payload: dict) -> dict:
    ngo = get_ngo_by_id(ngo_id)
    cid = new_id()
    data = {
        **payload,
        "ngo_id": ngo_id,
        "ngo_name": ngo.get("org_name") if ngo else None,
        "status": "open",
        "volunteers_joined": 0,
        "resources_received": [],
        "created_at": now_iso(),
    }
    db.collection("causes").document(cid).set(data)
    # increment ngo causes count
    if ngo:
        db.collection("ngo_profiles").document(ngo_id).update({"causes_count": (ngo.get("causes_count") or 0) + 1})
    data["id"] = cid
    return data


def update_cause(cause_id: str, patch: dict) -> dict:
    ref = db.collection("causes").document(cause_id)
    ref.update(patch)
    return serialize_doc(ref.get())


def get_cause(cause_id: str) -> dict:
    return serialize_doc(db.collection("causes").document(cause_id).get())


def list_causes(status: str = None, ngo_id: str = None, category: str = None, limit: int = 100) -> list:
    q = db.collection("causes")
    if status:
        q = q.where("status", "==", status)
    if ngo_id:
        q = q.where("ngo_id", "==", ngo_id)
    if category:
        q = q.where("category", "==", category)
    items = [serialize_doc(d) for d in q.limit(limit).stream()]
    # sort by created_at desc in python
    items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return items


def delete_cause(cause_id: str):
    db.collection("causes").document(cause_id).delete()
