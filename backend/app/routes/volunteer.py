from fastapi import APIRouter, Depends, HTTPException
from app.utils.dependencies import get_current_user
from app.services.volunteer_service import (
    upsert_volunteer_profile, get_volunteer_profile,
)
from app.services.analytics_service import volunteer_stats, leaderboard
from app.services.ai_service import extract_skills, generate_impact_report, match_volunteer_to_causes
from app.services.cause_service import list_causes, get_cause
from app.services.engagement_service import (
    compute_streak, add_bookmark, remove_bookmark, list_bookmarks, list_bookmarked_ids,
)
from app.schemas.models import VolunteerProfileIn

router = APIRouter()


@router.get("/me")
def my_profile(user=Depends(get_current_user)):
    return get_volunteer_profile(user["id"])


@router.post("/me")
def upsert_profile(payload: VolunteerProfileIn, user=Depends(get_current_user)):
    if user.get("role") not in ("volunteer", None):
        raise HTTPException(403, "Only volunteers can edit volunteer profile")
    return upsert_volunteer_profile(user["id"], payload.model_dump())


@router.get("/stats")
def stats(days: int = 7, user=Depends(get_current_user)):
    return volunteer_stats(user["id"], days)


@router.get("/streak")
def my_streak(user=Depends(get_current_user)):
    return compute_streak(user["id"])


@router.get("/leaderboard")
def get_leaderboard():
    return leaderboard(limit=10)


@router.post("/extract-skills")
async def post_extract_skills(payload: dict, user=Depends(get_current_user)):
    bio = payload.get("bio", "")
    return {"skills": await extract_skills(bio)}


@router.get("/matches")
async def get_matches(user=Depends(get_current_user)):
    profile = get_volunteer_profile(user["id"])
    if not profile:
        return []
    causes = list_causes(status="open", limit=30)
    if not causes:
        return []
    scored = await match_volunteer_to_causes(profile, causes)
    by_id = {c["id"]: c for c in causes}
    out = []
    for s in scored[:10]:
        c = by_id.get(s["cause_id"])
        if c:
            out.append({**s, "cause": c})
    return out


@router.get("/impact-report")
async def impact_report(period: str = "week", user=Depends(get_current_user)):
    profile = get_volunteer_profile(user["id"])
    stats = volunteer_stats(user["id"], days=7 if period == "week" else 30)
    name = profile.get("full_name") if profile else user.get("name", "You")
    rep = await generate_impact_report(period, stats, name)
    return {
        "period": period,
        "metrics": stats,
        **rep,
    }


# ---------- Bookmarks ----------
@router.get("/bookmarks")
def my_bookmarks(user=Depends(get_current_user)):
    return list_bookmarks(user["id"])


@router.get("/bookmarks/ids")
def my_bookmark_ids(user=Depends(get_current_user)):
    return {"ids": list_bookmarked_ids(user["id"])}


@router.post("/bookmarks/{cause_id}")
def post_bookmark(cause_id: str, user=Depends(get_current_user)):
    res = add_bookmark(user["id"], cause_id)
    if not res.get("ok"):
        raise HTTPException(404, "Cause not found")
    return res


@router.delete("/bookmarks/{cause_id}")
def delete_bookmark(cause_id: str, user=Depends(get_current_user)):
    return remove_bookmark(user["id"], cause_id)
