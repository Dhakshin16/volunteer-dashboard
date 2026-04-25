"""Firestore helpers — convert datetimes, dicts, etc."""
from datetime import datetime, timezone
from typing import Any
import uuid


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def serialize_doc(doc) -> dict:
    """Convert a Firestore DocumentSnapshot to a JSON-friendly dict."""
    if not doc.exists:
        return None
    data = doc.to_dict() or {}
    data["id"] = doc.id
    return _normalize(data)


def _normalize(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _normalize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_normalize(v) for v in value]
    # Firestore-specific types like GeoPoint, DocumentReference
    if hasattr(value, "latitude") and hasattr(value, "longitude"):
        return {"lat": value.latitude, "lng": value.longitude}
    return value
