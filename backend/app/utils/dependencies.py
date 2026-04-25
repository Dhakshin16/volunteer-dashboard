from fastapi import Header, HTTPException, Depends
from app.utils.firebase_auth import verify_firebase_token
from app.services.user_service import get_or_create_user, is_admin_user


def get_current_firebase_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    return verify_firebase_token(parts[1])


def get_current_user(fb_user=Depends(get_current_firebase_user)):
    user = get_or_create_user(fb_user)
    return user


def require_role(*roles):
    def _checker(user=Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail=f"Requires role: {', '.join(roles)}")
        return user
    return _checker


def require_admin(user=Depends(get_current_user)):
    if not is_admin_user(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
