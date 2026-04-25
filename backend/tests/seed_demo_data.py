"""Seed VolunCore with realistic demo data:
- 1 admin user (Firebase Auth + Firestore role=admin)
- 10 approved NGOs with rich profiles
- 25 causes (2-3 per NGO) with skills, urgency, geo
- ~12 upcoming events tied to causes
- 5 volunteer accounts (no auth, just Firestore) so causes look populated

Run from /app/backend as:  python tests/seed_demo_data.py
"""
import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta

import httpx
from firebase_admin import auth as fb_auth

sys.path.insert(0, "/app/backend")

from app.core.firebase import db  # noqa: E402
from app.core.config import ADMIN_EMAILS  # noqa: E402
from app.utils.firestore_utils import now_iso, new_id  # noqa: E402

FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY")
IT = "https://identitytoolkit.googleapis.com/v1/accounts"

ADMIN_EMAIL = "admin@voluncore.app"
ADMIN_PASSWORD = "VolunCore2026!"
ADMIN_NAME = "VolunCore Admin"


# ---------- Admin via Identity Toolkit ----------
async def ensure_admin() -> dict:
    if not FIREBASE_WEB_API_KEY:
        raise SystemExit("FIREBASE_WEB_API_KEY missing in .env")

    # Try sign-in first (in case admin already has the right password)
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{IT}:signInWithPassword?key={FIREBASE_WEB_API_KEY}",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "returnSecureToken": True},
        )
        if r.status_code == 200:
            res = r.json()
            print(f"  ✓ admin already exists, signed in (uid={res['localId']})")
            uid = res["localId"]
        else:
            # Try to create
            r2 = await client.post(
                f"{IT}:signUp?key={FIREBASE_WEB_API_KEY}",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD,
                      "displayName": ADMIN_NAME, "returnSecureToken": True},
            )
            if r2.status_code == 200:
                res = r2.json()
                uid = res["localId"]
                print(f"  ✓ admin created (uid={uid})")
            else:
                # Email exists but password mismatch — reset it via Admin SDK.
                user = fb_auth.get_user_by_email(ADMIN_EMAIL)
                fb_auth.update_user(user.uid, password=ADMIN_PASSWORD,
                                    display_name=ADMIN_NAME, email_verified=True)
                uid = user.uid
                print(f"  ✓ admin password reset (uid={uid})")

    ref = db.collection("users").document(uid)
    if not ref.get().exists:
        ref.set({
            "email": ADMIN_EMAIL, "name": ADMIN_NAME, "photo_url": None,
            "role": "admin", "onboarded": True, "created_at": now_iso(),
        })
    else:
        ref.update({"role": "admin", "name": ADMIN_NAME})
    return {"uid": uid, "email": ADMIN_EMAIL}


