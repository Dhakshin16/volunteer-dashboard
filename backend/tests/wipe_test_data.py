"""One-shot cleanup: wipe ALL test data from Firestore, retaining only
users whose role == "admin" (or whose email is in ADMIN_EMAILS).

Run from /app/backend as:  python tests/wipe_test_data.py
"""
import sys
sys.path.insert(0, "/app/backend")

from app.core.firebase import db
from app.core.config import ADMIN_EMAILS

# Collections to nuke entirely
NUKE_COLLECTIONS = [
    "ngo_profiles",
    "volunteer_profiles",
    "causes",
    "enrollments",
    "donations",
    "field_reports",
    "events",
    "hour_logs",
    "notifications",
    "bookmarks",
    "status_checks",
]

# 'users' is special — only delete non-admin users.
USERS_COLLECTION = "users"
# Subcollections under chat sessions
CHAT_COLLECTION = "chat_sessions"


def _delete_collection(name: str, batch_size: int = 200) -> int:
    """Delete every doc in a collection. Returns number deleted."""
    total = 0
    while True:
        docs = list(db.collection(name).limit(batch_size).stream())
        if not docs:
            break
        for d in docs:
            d.reference.delete()
            total += 1
        if len(docs) < batch_size:
            break
    return total


def _delete_chat_sessions() -> int:
    total = 0
    sessions = list(db.collection(CHAT_COLLECTION).stream())
    for s in sessions:
        # delete messages subcollection if present
        msgs = list(s.reference.collection("messages").limit(500).stream())
        for m in msgs:
            m.reference.delete()
            total += 1
        s.reference.delete()
        total += 1
    return total


def _wipe_users() -> tuple:
    kept = 0
    deleted = 0
    admin_set = set(e.lower() for e in ADMIN_EMAILS)
    for d in db.collection(USERS_COLLECTION).stream():
        data = d.to_dict() or {}
        email = (data.get("email") or "").lower()
        role = data.get("role")
        if role == "admin" or (email and email in admin_set):
            kept += 1
            continue
        d.reference.delete()
        deleted += 1
    return kept, deleted


def main():
    print("\n=== Wiping test data ===")
    print(f"Admin emails preserved: {ADMIN_EMAILS}")

    summary = {}
    for col in NUKE_COLLECTIONS:
        n = _delete_collection(col)
        summary[col] = n
        print(f"  {col:22s} → deleted {n}")

    chat_n = _delete_chat_sessions()
    summary[CHAT_COLLECTION] = chat_n
    print(f"  {CHAT_COLLECTION:22s} → deleted {chat_n}")

    kept, deleted = _wipe_users()
    summary["users (deleted)"] = deleted
    summary["users (kept admin)"] = kept
    print(f"  users (deleted)        → {deleted}")
    print(f"  users (kept admin)     → {kept}")

    print("\nSummary:")
    for k, v in summary.items():
        print(f"  {k}: {v}")

    print("\nDone.")


if __name__ == "__main__":
    main()
