"""Central config — loads .env and exposes constants."""
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", str(ROOT_DIR / "firebase-admin.json"))
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ADMIN_EMAILS = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()]

LLM_MODEL_FAST = "gemini-2.5-flash"
LLM_MODEL_PRO = "gemini-2.5-pro"
