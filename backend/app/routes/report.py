from fastapi import APIRouter, Depends
from app.utils.dependencies import get_current_user
from app.services.report_service import (
    create_report, list_reports_by_user, list_crisis_reports, list_all_reports,
)
from app.services.ai_service import polish_voice
from app.schemas.models import FieldReportIn

router = APIRouter()


@router.post("/")
async def post_report(payload: FieldReportIn, user=Depends(get_current_user)):
    return await create_report(user["id"], payload.model_dump())


@router.get("/me")
def my_reports(user=Depends(get_current_user)):
    return list_reports_by_user(user["id"])


@router.get("/crisis")
def crisis(user=Depends(get_current_user)):
    return list_crisis_reports()


@router.get("/all")
def all_reports(user=Depends(get_current_user)):
    return list_all_reports(limit=100)


@router.post("/polish-voice")
async def post_polish(payload: dict, user=Depends(get_current_user)):
    return {"polished": await polish_voice(payload.get("transcript", ""))}
