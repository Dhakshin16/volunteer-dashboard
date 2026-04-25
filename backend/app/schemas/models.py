from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# ---------- USER ----------
class UserOut(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    photo_url: Optional[str] = None
    role: Optional[str] = None  # "volunteer" | "ngo" | "admin"
    created_at: Optional[str] = None
    onboarded: bool = False


class RoleSelect(BaseModel):
    role: str


# ---------- VOLUNTEER PROFILE ----------
class VolunteerProfileIn(BaseModel):
    full_name: str
    age: Optional[int] = None
    skills: List[str] = []
    interests: List[str] = []
    languages: List[str] = []
    city: Optional[str] = None
    country: Optional[str] = None
    availability_hours_per_week: Optional[int] = None
    bio: Optional[str] = None
    phone: Optional[str] = None


class VolunteerProfileOut(VolunteerProfileIn):
    id: str
    user_id: str
    impact_points: int = 0
    badges: List[str] = []
    hours_logged: int = 0
    causes_supported: int = 0
    created_at: Optional[str] = None


# ---------- NGO ----------
class NgoProfileIn(BaseModel):
    org_name: str
    mission: str
    focus_areas: List[str] = []
    city: str
    country: str
    website: Optional[str] = None
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    logo_url: Optional[str] = None
    registration_id: Optional[str] = None


class NgoProfileOut(NgoProfileIn):
    id: str
    user_id: str
    is_approved: bool = False
    rejection_reason: Optional[str] = None
    causes_count: int = 0
    volunteers_count: int = 0
    created_at: Optional[str] = None


class AdminApproval(BaseModel):
    approve: bool
    reason: Optional[str] = None


# ---------- CAUSE ----------
class CauseIn(BaseModel):
    title: str
    description: str
    category: str  # "education" | "environment" | "healthcare" | "disaster" | "food" | "animal" | "other"
    location_city: str
    location_country: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    skills_needed: List[str] = []
    volunteers_needed: int = 1
    urgency: str = "medium"  # "low" | "medium" | "high" | "critical"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    cover_image_url: Optional[str] = None
    resource_needs: List[Dict[str, Any]] = []  # [{"item": "blankets", "quantity": 100, "unit": "pcs"}]


class CauseOut(CauseIn):
    id: str
    ngo_id: str
    ngo_name: Optional[str] = None
    status: str = "open"  # open | in_progress | completed | closed
    volunteers_joined: int = 0
    resources_received: List[Dict[str, Any]] = []
    created_at: Optional[str] = None
    ai_summary: Optional[str] = None


# ---------- MATCH ----------
class MatchScore(BaseModel):
    cause_id: str
    score: float
    reason: str
    cause: Optional[Dict[str, Any]] = None


# ---------- VOLUNTEER ENROLLMENT ----------
class EnrollIn(BaseModel):
    cause_id: str
    motivation: Optional[str] = None


class EnrollmentOut(BaseModel):
    id: str
    cause_id: str
    volunteer_id: str
    user_id: str
    status: str = "active"  # active | completed | withdrawn
    hours_logged: int = 0
    motivation: Optional[str] = None
    created_at: Optional[str] = None
    cause: Optional[Dict[str, Any]] = None
    volunteer: Optional[Dict[str, Any]] = None


# ---------- FIELD REPORT ----------
class FieldReportIn(BaseModel):
    cause_id: Optional[str] = None
    text: str
    image_base64: Optional[str] = None  # data URL or raw base64
    voice_transcript: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None


class FieldReportOut(BaseModel):
    id: str
    cause_id: Optional[str] = None
    user_id: str
    text: str
    image_url: Optional[str] = None
    voice_transcript: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None  # {urgency, sentiment, needs, summary}
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    is_crisis: bool = False
    created_at: Optional[str] = None


# ---------- HOURS / DONATIONS ----------
class HoursIn(BaseModel):
    enrollment_id: str
    hours: int
    note: Optional[str] = None


class DonationIn(BaseModel):
    cause_id: str
    type: str  # "money" | "in-kind"
    amount: Optional[float] = None
    currency: Optional[str] = "INR"
    item: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    note: Optional[str] = None


class DonationOut(DonationIn):
    id: str
    user_id: str
    user_name: Optional[str] = None
    created_at: Optional[str] = None


# ---------- EVENT ----------
class EventIn(BaseModel):
    cause_id: str
    title: str
    description: str
    starts_at: str
    ends_at: str
    location: str
    max_attendees: Optional[int] = None


class EventOut(EventIn):
    id: str
    ngo_id: str
    rsvps: List[str] = []
    created_at: Optional[str] = None


# ---------- CHAT ----------
class ChatIn(BaseModel):
    message: str
    image_base64: Optional[str] = None
    session_id: Optional[str] = None


class ChatOut(BaseModel):
    reply: str
    session_id: str


# ---------- IMPACT REPORT ----------
class ImpactReportOut(BaseModel):
    period: str
    headline: str
    summary: str
    highlights: List[str]
    metrics: Dict[str, Any]
    story: str
