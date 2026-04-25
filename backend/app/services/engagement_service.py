"""Activity streak + cause bookmark services."""
from datetime import datetime, timezone, timedelta
from app.core.firebase import db
from app.utils.firestore_utils import now_iso, serialize_doc, new_id
from app.services.cause_service import get_cause


def _activity_dates(user_id: str) -> set:
    """Return the set of UTC date-strings (YYYY-MM-DD) on which the user did
    something countable: enrolled, donated, logged hours, or filed a report.
    """
    dates = set()
    cols = [
        ("enrollments", "created_at"),
        ("donations", "created_at"),
        ("field_reports", "created_at"),
        ("hour_logs", "created_at"),
    ]
    for col, field in cols:
        for d in db.collection(col).where("user_id", "==", user_id).stream():
            v = (d.to_dict() or {}).get(field)
            if isinstance(v, str) and len(v) >= 10:
                dates.add(v[:10])
    return dates


def compute_streak(user_id: str) -> dict:
    """Return current and longest consecutive-day streak based on activity."""
    dates = _activity_dates(user_id)
    if not dates:
        return {"current": 0, "longest": 0, "active_today": False, "active_dates": []}

    sorted_dates = sorted(dates)
    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)

    # Longest run
    longest = 1
    run = 1
    for i in range(1, len(sorted_dates)):
        prev = datetime.strptime(sorted_dates[i - 1], "%Y-%m-%d").date()
        curr = datetime.strptime(sorted_dates[i], "%Y-%m-%d").date()
        if (curr - prev).days == 1:
            run += 1
            longest = max(longest, run)
        elif curr != prev:
            run = 1

    # Current streak: walk back from today/yesterday
    current = 0
    cursor = today if today.isoformat() in dates else (yesterday if yesterday.isoformat() in dates else None)
    while cursor and cursor.isoformat() in dates:
        current += 1
        cursor = cursor - timedelta(days=1)

    return {
        "current": current,
        "longest": longest,
        "active_today": today.isoformat() in dates,
        "active_dates": sorted_dates[-30:],  # last 30 active dates for the heatmap
    }


# ---------- Bookmarks ----------
def _bookmark_id(user_id: str, cause_id: str) -> str:
    return f"{user_id}__{cause_id}"


def add_bookmark(user_id: str, cause_id: str) -> dict:
    if not get_cause(cause_id):
        return {"ok": False, "error": "cause_not_found"}
    bid = _bookmark_id(user_id, cause_id)
    db.collection("bookmarks").document(bid).set({
        "user_id": user_id,
        "cause_id": cause_id,
        "created_at": now_iso(),
    })
    return {"ok": True, "id": bid}


def remove_bookmark(user_id: str, cause_id: str) -> dict:
    db.collection("bookmarks").document(_bookmark_id(user_id, cause_id)).delete()
    return {"ok": True}


def list_bookmarks(user_id: str) -> list:
    out = []
    for d in db.collection("bookmarks").where("user_id", "==", user_id).stream():
        b = serialize_doc(d)
        c = get_cause(b["cause_id"])
        if c:
            b["cause"] = c
            out.append(b)
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return out


def list_bookmarked_ids(user_id: str) -> list:
    return [
        (d.to_dict() or {}).get("cause_id")
        for d in db.collection("bookmarks").where("user_id", "==", user_id).stream()
        if (d.to_dict() or {}).get("cause_id")
    ]
