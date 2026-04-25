from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from app.utils.dependencies import get_current_user
from app.core.firebase import db
from app.services.notification_service import (
    list_user_notifications, mark_read, mark_all_read,
)

router = APIRouter()


class NotifPrefs(BaseModel):
    email: Optional[bool] = None
    sms: Optional[bool] = None
    in_app: Optional[bool] = None


DEFAULT_PREFS = {"email": True, "sms": True, "in_app": True}


@router.get("/me")
def my_notifications(user=Depends(get_current_user)):
    return list_user_notifications(user["id"])


@router.get("/me/unread-count")
def my_unread_count(user=Depends(get_current_user)):
    items = list_user_notifications(user["id"])
    return {"count": sum(1 for n in items if not n.get("read"))}


@router.post("/{notif_id}/read")
def read(notif_id: str, user=Depends(get_current_user)):
    return mark_read(user["id"], notif_id)


@router.post("/read-all")
def read_all(user=Depends(get_current_user)):
    return mark_all_read(user["id"])


@router.get("/preferences")
def get_prefs(user=Depends(get_current_user)):
    snap = db.collection("users").document(user["id"]).get()
    data = (snap.to_dict() or {}) if snap.exists else {}
    prefs = {**DEFAULT_PREFS, **(data.get("notif_prefs") or {})}
    return prefs


@router.put("/preferences")
def update_prefs(payload: NotifPrefs, user=Depends(get_current_user)):
    ref = db.collection("users").document(user["id"])
    snap = ref.get()
    current = (snap.to_dict() or {}).get("notif_prefs") or {}
    merged = {**DEFAULT_PREFS, **current}
    for k, v in payload.model_dump(exclude_none=True).items():
        merged[k] = v
    ref.update({"notif_prefs": merged})
    return merged
