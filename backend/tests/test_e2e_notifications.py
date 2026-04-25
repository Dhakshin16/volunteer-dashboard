"""End-to-end test of all notification triggers via real HTTP calls.
Uses ENABLE_TEST_AUTH=true bearer tokens to bypass Firebase web SDK login.
"""
import json
import time
import requests

BASE = "http://localhost:8001/api"

NGO_OWNER = "Bearer test::ngo_owner_1::ngoowner@test.voluncore.com::NgoOwner"
ADMIN = "Bearer test::admin_1::admin@test.voluncore.com::Admin"
VOL = "Bearer test::vol_1::volunteer@test.voluncore.com::Vol"


def step(name):
    print(f"\n=== {name} ===")


def call(method, path, token=None, **kwargs):
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = token
    r = requests.request(method, BASE + path, headers=headers, timeout=30, **kwargs)
    print(f"{method} {path} → {r.status_code}")
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, r.text


# 1. Admin and volunteer login (bootstrap users)
step("Bootstrap admin & volunteer")
call("GET", "/user/me", token=ADMIN)
call("GET", "/user/me", token=VOL)
# Volunteer selects role
call("POST", "/user/role", token=VOL, json={"role": "volunteer"})
time.sleep(0.3)
# NGO owner logs in & selects NGO role
call("GET", "/user/me", token=NGO_OWNER)
call("POST", "/user/role", token=NGO_OWNER, json={"role": "ngo"})
time.sleep(0.3)

# Verify volunteer got welcome notification
step("Volunteer should have welcome notification")
status, vol_notes = call("GET", "/notifications/me", token=VOL)
assert any("Welcome" in (n.get("title") or "") for n in vol_notes), f"no welcome found: {vol_notes}"
print("✓ welcome notif present")

# 2. NGO submits profile → NGO owner gets confirmation, admin gets alert
step("NGO submit profile")
ngo_payload = {
    "org_name": "Acme Helpers",
    "mission": "Help local communities thrive.",
    "focus_areas": ["education", "food"],
    "city": "Bengaluru",
    "country": "India",
    "website": "https://acme.example",
    "contact_email": "contact@acme.example",
    "contact_phone": "",
    "registration_id": "REG-123",
}
status, ngo = call("POST", "/ngo/me", token=NGO_OWNER, json=ngo_payload)
assert status == 200, f"upsert failed {ngo}"
ngo_id = ngo["id"]
time.sleep(0.5)

step("NGO owner should have submitted-confirmation notification")
status, ngo_notes = call("GET", "/notifications/me", token=NGO_OWNER)
assert any("Application submitted" in (n.get("title") or "") for n in ngo_notes), f"no submission notif: {ngo_notes}"
print("✓ submission confirmation present")

step("Admin should have new-org-pending notification")
status, admin_notes = call("GET", "/notifications/me", token=ADMIN)
assert any("pending review" in (n.get("title") or "").lower() for n in admin_notes), f"no admin alert: {admin_notes}"
print("✓ admin alert present")

# 3. Admin rejects → NGO owner gets warning notif
step("Admin rejects NGO")
status, _ = call("POST", f"/admin/ngos/{ngo_id}/approve", token=ADMIN, json={"approve": False, "reason": "Need more docs"})
assert status == 200
time.sleep(0.5)
status, ngo_notes = call("GET", "/notifications/me", token=NGO_OWNER)
assert any("needs revision" in (n.get("title") or "").lower() for n in ngo_notes), f"no rejection notif: {ngo_notes}"
print("✓ rejection notif present")

# 4. NGO resubmits → admin alerted again
step("NGO resubmits (after rejection)")
call("POST", "/ngo/me", token=NGO_OWNER, json=ngo_payload)
time.sleep(0.5)

