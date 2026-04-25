from fastapi import APIRouter, Depends
from app.utils.dependencies import get_current_user
from app.services.notification_service import (
    list_user_notifications, mark_read, mark_all_read,
)

router = APIRouter()


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
