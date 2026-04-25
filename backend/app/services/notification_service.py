"""Notification service — email (Resend), SMS (Twilio), and in-app notifications.

All sends are best-effort: missing credentials log a warning and return a no-op
result so that the calling business logic is never blocked by notification
failures.
"""
from __future__ import annotations

import os
import asyncio
import logging
from typing import Optional, Iterable

import resend
from twilio.rest import Client as TwilioClient

from app.core.firebase import db
from app.utils.firestore_utils import now_iso, serialize_doc, new_id

logger = logging.getLogger("notifications")

# ---------- Configuration ----------
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "onboarding@resend.dev").strip()
SENDER_NAME = os.getenv("SENDER_NAME", "VolunCore").strip()
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "").strip()
APP_PUBLIC_URL = os.getenv("APP_PUBLIC_URL", "").rstrip("/")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

_twilio_client: Optional[TwilioClient] = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        _twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Twilio init failed: %s", exc)


# ---------- Email ----------
def _wrap_html(title: str, body_html: str, cta_label: Optional[str] = None, cta_url: Optional[str] = None) -> str:
    cta_block = ""
    if cta_label and cta_url:
        cta_block = f"""
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr><td style="background:#7c3aed;border-radius:10px;">
            <a href="{cta_url}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-family:Arial,Helvetica,sans-serif;">{cta_label}</a>
          </td></tr>
        </table>
        """
    return f"""
    <html><body style="margin:0;padding:0;background:#0b0b15;font-family:Arial,Helvetica,sans-serif;color:#e7e7ee;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
        <tr><td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#13131f;border:1px solid #2a2a3d;border-radius:16px;padding:32px;">
            <tr><td>
              <div style="font-size:13px;letter-spacing:2px;color:#8b8ba7;text-transform:uppercase;margin-bottom:8px;">VolunCore</div>
              <h1 style="margin:0 0 16px;font-size:24px;color:#ffffff;">{title}</h1>
              <div style="font-size:15px;line-height:1.6;color:#cfcfdc;">{body_html}</div>
              {cta_block}
              <hr style="border:none;border-top:1px solid #2a2a3d;margin:28px 0;" />
              <p style="font-size:12px;color:#6e6e88;margin:0;">You are receiving this because of activity on your VolunCore account.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>
    """


async def send_email(to: str, subject: str, html: str) -> dict:
    """Send a transactional email via Resend. No-op when not configured."""
    if not to:
        return {"sent": False, "skipped": "no_recipient"}
    if not RESEND_API_KEY:
        logger.info("[email skipped: no key] to=%s subject=%s", to, subject)
        return {"sent": False, "skipped": "no_api_key"}

    from_addr = f"{SENDER_NAME} <{SENDER_EMAIL}>" if SENDER_NAME else SENDER_EMAIL
    params = {"from": from_addr, "to": [to], "subject": subject, "html": html}
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        return {"sent": True, "id": result.get("id") if isinstance(result, dict) else None}
    except Exception as exc:
        logger.warning("Resend send failed to=%s err=%s", to, exc)
        return {"sent": False, "error": str(exc)}


# ---------- SMS ----------
async def send_sms(to: str, body: str) -> dict:
    """Send SMS via Twilio. No-op when not configured."""
    if not to:
        return {"sent": False, "skipped": "no_recipient"}
    if not _twilio_client or not TWILIO_PHONE_NUMBER:
        logger.info("[sms skipped: no creds] to=%s", to)
        return {"sent": False, "skipped": "no_credentials"}
    try:
        msg = await asyncio.to_thread(
            lambda: _twilio_client.messages.create(body=body, from_=TWILIO_PHONE_NUMBER, to=to)
        )
        return {"sent": True, "sid": msg.sid}
    except Exception as exc:
        logger.warning("Twilio send failed to=%s err=%s", to, exc)
        return {"sent": False, "error": str(exc)}


# ---------- In-app notifications ----------
def create_in_app(user_id: str, title: str, message: str, kind: str = "info", link: Optional[str] = None) -> dict:
    if not user_id:
        return {}
    nid = new_id()
    data = {
        "user_id": user_id,
        "title": title,
        "message": message,
        "kind": kind,  # info | success | warning | danger
        "link": link,
        "read": False,
        "created_at": now_iso(),
    }
    db.collection("notifications").document(nid).set(data)
    data["id"] = nid
    return data


