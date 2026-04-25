"""NGO profile service."""
from app.core.firebase import db
from app.utils.firestore_utils import now_iso, serialize_doc, new_id
from app.services.user_service import get_user


def get_ngo_profile(user_id: str) -> dict:
    docs = db.collection("ngo_profiles").where("user_id", "==", user_id).limit(1).stream()
    for d in docs:
        return serialize_doc(d)
    return None


def get_ngo_by_id(ngo_id: str) -> dict:
    return serialize_doc(db.collection("ngo_profiles").document(ngo_id).get())


def upsert_ngo_profile(user_id: str, payload: dict) -> dict:
    existing = get_ngo_profile(user_id)
    if existing:
        ref = db.collection("ngo_profiles").document(existing["id"])
        # Re-submission: clear rejection state so admin sees it as pending again
        update = {**payload, "is_approved": False, "rejection_reason": None}
        ref.update(update)
        return serialize_doc(ref.get())
    nid = new_id()
    data = {
        **payload,
        "user_id": user_id,
        "is_approved": False,
        "rejection_reason": None,
        "causes_count": 0,
        "volunteers_count": 0,
        "created_at": now_iso(),
    }
    db.collection("ngo_profiles").document(nid).set(data)
    data["id"] = nid
    return data


def list_ngos(approved_only: bool = False) -> list:
    q = db.collection("ngo_profiles")
    if approved_only:
        q = q.where("is_approved", "==", True)
    return [serialize_doc(d) for d in q.stream()]


def list_pending_ngos() -> list:
    return [serialize_doc(d) for d in db.collection("ngo_profiles").where("is_approved", "==", False).stream()]


def set_ngo_approval(ngo_id: str, approve: bool, reason: str = None) -> dict:
    ref = db.collection("ngo_profiles").document(ngo_id)
    ref.update({"is_approved": approve, "rejection_reason": None if approve else reason})
    return serialize_doc(ref.get())


def get_ngo_owner(ngo_id: str) -> dict:
    """Return the user record that owns this NGO profile (for notifications)."""
    n = get_ngo_by_id(ngo_id)
    if not n or not n.get("user_id"):
        return None
    return get_user(n["user_id"])
