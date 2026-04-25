"""Extended tests: notification preferences + scheduler reminders."""
import time
import requests
from datetime import datetime, timezone, timedelta

BASE = "http://localhost:8001/api"
ADMIN = "Bearer test::admin_1::admin@test.voluncore.com::Admin"
NGO_OWNER = "Bearer test::ngo_owner_2::ngoowner2@test.voluncore.com::NgoOwner2"
VOL = "Bearer test::vol_2::volunteer2@test.voluncore.com::Vol2"


def call(method, path, token=None, **kwargs):
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = token
    r = requests.request(method, BASE + path, headers=headers, timeout=30, **kwargs)
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, r.text


# ---------- 1. Preferences ----------
print("\n=== Preferences: defaults & toggle ===")
s, prefs = call("GET", "/notifications/preferences", token=VOL)
assert s == 200, prefs
assert prefs == {"email": True, "sms": True, "in_app": True}, prefs
print("✓ defaults all-on:", prefs)

# Disable email
s, after = call("PUT", "/notifications/preferences", token=VOL, json={"email": False})
assert s == 200 and after["email"] is False and after["sms"] is True, after
print("✓ email opt-out persists:", after)

# Now trigger a notification (volunteer welcome flow → re-set role) and verify
# that the in-app entry is created but no email is dispatched.
call("POST", "/user/role", token=VOL, json={"role": "volunteer"})
time.sleep(0.5)
s, notes = call("GET", "/notifications/me", token=VOL)
assert any("Welcome" in (n.get("title") or "") for n in notes), notes
print("✓ in-app still created with email-off")

# Re-enable
call("PUT", "/notifications/preferences", token=VOL, json={"email": True})

# Disable in_app and trigger again
call("PUT", "/notifications/preferences", token=VOL, json={"in_app": False})
before = len(notes)
call("POST", "/user/role", token=VOL, json={"role": "volunteer"})
time.sleep(0.4)
s, notes2 = call("GET", "/notifications/me", token=VOL)
assert len(notes2) == before, f"in-app should be suppressed: was {before} now {len(notes2)}"
print("✓ in-app suppressed when toggled off")

# Restore
call("PUT", "/notifications/preferences", token=VOL, json={"in_app": True})


# ---------- 2. Scheduler reminders ----------
print("\n=== Scheduler: reminders sweep ===")
# Bootstrap NGO + cause + event whose start is ~24h from now
call("GET", "/user/me", token=ADMIN)
call("GET", "/user/me", token=NGO_OWNER)
call("POST", "/user/role", token=NGO_OWNER, json={"role": "ngo"})
ngo_payload = {
    "org_name": "Reminder Co",
    "mission": "Test reminders.",
    "focus_areas": ["education"],
    "city": "Bengaluru", "country": "India",
    "contact_email": "rem@test.voluncore.com",
}
s, ngo = call("POST", "/ngo/me", token=NGO_OWNER, json=ngo_payload)
assert s == 200
call("POST", f"/admin/ngos/{ngo['id']}/approve", token=ADMIN, json={"approve": True})
time.sleep(0.4)

cause_payload = {
    "title": "Reminder cause",
    "description": "x", "category": "education",
    "location_city": "x", "location_country": "y",
    "volunteers_needed": 1, "urgency": "low",
}
s, cause = call("POST", "/causes/", token=NGO_OWNER, json=cause_payload)
assert s == 200, cause
cid = cause["id"]

# Volunteer profile + RSVP
call("POST", "/user/role", token=VOL, json={"role": "volunteer"})
call("POST", "/volunteer/me", token=VOL, json={"full_name": "V", "city": "x", "country": "y"})

# Event scheduled 24h from now (within 20 min tolerance)
starts = (datetime.now(timezone.utc) + timedelta(hours=24, minutes=5)).isoformat()
ends = (datetime.now(timezone.utc) + timedelta(hours=25)).isoformat()
ev_payload = {
    "cause_id": cid, "title": "Reminder Event",
    "description": "x", "starts_at": starts, "ends_at": ends,
    "location": "Field", "max_attendees": 5,
}
s, event = call("POST", "/events/", token=NGO_OWNER, json=ev_payload)
assert s == 200, event
eid = event["id"]
call("POST", f"/events/{eid}/rsvp", token=VOL)
time.sleep(0.4)

# Snapshot volunteer notif count
s, before = call("GET", "/notifications/me", token=VOL)
n_before = len(before)

# Trigger sweep
s, res = call("POST", "/admin/scheduler/run-now", token=ADMIN)
assert s == 200, res
print("✓ scheduler.run-now:", res)
time.sleep(0.6)

s, after = call("GET", "/notifications/me", token=VOL)
new_titles = [n["title"] for n in after if n["title"] not in [b["title"] for b in before]]
assert any("Reminder:" in t and "24" in t for t in (n["title"] for n in after)), \
    f"24h reminder not delivered. Got: {[n['title'] for n in after]}"
print("✓ 24h reminder delivered to volunteer")

# Calling sweep again should NOT re-send (sentinel set)
s, before2 = call("GET", "/notifications/me", token=VOL)
call("POST", "/admin/scheduler/run-now", token=ADMIN)
time.sleep(0.5)
s, after2 = call("GET", "/notifications/me", token=VOL)
assert len(after2) == len(before2), "duplicate reminder sent"
print("✓ sentinel prevents duplicates")

# 1h reminder: schedule another event ~1h away
starts1h = (datetime.now(timezone.utc) + timedelta(hours=1, minutes=5)).isoformat()
ends1h = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
s, event2 = call("POST", "/events/", token=NGO_OWNER, json={**ev_payload, "title": "1h Event", "starts_at": starts1h, "ends_at": ends1h})
assert s == 200
call("POST", f"/events/{event2['id']}/rsvp", token=VOL)
time.sleep(0.3)
call("POST", "/admin/scheduler/run-now", token=ADMIN)
time.sleep(0.6)
s, final = call("GET", "/notifications/me", token=VOL)
assert any("1 hour" in (n.get("title") or "") for n in final), [n["title"] for n in final[:6]]
print("✓ 1h reminder delivered")

print("\n🎉 PREFS + SCHEDULER tests passed")
