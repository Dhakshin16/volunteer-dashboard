"""Tests for the new engagement features: avatar, streak, bookmarks."""
import requests
import time

BASE = "http://localhost:8001/api"
NGO_OWNER = "Bearer test::ngo_owner_3::ngoowner3@test.voluncore.com::NgoOwner3"
ADMIN = "Bearer test::admin_1::admin@test.voluncore.com::Admin"
VOL = "Bearer test::vol_eng::voleng@test.voluncore.com::VolEng"


def call(method, path, token=None, **kwargs):
    h = kwargs.pop("headers", {})
    if token:
        h["Authorization"] = token
    r = requests.request(method, BASE + path, headers=h, timeout=30, **kwargs)
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, r.text


# Bootstrap
call("GET", "/user/me", token=ADMIN)
call("GET", "/user/me", token=NGO_OWNER)
call("POST", "/user/role", token=NGO_OWNER, json={"role": "ngo"})
call("GET", "/user/me", token=VOL)
call("POST", "/user/role", token=VOL, json={"role": "volunteer"})

print("=== 1. Avatar persistence on volunteer profile ===")
DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII="
s, prof = call("POST", "/volunteer/me", token=VOL, json={
    "full_name": "Eng Vol", "city": "Bengaluru", "country": "India",
    "skills": ["teaching"], "interests": [], "languages": ["english"],
    "photo_url": DATA_URL,
})
assert s == 200, prof
assert prof.get("photo_url") == DATA_URL, f"avatar not persisted: {prof.get('photo_url')!r}"
print("✓ photo_url stored and returned")

# Update with gradient form
s, prof2 = call("POST", "/volunteer/me", token=VOL, json={
    "full_name": "Eng Vol", "city": "Bengaluru", "country": "India",
    "skills": ["teaching"], "interests": [], "languages": ["english"],
    "photo_url": "gradient::from-pink-500 to-rose-500",
})
assert prof2["photo_url"].startswith("gradient::"), prof2["photo_url"]
print("✓ gradient avatar accepted")


print("\n=== 2. Streak endpoint shape ===")
s, streak = call("GET", "/volunteer/streak", token=VOL)
assert s == 200, streak
assert "current" in streak and "longest" in streak and "active_today" in streak, streak
print("✓ streak baseline:", streak)


print("\n=== 3. Bookmarks: add/list/remove ===")
# Need a real cause first — bootstrap NGO + cause
ngo_payload = {"org_name": "Eng NGO", "mission": "x", "focus_areas": [], "city": "x", "country": "y", "contact_email": "e@e.com"}
s, ngo = call("POST", "/ngo/me", token=NGO_OWNER, json=ngo_payload)
call("POST", f"/admin/ngos/{ngo['id']}/approve", token=ADMIN, json={"approve": True})
time.sleep(0.3)
cause_payload = {"title": "Bookmark test", "description": "x", "category": "education",
                 "location_city": "x", "location_country": "y", "volunteers_needed": 1, "urgency": "low"}
s, cause = call("POST", "/causes/", token=NGO_OWNER, json=cause_payload)
assert s == 200, cause
cid = cause["id"]

s, ids = call("GET", "/volunteer/bookmarks/ids", token=VOL)
assert ids == {"ids": []} or ids.get("ids") == [], f"expected empty, got {ids}"
print("✓ no bookmarks initially")

s, b = call("POST", f"/volunteer/bookmarks/{cid}", token=VOL)
assert s == 200 and b.get("ok"), b
print("✓ bookmark created")

s, ids = call("GET", "/volunteer/bookmarks/ids", token=VOL)
assert cid in (ids.get("ids") or []), ids
print("✓ bookmark id listed:", ids)

s, lst = call("GET", "/volunteer/bookmarks", token=VOL)
assert s == 200 and any(b.get("cause_id") == cid for b in lst), lst
print("✓ bookmark hydrated with cause:", [b["cause"]["title"] for b in lst])

# Add same again is idempotent
s, _ = call("POST", f"/volunteer/bookmarks/{cid}", token=VOL)
s, ids2 = call("GET", "/volunteer/bookmarks/ids", token=VOL)
assert (ids2.get("ids") or []).count(cid) == 1, ids2
print("✓ duplicate bookmark idempotent")

# Remove
s, _ = call("DELETE", f"/volunteer/bookmarks/{cid}", token=VOL)
s, ids3 = call("GET", "/volunteer/bookmarks/ids", token=VOL)
assert cid not in (ids3.get("ids") or []), ids3
print("✓ bookmark removed:", ids3)

# Bookmarking a non-existent cause → 404
s, _ = call("POST", "/volunteer/bookmarks/nope", token=VOL)
assert s == 404
print("✓ 404 on unknown cause")


print("\n=== 4. Streak increases after activity ===")
# Enroll → creates 'enrollments' with today's date
call("POST", f"/enrollments/", token=VOL, json={"cause_id": cid, "motivation": "x"})
s, streak2 = call("GET", "/volunteer/streak", token=VOL)
assert streak2.get("current", 0) >= 1, streak2
assert streak2.get("active_today") is True, streak2
print("✓ streak updated after activity:", streak2)


print("\n🎉 ENGAGEMENT FEATURES TESTS PASSED")