# 5. Admin approves
step("Admin approves NGO")
status, _ = call("POST", f"/admin/ngos/{ngo_id}/approve", token=ADMIN, json={"approve": True})
assert status == 200
time.sleep(0.5)
status, ngo_notes = call("GET", "/notifications/me", token=NGO_OWNER)
assert any("approved" in (n.get("title") or "").lower() for n in ngo_notes), f"no approval notif: {ngo_notes}"
print("✓ approval notif present")

# 6. NGO creates a cause → confirmation
step("NGO creates a cause")
cause_payload = {
    "title": "Beach cleanup drive",
    "description": "Help clean the local beach this Saturday.",
    "category": "environment",
    "location_city": "Bengaluru",
    "location_country": "India",
    "skills_needed": ["physical labor"],
    "volunteers_needed": 5,
    "urgency": "medium",
}
status, cause = call("POST", "/causes/", token=NGO_OWNER, json=cause_payload)
assert status == 200, f"cause create failed {cause}"
cause_id = cause["id"]
time.sleep(1.5)
status, ngo_notes = call("GET", "/notifications/me", token=NGO_OWNER)
assert any("Cause published" in (n.get("title") or "") for n in ngo_notes), f"no cause notif: {ngo_notes}"
print("✓ cause-created notif present")

# 7. Volunteer enrolls → both volunteer + NGO owner get notified
step("Volunteer enrolls in cause (should fail without volunteer profile first)")
# Need volunteer profile
vp = {"full_name": "Vol One", "skills": ["cleaning"], "interests": ["environment"], "languages": ["en"], "city": "Bengaluru", "country": "India"}
call("POST", "/volunteer/me", token=VOL, json=vp)
time.sleep(0.3)

status, enr = call("POST", "/enrollments/", token=VOL, json={"cause_id": cause_id, "motivation": "I care!"})
assert status == 200, f"enroll failed {enr}"
time.sleep(0.5)
status, vol_notes = call("GET", "/notifications/me", token=VOL)
assert any("joined" in (n.get("title") or "").lower() for n in vol_notes), f"no enroll-vol notif: {vol_notes}"
print("✓ volunteer enrollment notif present")
status, ngo_notes = call("GET", "/notifications/me", token=NGO_OWNER)
assert any("New volunteer" in (n.get("title") or "") for n in ngo_notes), f"no enroll-ngo notif: {ngo_notes}"
print("✓ NGO new-volunteer notif present")

# 8. NGO creates an event → confirmation
step("NGO schedules event")
ev = {
    "cause_id": cause_id,
    "title": "Beach cleanup orientation",
    "description": "Quick briefing before we start",
    "starts_at": "2030-01-01T09:00:00Z",
    "ends_at": "2030-01-01T10:00:00Z",
    "location": "Marina pier",
    "max_attendees": 20,
}
status, event = call("POST", "/events/", token=NGO_OWNER, json=ev)
assert status == 200, f"event failed {event}"
event_id = event["id"]
time.sleep(0.5)
status, ngo_notes = call("GET", "/notifications/me", token=NGO_OWNER)
assert any("Event scheduled" in (n.get("title") or "") for n in ngo_notes), f"no event notif: {ngo_notes}"
print("✓ event scheduled notif present")

# 9. Volunteer RSVPs → confirmation
step("Volunteer RSVPs to event")
status, rsvp = call("POST", f"/events/{event_id}/rsvp", token=VOL)
assert status == 200, f"rsvp failed {rsvp}"
time.sleep(0.5)
status, vol_notes = call("GET", "/notifications/me", token=VOL)
assert any("confirmed for" in (n.get("title") or "").lower() for n in vol_notes), f"no rsvp notif: {vol_notes}"
print("✓ RSVP confirmation notif present")

# 10. Mark all read & unread-count
step("Mark-all-read endpoint")
status, _ = call("POST", "/notifications/read-all", token=VOL)
assert status == 200
status, count = call("GET", "/notifications/me/unread-count", token=VOL)
assert count.get("count") == 0, f"unread should be 0 after read-all: {count}"
print("✓ mark-all-read works")

print("\n\n🎉 ALL E2E NOTIFICATION TRIGGERS VALIDATED")