# ---------- Demo data ----------
NGOS = [
    {"name": "Roots & Wings Foundation",   "mission": "Free after-school education for first-generation learners in low-income neighbourhoods.", "focus": ["education", "children"], "city": "Bengaluru",  "country": "India", "email": "contact@rootsandwings.org",   "site": "https://rootsandwings.org"},
    {"name": "BlueShore Collective",        "mission": "Coastal & marine cleanups, plastic-recovery and citizen-science across India's coastline.",  "focus": ["environment", "ocean"],   "city": "Chennai",    "country": "India", "email": "hello@blueshore.in",          "site": "https://blueshore.in"},
    {"name": "Annapurna Kitchens",          "mission": "Hot meals delivered daily to children at government schools and migrant labour camps.",      "focus": ["food", "children"],       "city": "Hyderabad",  "country": "India", "email": "team@annapurnakitchens.org",  "site": "https://annapurnakitchens.org"},
    {"name": "Pawsitive Hearts",            "mission": "Rescue, rehab and re-home street animals; community sterilisation drives.",                  "focus": ["animal"],                 "city": "Pune",       "country": "India", "email": "rescue@pawsitivehearts.org",  "site": "https://pawsitivehearts.org"},
    {"name": "GreenCanopy Initiative",      "mission": "Native-tree restoration on degraded urban lots; biodiversity monitoring.",                   "focus": ["environment"],            "city": "Mumbai",     "country": "India", "email": "grow@greencanopy.org",        "site": "https://greencanopy.org"},
    {"name": "Sahara Crisis Response",      "mission": "Rapid disaster relief — flood, cyclone, earthquake — across South Asia.",                    "focus": ["disaster"],               "city": "Delhi",      "country": "India", "email": "ops@saharacrisis.org",        "site": "https://saharacrisis.org"},
    {"name": "Sunset Care Network",         "mission": "Companionship visits, medical support and digital literacy for senior citizens.",            "focus": ["elderly", "healthcare"],  "city": "Kolkata",    "country": "India", "email": "care@sunsetcare.org",         "site": "https://sunsetcare.org"},
    {"name": "Dignity Health Outreach",     "mission": "Free mobile clinics & menstrual-hygiene programs in rural villages.",                        "focus": ["healthcare", "women"],    "city": "Jaipur",     "country": "India", "email": "clinic@dignityhealth.org",    "site": "https://dignityhealth.org"},
    {"name": "Codeology Mentors",           "mission": "Pairs working software engineers with college students for 1:1 career mentoring.",            "focus": ["education", "digital"],   "city": "Bengaluru",  "country": "India", "email": "mentors@codeology.io",        "site": "https://codeology.io"},
    {"name": "Saksham Skill Studio",        "mission": "Vocational training in tailoring, baking, computer literacy for underserved women.",         "focus": ["women", "education"],     "city": "Lucknow",    "country": "India", "email": "info@saksham.org",            "site": "https://saksham.org"},
]

