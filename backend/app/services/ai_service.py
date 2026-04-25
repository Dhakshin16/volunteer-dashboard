"""AI service powered by Google Gemini (via emergentintegrations) for:
- Multi-turn chat (Auri assistant)
- Volunteer←→cause matching with reasoning
- Field report analysis (text + optional image)
- Weekly impact report generation
- Cause auto-summary
- Crisis detection
"""
import os
import re
import json
import uuid
import base64
import tempfile
from typing import Optional, List, Dict, Any
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from app.core.config import LLM_KEY, LLM_PROVIDER, LLM_MODEL_FAST, LLM_MODEL_PRO


# ---------- helpers ----------
def _strip_fences(s: str) -> str:
    return re.sub(r"```(?:json)?|```", "", s).strip()


def _make_chat(session_id: str, system: str, model: str = None) -> LlmChat:
    chat = LlmChat(
        api_key=LLM_KEY,
        session_id=session_id,
        system_message=system,
    )
    return chat.with_model(LLM_PROVIDER, model or LLM_MODEL_FAST)


def _decode_image(data: str) -> Optional[ImageContent]:
    if not data:
        return None
    try:
        if data.startswith("data:"):
            return ImageContent(image_base64=data.split(",", 1)[1])
        return ImageContent(image_base64=data)
    except Exception:
        return None


# ---------- 1. CHATBOT (Auri) ----------
AURI_SYSTEM = """You are Auri — an AI guide for VolunCore, a smart volunteer coordination platform for social impact.
You help volunteers find meaningful causes, give NGOs strategic advice, summarize field activity, and motivate users with empathy.
Keep replies concise (under 150 words by default), warm, and action-oriented. Always end with a small next step.
If the user mentions an emergency or crisis (people in danger, disaster), tell them to dial local emergency numbers and report via the Field Report tool.

User context: {context}
"""


async def chat_with_auri(session_id: str, message: str, image_b64: Optional[str], context: str) -> str:
    chat = _make_chat(session_id, AURI_SYSTEM.format(context=context or "new user"))
    parts: list = []
    img = _decode_image(image_b64)
    if img:
        parts.append(img)
    try:
        msg = UserMessage(text=message, file_contents=parts) if parts else UserMessage(text=message)
        return await chat.send_message(msg)
    except Exception as e:
        return f"I'm having a hiccup connecting to Auri right now. Please try again. ({e})"


# ---------- 2. VOLUNTEER ↔ CAUSE MATCHING ----------
MATCH_SYSTEM = """You are an expert volunteer-matching engine.
Given a volunteer profile and a list of open causes, score each cause 0–1 for how well it fits the volunteer.
Consider: skill overlap, location proximity, urgency, interest alignment, availability.
Return a STRICT JSON array (no prose) of objects: [{"cause_id": "...", "score": 0.93, "reason": "30-word reason"}].
Return ONLY the JSON array.
"""


async def match_volunteer_to_causes(volunteer: dict, causes: List[dict]) -> List[dict]:
    if not causes:
        return []
    payload = {
        "volunteer": {
            "name": volunteer.get("full_name"),
            "skills": volunteer.get("skills", []),
            "interests": volunteer.get("interests", []),
            "languages": volunteer.get("languages", []),
            "city": volunteer.get("city"),
            "country": volunteer.get("country"),
            "availability_hours_per_week": volunteer.get("availability_hours_per_week"),
            "bio": volunteer.get("bio"),
        },
        "causes": [
            {
                "cause_id": c["id"],
                "title": c.get("title"),
                "category": c.get("category"),
                "city": c.get("location_city"),
                "country": c.get("location_country"),
                "skills_needed": c.get("skills_needed", []),
                "urgency": c.get("urgency"),
                "description_snippet": (c.get("description") or "")[:200],
            }
            for c in causes[:30]
        ],
    }
    chat = _make_chat(f"match-{uuid.uuid4()}", MATCH_SYSTEM, LLM_MODEL_FAST)
    try:
        resp = await chat.send_message(UserMessage(text=json.dumps(payload)))
        cleaned = _strip_fences(resp)
        # find JSON array
        m = re.search(r"\[[\s\S]*\]", cleaned)
        if m:
            cleaned = m.group(0)
        arr = json.loads(cleaned)
        # normalize
        out = []
        for item in arr:
            if not isinstance(item, dict):
                continue
            cid = item.get("cause_id")
            if not cid:
                continue
            out.append({
                "cause_id": cid,
                "score": float(item.get("score", 0)),
                "reason": str(item.get("reason", ""))[:300],
            })
        out.sort(key=lambda x: x["score"], reverse=True)
        return out
    except Exception:
        # fallback: simple skill-overlap score
        out = []
        v_skills = set(s.lower() for s in volunteer.get("skills", []))
        v_city = (volunteer.get("city") or "").lower()
        for c in causes:
            c_skills = set(s.lower() for s in c.get("skills_needed", []))
            overlap = len(v_skills & c_skills)
            same_city = (c.get("location_city") or "").lower() == v_city
            score = min(1.0, 0.4 + 0.15 * overlap + (0.2 if same_city else 0) + (0.1 if c.get("urgency") in ["high", "critical"] else 0))
            out.append({"cause_id": c["id"], "score": round(score, 2), "reason": f"Skill overlap: {overlap}; same city: {same_city}"})
        out.sort(key=lambda x: x["score"], reverse=True)
        return out


