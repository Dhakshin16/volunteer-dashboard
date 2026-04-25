"""VolunCore backend end-to-end test suite.

Covers: dev-login token mint, user/role flows, volunteer profile + stats,
NGO profile + admin approval, causes (Gemini summary), enrollments + hours,
matches (Gemini), reports (AI analysis), Auri chat (multi-turn), admin
overview, leaderboard, and authorization enforcement.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback for local pytest run
    with open("/app/frontend/.env") as f:
        for ln in f:
            if ln.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = ln.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@voluncore.app", "password": "Admin@12345"}
# Use a unique volunteer + ngo email per run to avoid leftover role/profile state
RUN_ID = uuid.uuid4().hex[:8]
VOL = {"email": f"vol_{RUN_ID}@voluncore.app", "password": "Volunteer@12345", "role": "volunteer", "name": "Test Vol"}
NGO = {"email": f"ngo_{RUN_ID}@voluncore.app", "password": "Ngo@12345", "role": "ngo", "name": "Test NGO User"}


# ---------- helpers ----------
def dev_login(payload):
    r = requests.post(f"{API}/auth/dev-login", json=payload, timeout=30)
    assert r.status_code == 200, f"dev-login failed: {r.status_code} {r.text}"
    return r.json()


def auth_h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- session-scoped tokens ----------
@pytest.fixture(scope="session")
def admin_ctx():
    d = dev_login(ADMIN)
    return d


@pytest.fixture(scope="session")
def vol_ctx():
    return dev_login(VOL)


@pytest.fixture(scope="session")
def ngo_ctx():
    return dev_login(NGO)


# ---------- 1. Health ----------
def test_health():
    r = requests.get(f"{API}/health", timeout=10)
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ---------- 2. Dev-login + user/me ----------
def test_admin_dev_login_role(admin_ctx):
    assert admin_ctx["role"] == "admin"
    assert admin_ctx["id_token"]
    assert admin_ctx["uid"]


def test_user_me_admin(admin_ctx):
    r = requests.get(f"{API}/user/me", headers=auth_h(admin_ctx["id_token"]), timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"].lower() == ADMIN["email"]
    assert data["role"] == "admin"


def test_user_me_unauthenticated_401():
    r = requests.get(f"{API}/user/me", timeout=10)
    assert r.status_code in (401, 403), r.text


def test_volunteer_dev_login_sets_role(vol_ctx):
    assert vol_ctx["role"] == "volunteer", vol_ctx
    r = requests.get(f"{API}/user/me", headers=auth_h(vol_ctx["id_token"]), timeout=15)
    assert r.status_code == 200
    assert r.json()["role"] == "volunteer"


def test_ngo_dev_login_sets_role(ngo_ctx):
    assert ngo_ctx["role"] == "ngo", ngo_ctx
    r = requests.get(f"{API}/user/me", headers=auth_h(ngo_ctx["id_token"]), timeout=15)
    assert r.status_code == 200
    assert r.json()["role"] == "ngo"


# ---------- 3. POST /api/user/role ----------
def test_user_role_set_volunteer(vol_ctx):
    # Idempotent: explicitly set role volunteer
    r = requests.post(f"{API}/user/role", json={"role": "volunteer"},
                      headers=auth_h(vol_ctx["id_token"]), timeout=15)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body.get("role") == "volunteer"


# ---------- 4. Volunteer profile + stats ----------
def test_volunteer_profile_upsert_and_get(vol_ctx):
    payload = {
        "full_name": "Test Volunteer",
        "skills": ["teaching", "logistics"],
        "interests": ["education", "environment"],
        "languages": ["en"],
        "availability_hours_per_week": 8,
        "bio": "TEST volunteer profile",
        "city": "Bengaluru",
        "country": "India",
    }
    r = requests.post(f"{API}/volunteer/me", json=payload,
                      headers=auth_h(vol_ctx["id_token"]), timeout=20)
    assert r.status_code in (200, 201), r.text
    g = requests.get(f"{API}/volunteer/me", headers=auth_h(vol_ctx["id_token"]), timeout=15)
    assert g.status_code == 200, g.text
    body = g.json()
    assert "education" in (body.get("interests") or [])
    assert body.get("city") == "Bengaluru"


def test_volunteer_stats(vol_ctx):
    r = requests.get(f"{API}/volunteer/stats",
                     headers=auth_h(vol_ctx["id_token"]), timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    # Common aggregate keys — at least one must exist
    assert any(k in data for k in ("total_hours", "hours", "impact_points", "enrollments"))


# ---------- 5. NGO profile + admin approval ----------
@pytest.fixture(scope="session")
def ngo_profile(ngo_ctx):
    payload = {
        "org_name": f"TEST NGO {RUN_ID}",
        "mission": "Help communities thrive (TEST).",
        "focus_areas": ["education", "health"],
        "city": "Bengaluru",
        "country": "India",
        "website": "https://example.org",
        "contact_email": f"contact_{RUN_ID}@voluncore.app",
    }
    r = requests.post(f"{API}/ngo/me", json=payload,
                      headers=auth_h(ngo_ctx["id_token"]), timeout=20)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    return body


def test_ngo_profile_created_unapproved(ngo_profile):
    assert ngo_profile.get("is_approved") in (False, None, 0)
    assert ngo_profile.get("org_name", "").startswith("TEST NGO")


def test_ngo_get_me(ngo_ctx, ngo_profile):
    r = requests.get(f"{API}/ngo/me", headers=auth_h(ngo_ctx["id_token"]), timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("org_name", "").startswith("TEST NGO")


def test_admin_approve_ngo(admin_ctx, ngo_profile, ngo_ctx):
    ngo_id = ngo_profile.get("id") or ngo_profile.get("ngo_id") or ngo_profile.get("_id")
    assert ngo_id, f"NGO id missing in response: {ngo_profile}"
    r = requests.post(f"{API}/admin/ngos/{ngo_id}/approve",
                      json={"approve": True},
                      headers=auth_h(admin_ctx["id_token"]), timeout=20)
    assert r.status_code in (200, 201), r.text
    # Verify
    g = requests.get(f"{API}/ngo/me", headers=auth_h(ngo_ctx["id_token"]), timeout=15)
    assert g.status_code == 200
    assert g.json().get("is_approved") is True


def test_admin_endpoint_requires_admin(vol_ctx):
    r = requests.get(f"{API}/admin/overview", headers=auth_h(vol_ctx["id_token"]), timeout=15)
    assert r.status_code in (401, 403), r.text


# ---------- 6. Causes (Gemini summary) ----------
@pytest.fixture(scope="session")
def created_cause(ngo_ctx, admin_ctx, ngo_profile):
    # Make sure approved (test_admin_approve_ngo may run earlier; if not, force here)
    ngo_id = ngo_profile.get("id") or ngo_profile.get("ngo_id")
    requests.post(f"{API}/admin/ngos/{ngo_id}/approve", json={"approve": True},
                  headers=auth_h(admin_ctx["id_token"]), timeout=20)

    payload = {
        "title": f"TEST Tree planting drive {RUN_ID}",
        "description": "Plant 200 native saplings on the lake bund this Saturday morning.",
        "category": "environment",
        "location_city": "Bengaluru",
        "location_country": "India",
        "skills_needed": ["physical work", "logistics"],
        "volunteers_needed": 30,
        "urgency": "medium",
        "start_date": "2026-03-15T07:00:00Z",
    }
    r = requests.post(f"{API}/causes/", json=payload,
                      headers=auth_h(ngo_ctx["id_token"]), timeout=60)
    assert r.status_code in (200, 201), r.text
    return r.json()


def test_cause_created_with_ai_summary(created_cause):
    assert created_cause.get("id"), created_cause
    assert created_cause.get("title", "").startswith("TEST Tree")
    # Gemini summary may be string or absent on transient failure — assert key exists
    assert "ai_summary" in created_cause
    if created_cause["ai_summary"]:
        assert isinstance(created_cause["ai_summary"], str)
        assert len(created_cause["ai_summary"]) > 0


def test_list_open_causes(created_cause):
    r = requests.get(f"{API}/causes/", timeout=15)
    assert r.status_code == 200, r.text
    items = r.json()
    assert isinstance(items, list)
    ids = [c.get("id") for c in items]
    assert created_cause["id"] in ids


def test_cause_detail(created_cause):
    cid = created_cause["id"]
    r = requests.get(f"{API}/causes/{cid}", timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["id"] == cid


# ---------- 7. Enrollments + hours ----------
@pytest.fixture(scope="session")
def enrollment(vol_ctx, created_cause):
    payload = {"cause_id": created_cause["id"]}
    r = requests.post(f"{API}/enrollments/", json=payload,
                      headers=auth_h(vol_ctx["id_token"]), timeout=20)
    assert r.status_code in (200, 201), r.text
    return r.json()


def test_enrollment_created(enrollment, created_cause):
    assert enrollment.get("cause_id") == created_cause["id"]


def test_enrollments_me(vol_ctx, enrollment):
    r = requests.get(f"{API}/enrollments/me", headers=auth_h(vol_ctx["id_token"]), timeout=15)
    assert r.status_code == 200, r.text
    items = r.json()
    assert isinstance(items, list) and len(items) >= 1
    # Should embed cause data per spec
    sample = items[0]
    assert "cause" in sample or "cause_id" in sample


def test_log_hours_bumps_impact(vol_ctx, enrollment):
    before = requests.get(f"{API}/volunteer/stats", headers=auth_h(vol_ctx["id_token"])).json()
    payload = {"enrollment_id": enrollment.get("id"), "hours": 3,
               "note": "TEST hours"}
    r = requests.post(f"{API}/enrollments/hours", json=payload,
                      headers=auth_h(vol_ctx["id_token"]), timeout=20)
    assert r.status_code in (200, 201), r.text
    after = requests.get(f"{API}/volunteer/stats", headers=auth_h(vol_ctx["id_token"])).json()
    # impact_points or total_hours should have grown
    grew = False
    for k in ("impact_points", "total_hours", "hours"):
        if k in before and k in after and (after[k] or 0) > (before[k] or 0):
            grew = True
            break
    assert grew, f"No stat grew. before={before} after={after}"


# ---------- 8. Volunteer matches (Gemini) ----------
def test_volunteer_matches_gemini(vol_ctx):
    r = requests.get(f"{API}/volunteer/matches",
                     headers=auth_h(vol_ctx["id_token"]), timeout=90)
    assert r.status_code == 200, r.text
    items = r.json()
    assert isinstance(items, list)
    # If we have at least one open cause, matches should include reason text
    if items:
        sample = items[0]
        assert any(k in sample for k in ("reason", "match_reason", "explanation", "ai_reason")), sample
        assert any(k in sample for k in ("score", "match_score", "ai_score")), sample


# ---------- 9. Reports (AI analysis) ----------
def test_field_report_ai_analysis(vol_ctx, created_cause):
    payload = {
        "cause_id": created_cause["id"],
        "text": "Severe flooding in 3 villages, urgent need for clean water and shelter. People are displaced.",
        "location_lat": 12.97,
        "location_lng": 77.59,
    }
    r = requests.post(f"{API}/reports/", json=payload,
                      headers=auth_h(vol_ctx["id_token"]), timeout=60)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    # AI fields nested in ai_analysis + top-level is_crisis
    assert "ai_analysis" in body or any(k in body for k in ("urgency", "summary"))
    ai = body.get("ai_analysis") or body
    for k in ("urgency", "sentiment", "summary"):
        assert k in ai, f"missing AI field {k}: {body}"
    assert "is_crisis" in body or "is_crisis" in ai


# ---------- 10. Auri chat multi-turn ----------
def test_auri_chat_multi_turn(vol_ctx):
    sid = f"sess_{RUN_ID}"
    r1 = requests.post(f"{API}/chat/", json={"session_id": sid,
                                             "message": "Hi, my name is TestUser. What is VolunCore?"},
                       headers=auth_h(vol_ctx["id_token"]), timeout=60)
    assert r1.status_code == 200, r1.text
    reply1 = r1.json().get("reply") or r1.json().get("message") or r1.json().get("text")
    assert reply1 and isinstance(reply1, str) and len(reply1) > 0

    r2 = requests.post(f"{API}/chat/", json={"session_id": sid,
                                             "message": "What name did I just give you?"},
                       headers=auth_h(vol_ctx["id_token"]), timeout=60)
    assert r2.status_code == 200, r2.text
    reply2 = r2.json().get("reply") or r2.json().get("message") or r2.json().get("text")
    assert reply2 and len(reply2) > 0


# ---------- 11. Admin overview + leaderboard ----------
def test_admin_overview(admin_ctx):
    r = requests.get(f"{API}/admin/overview", headers=auth_h(admin_ctx["id_token"]), timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, dict) and len(data) > 0


def test_volunteer_leaderboard(vol_ctx):
    r = requests.get(f"{API}/volunteer/leaderboard",
                     headers=auth_h(vol_ctx["id_token"]), timeout=20)
    assert r.status_code == 200, r.text
    items = r.json()
    assert isinstance(items, list)


# ---------- 12. Authorization enforcement ----------
@pytest.mark.parametrize("path", [
    "/volunteer/me", "/ngo/me", "/enrollments/me", "/admin/overview",
    "/user/me", "/volunteer/stats",
])
def test_protected_endpoints_require_auth(path):
    r = requests.get(f"{API}{path}", timeout=10)
    assert r.status_code in (401, 403), f"{path} → {r.status_code}"