# 2-3 causes per NGO (indexed by NGO name). Each cause gets created.
CAUSES_BY_NGO = {
    "Roots & Wings Foundation": [
        {"title": "Weekend math tutors for grade 6-8", "category": "education", "skills": ["teaching", "tutoring", "patience"], "urgency": "medium", "needed": 6, "desc": "Volunteer 2 hours every Saturday morning to tutor children in maths fundamentals — fractions, geometry, basic algebra. Curriculum and worksheets are provided. Bilingual (English + Kannada) preferred."},
        {"title": "Storytelling sessions for under-10 kids", "category": "education", "skills": ["public speaking", "creative thinking"], "urgency": "low", "needed": 4, "desc": "Read picture books, lead theatre activities, and build reading confidence in young children. Wednesdays 4–6 PM at our Kalkere centre."},
    ],
    "BlueShore Collective": [
        {"title": "Marina Beach plastic cleanup — Saturday", "category": "environment", "skills": ["physical labor", "teamwork"], "urgency": "high", "needed": 30, "desc": "Join 30+ volunteers for a 3-hour beach cleanup. Gloves, bags and lemon water are provided. Meet at lighthouse parking 6:30 AM. Open to all ages."},
        {"title": "Citizen-scientist plastic survey volunteers", "category": "environment", "skills": ["data analysis", "research"], "urgency": "low", "needed": 5, "desc": "Help us catalog and classify recovered plastic samples. We're contributing data to the national plastic-pollution dataset. Training provided."},
        {"title": "Mangrove planting drive — Pichavaram", "category": "environment", "skills": ["physical labor", "logistics"], "urgency": "medium", "needed": 20, "desc": "Day-trip to Pichavaram to plant 500 mangrove saplings. Bus, breakfast & lunch provided. Build coastal resilience while making memories."},
    ],
    "Annapurna Kitchens": [
        {"title": "Morning meal-packing crew (5–8 AM)", "category": "food", "skills": ["cooking", "logistics", "physical labor"], "urgency": "high", "needed": 10, "desc": "Pack 1,200 hot breakfasts every morning before they go out for delivery. Kitchen experience helpful but not required. Free chai included!"},
        {"title": "Delivery-route drivers (own vehicle)", "category": "food", "skills": ["driving", "logistics"], "urgency": "high", "needed": 6, "desc": "Volunteers with own car/scooter needed to deliver hot meal boxes to schools across Hyderabad. ~1.5 hours per route. Petrol cost reimbursed."},
    ],
    "Pawsitive Hearts": [
        {"title": "Weekend dog-walking volunteers", "category": "animal", "skills": ["empathy", "physical labor"], "urgency": "medium", "needed": 8, "desc": "Walk and socialise 30+ rescue dogs at our Wakad shelter. Especially needed Saturday and Sunday mornings. Dog handling training provided on day 1."},
        {"title": "Sterilisation drive — outreach team", "category": "animal", "skills": ["communication", "community engagement"], "urgency": "medium", "needed": 6, "desc": "Help us run a 2-day mass sterilisation camp. Volunteers handle community awareness, animal intake forms, and post-op care."},
    ],
    "GreenCanopy Initiative": [
        {"title": "Tree-planting drive at Aarey Forest", "category": "environment", "skills": ["physical labor", "teamwork"], "urgency": "medium", "needed": 25, "desc": "Plant 300 native saplings in degraded patches of Aarey. Saplings, tools and refreshments provided. Bring a hat and water bottle."},
        {"title": "Biodiversity monitoring — bird counts", "category": "environment", "skills": ["research", "patience"], "urgency": "low", "needed": 5, "desc": "Quarterly bird-census volunteer needed. Two hours of dawn watching at our 5 monitoring sites. Binoculars provided. Bird-ID basics will be taught."},
    ],
    "Sahara Crisis Response": [
        {"title": "Flood relief — packing kit volunteers", "category": "disaster", "skills": ["logistics", "physical labor"], "urgency": "critical", "needed": 40, "desc": "Help pack 5,000 emergency-relief kits (food, ORS, blankets) for ongoing Bihar flood response. Warehouse in Faridabad. Hot lunch + transport from metro provided."},
        {"title": "Disaster-response coordinator (remote)", "category": "disaster", "skills": ["project management", "communication", "data analysis"], "urgency": "high", "needed": 3, "desc": "Manage WhatsApp-group volunteers, supply spreadsheets and field reports. ~6 hrs/week, fully remote. Strong written English required."},
    ],
    "Sunset Care Network": [
        {"title": "Sunday tea visits with elderly neighbours", "category": "elderly", "skills": ["empathy", "communication"], "urgency": "low", "needed": 10, "desc": "Visit a senior near you for an hour of conversation, chai and company. We pair you with someone within 3 km of your home. Hindi/Bengali helpful."},
        {"title": "Smartphone literacy tutors for seniors", "category": "elderly", "skills": ["teaching", "patience"], "urgency": "medium", "needed": 5, "desc": "Teach our seniors how to make video-calls, use WhatsApp, and stay safe online. 1.5 hrs/week. Saturdays at our Salt Lake centre."},
    ],
    "Dignity Health Outreach": [
        {"title": "Mobile clinic registration desk volunteers", "category": "healthcare", "skills": ["communication", "data analysis"], "urgency": "medium", "needed": 8, "desc": "Run patient registration & basic vitals at our weekly mobile clinics in nearby villages. Day trips, bus from Jaipur. Hindi a must."},
        {"title": "Menstrual-hygiene awareness facilitators", "category": "women", "skills": ["public speaking", "empathy", "community engagement"], "urgency": "medium", "needed": 6, "desc": "Run workshops in rural schools for adolescent girls. Curriculum, kits and travel provided. Female facilitators only, please."},
    ],
    "Codeology Mentors": [
        {"title": "1:1 mentorship — frontend / backend / mobile", "category": "education", "skills": ["mentoring", "web development"], "urgency": "low", "needed": 12, "desc": "Commit to 60 min/week with one student. We pair on stack & timezone. Six-month minimum. Best fit if you have ≥2 yrs of professional dev experience."},
        {"title": "Mock-interview panel — software roles", "category": "education", "skills": ["mentoring", "communication", "problem solving"], "urgency": "medium", "needed": 6, "desc": "Run a 45-min mock interview every fortnight, then share written feedback. Especially needed for senior engineers from product companies."},
    ],
    "Saksham Skill Studio": [
        {"title": "Computer-literacy instructors for women", "category": "women", "skills": ["teaching", "patience"], "urgency": "medium", "needed": 4, "desc": "Teach Word, Excel, and basic internet skills to women starting their first jobs. 2 batches per week, ~2 hrs each, evenings."},
        {"title": "Tailoring workshop — sewing-machine donors & teachers", "category": "women", "skills": ["teaching"], "urgency": "low", "needed": 3, "desc": "Got a working sewing machine to donate? Or know your way around one? Help us run our 6-week tailoring bootcamp."},
    ],
}