# ---------- 3. FIELD REPORT ANALYSIS ----------
REPORT_SYSTEM = """You analyze field reports from volunteers/NGOs.
Return STRICT JSON only with keys:
  "urgency": one of low|medium|high|critical,
  "sentiment": one of positive|neutral|concerned|distressed,
  "summary": 30-word neutral summary,
  "needs": list of resource keywords (max 6),
  "is_crisis": boolean (true if life-threatening / disaster / abuse),
  "category": one of education|environment|healthcare|disaster|food|animal|other,
  "action_recommendation": short next-step (under 30 words).
No prose, no fences."""


async def analyze_field_report(text: str, image_b64: Optional[str] = None) -> Dict[str, Any]:
    chat = _make_chat(f"report-{uuid.uuid4()}", REPORT_SYSTEM, LLM_MODEL_FAST)
    parts: list = []
    img = _decode_image(image_b64)
    if img:
        parts.append(img)
    try:
        msg = UserMessage(text=text or "(image-only report)", file_contents=parts) if parts else UserMessage(text=text)
        resp = await chat.send_message(msg)
        cleaned = _strip_fences(resp)
        m = re.search(r"\{[\s\S]*\}", cleaned)
        if m:
            cleaned = m.group(0)
        data = json.loads(cleaned)
        return {
            "urgency": str(data.get("urgency", "medium")),
            "sentiment": str(data.get("sentiment", "neutral")),
            "summary": str(data.get("summary", ""))[:400],
            "needs": data.get("needs", [])[:8] if isinstance(data.get("needs"), list) else [],
            "is_crisis": bool(data.get("is_crisis", False)),
            "category": str(data.get("category", "other")),
            "action_recommendation": str(data.get("action_recommendation", ""))[:300],
        }
    except Exception as e:
        return {
            "urgency": "medium", "sentiment": "neutral",
            "summary": (text or "")[:200], "needs": [], "is_crisis": False,
            "category": "other", "action_recommendation": "",
            "error": str(e),
        }


# ---------- 4. CAUSE AI-SUMMARY ----------
CAUSE_SUM_SYSTEM = """Write a punchy 2-sentence pitch for a volunteer cause. Tone: warm, urgent, action-driven.
Return ONLY the pitch text, no markdown."""


async def summarize_cause(cause: dict) -> str:
    chat = _make_chat(f"sum-{uuid.uuid4()}", CAUSE_SUM_SYSTEM, LLM_MODEL_FAST)
    try:
        info = json.dumps({
            "title": cause.get("title"),
            "category": cause.get("category"),
            "description": cause.get("description"),
            "city": cause.get("location_city"),
            "skills_needed": cause.get("skills_needed"),
            "urgency": cause.get("urgency"),
        })
        return (await chat.send_message(UserMessage(text=info))).strip()
    except Exception:
        return cause.get("title", "")


# ---------- 5. WEEKLY IMPACT REPORT ----------
REPORT_GEN_SYSTEM = """You are a social-impact storyteller. Given raw activity data, write a beautiful weekly report.
Return STRICT JSON with keys:
  "headline": 8-word inspiring headline,
  "summary": 60-word factual summary,
  "highlights": list of 3 to 5 short bullet strings,
  "story": 120-word narrative story celebrating impact (use 'you' or volunteer name).
No prose, no markdown fences outside JSON."""


async def generate_impact_report(period: str, stats: dict, volunteer_name: str = "You") -> dict:
    chat = _make_chat(f"impact-{uuid.uuid4()}", REPORT_GEN_SYSTEM, LLM_MODEL_PRO)
    try:
        resp = await chat.send_message(UserMessage(text=json.dumps({
            "period": period, "volunteer_name": volunteer_name, "stats": stats,
        })))
        cleaned = _strip_fences(resp)
        m = re.search(r"\{[\s\S]*\}", cleaned)
        if m:
            cleaned = m.group(0)
        data = json.loads(cleaned)
        return {
            "headline": data.get("headline", "Your Impact This Week"),
            "summary": data.get("summary", ""),
            "highlights": data.get("highlights", []) if isinstance(data.get("highlights"), list) else [],
            "story": data.get("story", ""),
        }
    except Exception:
        return {
            "headline": "Your Impact This Week",
            "summary": f"You logged {stats.get('hours', 0)} hours and contributed to {stats.get('causes', 0)} causes.",
            "highlights": [],
            "story": "Every hour you give ripples outward. Keep going — your community is brighter for it.",
        }


# ---------- 6. SKILL EXTRACTION ----------
SKILL_SYSTEM = """Extract a list of 3-8 concrete volunteer-relevant skills from the user's bio. 
Return STRICT JSON: {"skills": ["...", "..."]}. Only short lowercase phrases, e.g., 'teaching', 'first aid', 'graphic design'."""


async def extract_skills(bio: str) -> List[str]:
    chat = _make_chat(f"skills-{uuid.uuid4()}", SKILL_SYSTEM, LLM_MODEL_FAST)
    try:
        resp = await chat.send_message(UserMessage(text=bio))
        cleaned = _strip_fences(resp)
        m = re.search(r"\{[\s\S]*\}", cleaned)
        if m:
            cleaned = m.group(0)
        data = json.loads(cleaned)
        return [s.lower() for s in data.get("skills", []) if isinstance(s, str)][:8]
    except Exception:
        return []


# ---------- 7. VOICE TRANSCRIPT POLISH ----------
VOICE_SYSTEM = """You polish raw voice-to-text transcripts into clean field reports.
Fix grammar, remove filler, keep the user's voice. Return ONLY the cleaned text, max 200 words."""


async def polish_voice(transcript: str) -> str:
    if not transcript or len(transcript.strip()) < 5:
        return transcript
    chat = _make_chat(f"voice-{uuid.uuid4()}", VOICE_SYSTEM, LLM_MODEL_FAST)
    try:
        return (await chat.send_message(UserMessage(text=transcript))).strip()
    except Exception:
        return transcript
