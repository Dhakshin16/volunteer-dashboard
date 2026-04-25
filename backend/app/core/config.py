"""Central config — loads .env and exposes constants."""
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", str(ROOT_DIR / "firebase-admin.json"))
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "smart-hospital-system-5d2b2")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")
ADMIN_EMAILS = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()]

# Use the user-provided Gemini key if available, else fall back to Emergent universal key
LLM_KEY = GEMINI_API_KEY or EMERGENT_LLM_KEY
LLM_PROVIDER = "gemini" if GEMINI_API_KEY else "openai"
LLM_MODEL_FAST = "gemini-2.5-flash" if GEMINI_API_KEY else "gpt-4o-mini"
LLM_MODEL_PRO = "gemini-2.5-pro" if GEMINI_API_KEY else "gpt-4o"