VOLUNTEER_NAMES = [
    ("Aarav Mehta",   "aarav.mehta@example.com",   "Bengaluru", ["teaching", "mentoring"]),
    ("Priya Iyer",    "priya.iyer@example.com",    "Chennai",   ["graphic design", "social media"]),
    ("Rahul Singh",   "rahul.singh@example.com",   "Delhi",     ["driving", "logistics"]),
    ("Neha Verma",    "neha.verma@example.com",    "Mumbai",    ["public speaking", "empathy"]),
    ("Karthik Rao",   "karthik.rao@example.com",   "Hyderabad", ["data analysis", "research"]),
]


def _ngo_payload(n: dict) -> dict:
    return {
        "user_id": f"ngo_owner_{new_id()[:8]}",  # synthetic owner uid (no auth)
        "org_name": n["name"], "mission": n["mission"], "focus_areas": n["focus"],
        "city": n["city"], "country": n["country"], "website": n["site"],
        "contact_email": n["email"], "contact_phone": "",
        "registration_id": f"REG-{new_id()[:6].upper()}",
        "is_approved": True, "rejection_reason": None,
        "causes_count": 0, "volunteers_count": 0,
        "created_at": now_iso(),
    }


def _ai_summary(c: dict) -> str:
    """Lightweight punchy summary so cards look great even before AI runs."""
    return (
        f"{c.get('description','').split('.')[0].strip()}."
        f" Step up — your {(c.get('skills_needed') or ['help'])[0]} can change a life this {c.get('urgency','medium')}-priority initiative."
    )[:260]


def _create_cause(ngo_id: str, ngo_name: str, c: dict) -> dict:
    cid = new_id()
    data = {
        "ngo_id": ngo_id, "ngo_name": ngo_name,
        "title": c["title"], "description": c["desc"],
        "category": c["category"], "location_city": "",
        "location_country": "India",
        "skills_needed": c["skills"], "volunteers_needed": c["needed"],
        "volunteers_joined": 0, "urgency": c["urgency"],
        "status": "open", "ai_summary": _ai_summary({**c, "skills_needed": c["skills"]}),
        "created_at": now_iso(),
    }
    db.collection("causes").document(cid).set(data)
    data["id"] = cid
    return data


def _create_event(ngo_id: str, cause: dict, days_ahead: int, title: str, location: str) -> dict:
    eid = new_id()
    starts = (datetime.now(timezone.utc) + timedelta(days=days_ahead, hours=2)).isoformat()
    ends = (datetime.now(timezone.utc) + timedelta(days=days_ahead, hours=5)).isoformat()
    data = {
        "ngo_id": ngo_id, "cause_id": cause["id"],
        "title": title, "description": f"Open event for {cause['title']}",
        "starts_at": starts, "ends_at": ends, "location": location,
        "max_attendees": cause.get("volunteers_needed") or 20,
        "rsvps": [], "created_at": now_iso(),
    }
    db.collection("events").document(eid).set(data)
    data["id"] = eid
    return data


