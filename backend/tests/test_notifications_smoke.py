"""Smoke test for notification_service: validates in-app create, email + SMS dispatch
work without crashing when credentials are missing (graceful no-op).
"""
import asyncio
import sys
sys.path.insert(0, "/app/backend")

from app.services.notification_service import (
    notify, send_email, send_sms, create_in_app, list_user_notifications, mark_read,
    org_approval_email_html, org_rejection_email_html,
)


async def main():
    # 1. In-app
    n = create_in_app("smoke-user-1", "Smoke title", "Smoke message body", kind="success", link="/v")
    assert n.get("id"), "in-app create failed"
    print("OK in_app id=", n["id"])

    items = list_user_notifications("smoke-user-1")
    assert any(x["id"] == n["id"] for x in items), "in-app not listed"
    print("OK list_user_notifications count=", len(items))

    r = mark_read("smoke-user-1", n["id"])
    assert r.get("ok"), "mark_read failed"
    print("OK mark_read")

    # 2. Email (no creds → graceful)
    em = await send_email("nobody@example.com", "Test subject", "<p>hi</p>")
    assert em.get("sent") is False, f"expected no_api_key skip, got {em}"
    print("OK email skipped:", em)

    # 3. SMS (no creds → graceful)
    sm = await send_sms("+10000000000", "test")
    assert sm.get("sent") is False, f"expected no_credentials skip, got {sm}"
    print("OK sms skipped:", sm)

    # 4. Composite notify
    res = await notify(
        user_id="smoke-user-2",
        email="user@example.com",
        phone="+10000000001",
        title="Approved",
        message="You're approved.",
        kind="success",
        cta_label="Go",
        cta_url="https://example.com",
    )
    assert res["in_app"], "no in-app from notify()"
    print("OK notify() composite:", {k: bool(v) for k, v in res.items()})

    # 5. Templates render
    h1 = org_approval_email_html("Acme NGO", "https://example.com/ngo")
    h2 = org_rejection_email_html("Acme NGO", "Documents missing", "https://example.com/ngo/register")
    assert "Acme NGO" in h1 and "approved" in h1.lower()
    assert "Acme NGO" in h2 and "Documents missing" in h2
    print("OK templates render len:", len(h1), len(h2))

    print("\nALL SMOKE TESTS PASSED")


if __name__ == "__main__":
    asyncio.run(main())
