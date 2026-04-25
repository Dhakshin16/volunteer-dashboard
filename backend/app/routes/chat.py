from fastapi import APIRouter, Depends
from app.utils.dependencies import get_current_user
from app.services.ai_service import chat_with_auri
from app.services.volunteer_service import get_volunteer_profile
from app.services.analytics_service import volunteer_stats
from app.schemas.models import ChatIn, ChatOut
import uuid

router = APIRouter()


def _build_context(user: dict) -> str:
    role = user.get("role") or "new user"
    parts = [f"User: {user.get('name','?')} ({role})."]
    if role == "volunteer":
        v = get_volunteer_profile(user["id"])
        if v:
            parts.append(f"Skills: {', '.join(v.get('skills', []) or [])}.")
            parts.append(f"City: {v.get('city')}, country: {v.get('country')}.")
            parts.append(f"Impact points: {v.get('impact_points', 0)}, hours: {v.get('hours_logged', 0)}.")
        s = volunteer_stats(user["id"], days=7)
        parts.append(f"This week: {s.get('hours',0)}h logged, {s.get('reports',0)} reports.")
    return " ".join(parts)


@router.post("/", response_model=ChatOut)
async def post_chat(payload: ChatIn, user=Depends(get_current_user)):
    sid = payload.session_id or f"chat-{user['id']}-{uuid.uuid4().hex[:8]}"
    ctx = _build_context(user)
    reply = await chat_with_auri(sid, payload.message, payload.image_base64, ctx)
    return {"reply": reply, "session_id": sid}
