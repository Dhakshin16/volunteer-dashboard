"""Analytics: aggregate stats for dashboards."""
from app.core.firebase import db
from app.utils.firestore_utils import serialize_doc
from datetime import datetime, timezone, timedelta


def _stream_all(name: str, limit: int = 500):
    return [serialize_doc(d) for d in db.collection(name).limit(limit).stream()]


def admin_overview() -> dict:
    users = _stream_all("users")
    ngos = _stream_all("ngo_profiles")
    causes = _stream_all("causes")
    enrollments = _stream_all("enrollments")
    donations = _stream_all("donations")
    reports = _stream_all("field_reports")

    money = sum(d.get("amount", 0) or 0 for d in donations if d.get("type") == "money")
    in_kind = sum(1 for d in donations if d.get("type") == "in-kind")
    crisis = sum(1 for r in reports if r.get("is_crisis"))
    open_causes = sum(1 for c in causes if c.get("status") == "open")
    pending_ngos = sum(1 for n in ngos if not n.get("is_approved"))
    return {
        "users": len(users),
        "volunteers": sum(1 for u in users if u.get("role") == "volunteer"),
        "ngos_total": len(ngos),
        "ngos_approved": sum(1 for n in ngos if n.get("is_approved")),
        "ngos_pending": pending_ngos,
        "causes_total": len(causes),
        "causes_open": open_causes,
        "enrollments": len(enrollments),
        "donations_money_total": money,
        "donations_in_kind_count": in_kind,
        "reports_total": len(reports),
        "crisis_count": crisis,
        "category_breakdown": _category_breakdown(causes),
        "recent_crisis": _recent_crisis(reports),
    }


def _category_breakdown(causes: list) -> list:
    counts = {}
    for c in causes:
        cat = c.get("category", "other")
        counts[cat] = counts.get(cat, 0) + 1
    return [{"category": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]


def _recent_crisis(reports: list, limit: int = 5) -> list:
    crisis = [r for r in reports if r.get("is_crisis")]
    crisis.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    out = []
    for r in crisis[:limit]:
        rr = dict(r)
        rr.pop("image_base64", None)
        out.append(rr)
    return out


def leaderboard(limit: int = 10) -> list:
    profiles = _stream_all("volunteer_profiles")
    profiles.sort(key=lambda p: (p.get("impact_points") or 0), reverse=True)
    return profiles[:limit]


def volunteer_stats(user_id: str, days: int = 7) -> dict:
    enrollments = [serialize_doc(d) for d in db.collection("enrollments").where("user_id", "==", user_id).stream()]
    donations = [serialize_doc(d) for d in db.collection("donations").where("user_id", "==", user_id).stream()]
    reports = [serialize_doc(d) for d in db.collection("field_reports").where("user_id", "==", user_id).stream()]
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    recent_enroll = [e for e in enrollments if (e.get("created_at") or "") >= cutoff]
    recent_reports = [r for r in reports if (r.get("created_at") or "") >= cutoff]
    hours = sum((e.get("hours_logged") or 0) for e in enrollments)
    return {
        "causes": len(enrollments),
        "recent_causes": len(recent_enroll),
        "hours": hours,
        "reports": len(reports),
        "recent_reports": len(recent_reports),
        "donations": len(donations),
    }


def ngo_stats(ngo_id: str) -> dict:
    causes = [serialize_doc(d) for d in db.collection("causes").where("ngo_id", "==", ngo_id).stream()]
    cause_ids = [c["id"] for c in causes]
    enrollments = []
    donations = []
    reports = []
    for cid in cause_ids:
        enrollments += [serialize_doc(d) for d in db.collection("enrollments").where("cause_id", "==", cid).stream()]
        donations += [serialize_doc(d) for d in db.collection("donations").where("cause_id", "==", cid).stream()]
        reports += [serialize_doc(d) for d in db.collection("field_reports").where("cause_id", "==", cid).stream()]
    money = sum(d.get("amount", 0) or 0 for d in donations if d.get("type") == "money")
    return {
        "causes_total": len(causes),
        "causes_open": sum(1 for c in causes if c.get("status") == "open"),
        "volunteers": len(set(e["user_id"] for e in enrollments)),
        "hours": sum((e.get("hours_logged") or 0) for e in enrollments),
        "donations_money": money,
        "donations_count": len(donations),
        "reports": len(reports),
    }
