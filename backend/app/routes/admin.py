from fastapi import APIRouter, Depends, HTTPException, Request
from app.utils.dependencies import require_admin
from app.services.ngo_service import (
    list_pending_ngos, list_ngos, set_ngo_approval, get_ngo_by_id, get_ngo_owner,
)
from app.services.report_service import list_crisis_reports, list_all_reports
from app.services.analytics_service import admin_overview
from app.services.cause_service import list_causes
from app.services.notification_service import (
    notify, org_approval_email_html, org_rejection_email_html, APP_PUBLIC_URL,
)
from app.schemas.models import AdminApproval

import os
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


def _public_url(request: Request) -> str:
    if APP_PUBLIC_URL:
        return APP_PUBLIC_URL
    # Fall back to the request origin (frontend will go through ingress; this
    # works because `Request` carries the host header forwarded by the proxy).
    base = str(request.base_url).rstrip("/")
    return base


@router.get("/overview")
def overview(_=Depends(require_admin)):
    return admin_overview()


@router.get("/ngos")
def ngos(approved_only: bool = False, _=Depends(require_admin)):
    return list_ngos(approved_only=approved_only)


@router.get("/ngos/pending")
def pending(_=Depends(require_admin)):
    return list_pending_ngos()


@router.post("/ngos/{ngo_id}/approve")
async def approve(ngo_id: str, payload: AdminApproval, request: Request, _=Depends(require_admin)):
    ngo = get_ngo_by_id(ngo_id)
    if not ngo:
        raise HTTPException(404, "Organisation not found")

    updated = set_ngo_approval(ngo_id, payload.approve, payload.reason)
    owner = get_ngo_owner(ngo_id) or {}

    org_name = ngo.get("org_name") or "your organisation"
    contact_email = ngo.get("contact_email") or owner.get("email")
    contact_phone = ngo.get("contact_phone")
    base = _public_url(request)

    if payload.approve:
        title = f"{org_name} has been approved"
        message = f"Your organisation {org_name} has been approved on VolunCore. You can now post causes, host events and recruit volunteers."
        cta_url = f"{base}/ngo" if base else None
        html = org_approval_email_html(org_name, cta_url or "#")
        sms_body = f"VolunCore: Great news! {org_name} has been approved. Sign in to start posting causes."
        kind = "success"
    else:
        reason = payload.reason or "No reason provided."
        title = f"{org_name} application needs revision"
        message = f"Your application for {org_name} was not approved. Reason: {reason}. Please update your details and resubmit."
        cta_url = f"{base}/ngo/register" if base else None
        html = org_rejection_email_html(org_name, reason, cta_url or "#")
        sms_body = f"VolunCore: {org_name} application not approved. Reason: {reason}. Sign in to update and resubmit."
        kind = "warning"

    # Use direct email send so we keep the rich HTML template, plus in-app + SMS via notify()
    from app.services.notification_service import send_email, create_in_app, send_sms
    import asyncio

    if owner.get("id"):
        try:
            create_in_app(owner["id"], title, message, kind=kind, link="/ngo" if payload.approve else "/ngo/register")
        except Exception as exc:
            logger.warning("in_app create failed: %s", exc)

    tasks = []
    if contact_email:
        tasks.append(send_email(contact_email, title, html))
    if contact_phone:
        tasks.append(send_sms(contact_phone, sms_body))
    delivery = []
    if tasks:
        delivery = await asyncio.gather(*tasks, return_exceptions=True)

    return {
        **updated,
        "notifications": {
            "email": bool(contact_email),
            "sms": bool(contact_phone),
            "results": [str(r) for r in delivery],
        },
    }


@router.get("/reports/crisis")
def crisis(_=Depends(require_admin)):
    return list_crisis_reports()


@router.get("/reports")
def all_reports(_=Depends(require_admin)):
    return list_all_reports(limit=200)


@router.get("/causes")
def admin_causes(_=Depends(require_admin)):
    return list_causes(limit=500)


@router.post("/scheduler/run-now")
async def run_scheduler_now(_=Depends(require_admin)):
    """Manually trigger a reminder sweep — useful for testing."""
    from app.services import scheduler
    return await scheduler.run_once_now()