def list_user_notifications(user_id: str, limit: int = 50) -> list:
    out = [serialize_doc(d) for d in db.collection("notifications").where("user_id", "==", user_id).stream()]
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return out[:limit]


def mark_read(user_id: str, notif_id: str) -> dict:
    ref = db.collection("notifications").document(notif_id)
    snap = ref.get()
    if not snap.exists:
        return {"ok": False}
    doc = serialize_doc(snap)
    if doc.get("user_id") != user_id:
        return {"ok": False, "error": "forbidden"}
    ref.update({"read": True})
    return {"ok": True}


def mark_all_read(user_id: str) -> dict:
    count = 0
    for d in db.collection("notifications").where("user_id", "==", user_id).where("read", "==", False).stream():
        d.reference.update({"read": True})
        count += 1
    return {"ok": True, "updated": count}


# ---------- High-level dispatch ----------
async def notify(
    *,
    user_id: Optional[str],
    email: Optional[str],
    phone: Optional[str],
    title: str,
    message: str,
    kind: str = "info",
    link: Optional[str] = None,
    cta_label: Optional[str] = None,
    cta_url: Optional[str] = None,
    sms_body: Optional[str] = None,
) -> dict:
    """Fan-out notification: in-app + email + SMS, all best-effort and concurrent.

    Respects the user's notification preferences (collection: users.notif_prefs):
      { "email": True/False, "sms": True/False, "in_app": True/False }
    """
    results: dict = {"in_app": None, "email": None, "sms": None}

    prefs = {"email": True, "sms": True, "in_app": True}
    if user_id:
        try:
            user_doc = db.collection("users").document(user_id).get()
            if user_doc.exists:
                p = (user_doc.to_dict() or {}).get("notif_prefs") or {}
                prefs.update({k: bool(v) for k, v in p.items() if k in prefs})
        except Exception as exc:
            logger.warning("read prefs failed: %s", exc)

    # in-app (sync, fast)
    if user_id and prefs["in_app"]:
        try:
            results["in_app"] = create_in_app(user_id, title, message, kind=kind, link=link)
        except Exception as exc:
            logger.warning("in_app create failed: %s", exc)

    tasks = []
    if email and prefs["email"]:
        html = _wrap_html(title, f"<p>{message}</p>", cta_label=cta_label, cta_url=cta_url)
        tasks.append(("email", send_email(email, title, html)))
    if phone and prefs["sms"]:
        body = sms_body or f"VolunCore: {title}. {message}"
        # Truncate to keep within a single SMS-ish length
        body = body if len(body) <= 320 else body[:317] + "..."
        tasks.append(("sms", send_sms(phone, body)))

    if tasks:
        completed = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
        for (label, _), res in zip(tasks, completed):
            results[label] = res if not isinstance(res, Exception) else {"sent": False, "error": str(res)}

    return results


def notify_sync(**kwargs) -> dict:
    """Sync wrapper for routes that aren't async — runs notify() in a fresh loop."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Schedule and don't block the running loop
            asyncio.ensure_future(notify(**kwargs))
            return {"scheduled": True}
    except RuntimeError:
        pass
    return asyncio.run(notify(**kwargs))


# ---------- Email/SMS templates ----------
def org_approval_email_html(org_name: str, dashboard_url: str) -> str:
    body = (
        f"<p>Great news — <strong>{org_name}</strong> has been approved on VolunCore.</p>"
        "<p>Your organisation profile is now live and you can start posting causes, "
        "managing volunteers, hosting events, and tracking impact.</p>"
    )
    return _wrap_html("Your organisation has been approved", body, cta_label="Open dashboard", cta_url=dashboard_url)


def org_rejection_email_html(org_name: str, reason: str, edit_url: str) -> str:
    safe_reason = reason or "No reason provided."
    body = (
        f"<p>We've reviewed the application for <strong>{org_name}</strong> and it could not be approved at this time.</p>"
        f"<p><strong>Reason from reviewer:</strong> {safe_reason}</p>"
        "<p>You can update your organisation details and resubmit for approval.</p>"
    )
    return _wrap_html("Application needs revision", body, cta_label="Edit & resubmit", cta_url=edit_url)
