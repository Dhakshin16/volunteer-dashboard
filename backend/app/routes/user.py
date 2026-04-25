from fastapi import APIRouter, Depends, HTTPException
from app.utils.dependencies import get_current_user
from app.services.user_service import set_role, get_user
from app.services.notification_service import notify
from app.schemas.models import RoleSelect, UserOut

router = APIRouter()


@router.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return user


@router.post("/role", response_model=UserOut)
async def set_user_role(payload: RoleSelect, user=Depends(get_current_user)):
    if payload.role not in ("volunteer", "ngo"):
        raise HTTPException(400, "Role must be 'volunteer' or 'ngo'")
    updated = set_role(user["id"], payload.role)
    # Welcome notification
    if payload.role == "volunteer":
        title = "Welcome to VolunCore"
        msg = "Your volunteer account is ready. Discover causes near you and start making impact."
    else:
        title = "Organisation account created"
        msg = "Complete your organisation profile to submit it for admin approval."
    await notify(
        user_id=updated.get("id"),
        email=updated.get("email"),
        phone=None,
        title=title,
        message=msg,
        kind="info",
        link="/v" if payload.role == "volunteer" else "/ngo/register",
    )
    return updated
