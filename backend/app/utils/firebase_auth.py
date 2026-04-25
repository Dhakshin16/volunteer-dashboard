import os
from firebase_admin import auth
from fastapi import HTTPException
from app.core import firebase  # noqa: F401  ensures init

ENABLE_TEST_AUTH = os.getenv("ENABLE_TEST_AUTH", "false").lower() == "true"


def verify_firebase_token(token: str):
    """Verify a Firebase ID token. When ENABLE_TEST_AUTH=true, also accept
    tokens of the form `test::<uid>::<email>::<name>` for automated tests
    that don't have a Firebase Web SDK API key.
    """
    if ENABLE_TEST_AUTH and token.startswith("test::"):
        parts = token.split("::")
        # test::uid::email::name
        if len(parts) >= 3:
            uid = parts[1]
            email = parts[2] if len(parts) > 2 else f"{uid}@test.local"
            name = parts[3] if len(parts) > 3 else email.split("@")[0]
            return {"uid": uid, "email": email, "name": name, "picture": None}

    try:
        return auth.verify_id_token(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