def _create_volunteer(uid: str, name: str, email: str, city: str, skills: list) -> dict:
    user_ref = db.collection("users").document(uid)
    user_ref.set({
        "email": email, "name": name, "photo_url": None,
        "role": "volunteer", "onboarded": True, "created_at": now_iso(),
    })
    vp_id = new_id()
    db.collection("volunteer_profiles").document(vp_id).set({
        "user_id": uid, "full_name": name, "age": 28,
        "skills": skills, "interests": ["education", "environment"], "languages": ["english", "hindi"],
        "city": city, "country": "India", "availability_hours_per_week": 5,
        "bio": f"{name.split()[0]} loves making impact in {city}.", "phone": "",
        "photo_url": "gradient::from-violet-500 to-fuchsia-500",
        "causes_supported": 0, "hours_logged": 0, "badges": [], "tier_points": 0,
        "created_at": now_iso(),
    })
    return {"uid": uid, "email": email, "name": name, "city": city}


# ---------- Main ----------
async def main():
    print("\n=== Seeding VolunCore ===\n")

    # 1. Admin
    print("1) Admin user…")
    admin = await ensure_admin()

    # 2. NGOs + causes + events
    print("\n2) NGOs + causes…")
    cause_pool = []
    ngos_meta = []
    for n in NGOS:
        nid = new_id()
        db.collection("ngo_profiles").document(nid).set(_ngo_payload(n))
        causes = []
        for c in CAUSES_BY_NGO.get(n["name"], []):
            cause = _create_cause(nid, n["name"], c)
            cause["location_city"] = n["city"]
            db.collection("causes").document(cause["id"]).update({"location_city": n["city"]})
            causes.append(cause)
            cause_pool.append(cause)
        # Update causes_count
        db.collection("ngo_profiles").document(nid).update({"causes_count": len(causes)})
        ngos_meta.append({"id": nid, "name": n["name"], "city": n["city"], "causes": len(causes)})
        print(f"   ✓ {n['name']} ({n['city']}) — {len(causes)} causes")

    # 3. Events — sprinkle across causes
    print("\n3) Upcoming events…")
    event_count = 0
    for i, c in enumerate(cause_pool[:12]):
        days = 2 + (i % 10)  # 2-11 days from now
        title = f"{c['title'].split('—')[0].strip()} — kickoff"
        location = f"{c.get('location_city','')} · meeting point shared on RSVP"
        _create_event(c["ngo_id"], c, days, title, location)
        event_count += 1
    print(f"   ✓ {event_count} events scheduled")

    # 4. Volunteers
    print("\n4) Demo volunteers…")
    for nm, em, city, sk in VOLUNTEER_NAMES:
        uid = f"seed_vol_{new_id()[:8]}"
        _create_volunteer(uid, nm, em, city, sk)
    print(f"   ✓ {len(VOLUNTEER_NAMES)} volunteers seeded")

    # 5. Bump volunteer counts on a few causes (to make them look populated)
    print("\n5) Populating volunteer counts…")
    for c in cause_pool[:6]:
        joined = min(c.get("volunteers_needed", 5), 3)
        db.collection("causes").document(c["id"]).update({"volunteers_joined": joined})
    print("   ✓ done")

    print("\n=== ✅ Seeding complete ===")
    print(f"\nAdmin login:")
    print(f"  email:    {ADMIN_EMAIL}")
    print(f"  password: {ADMIN_PASSWORD}")
    print(f"  uid:      {admin['uid']}")
    print(f"\nNGOs seeded: {len(ngos_meta)}")
    print(f"Causes seeded: {len(cause_pool)}")
    print(f"Events seeded: {event_count}")
    print(f"Volunteers seeded: {len(VOLUNTEER_NAMES)}")


if __name__ == "__main__":
    asyncio.run(main())
