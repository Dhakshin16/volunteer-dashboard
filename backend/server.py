"""VolunCore FastAPI entrypoint. All routes prefixed with /api."""
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Initialize Firebase Admin SDK + Firestore
from app.core import firebase  # noqa: F401

# Routers
from app.routes import (
    user, volunteer, ngo, cause, enrollment, report, donation, event, chat, admin, auth,
    notification,
)

app = FastAPI(title="VolunCore API", version="2.0.0")
api = APIRouter(prefix="/api")

api.include_router(auth.router, prefix="/auth", tags=["Auth"])
api.include_router(user.router, prefix="/user", tags=["User"])
api.include_router(volunteer.router, prefix="/volunteer", tags=["Volunteer"])
api.include_router(ngo.router, prefix="/ngo", tags=["NGO"])
api.include_router(cause.router, prefix="/causes", tags=["Causes"])
api.include_router(enrollment.router, prefix="/enrollments", tags=["Enrollments"])
api.include_router(report.router, prefix="/reports", tags=["Reports"])
api.include_router(donation.router, prefix="/donations", tags=["Donations"])
api.include_router(event.router, prefix="/events", tags=["Events"])
api.include_router(chat.router, prefix="/chat", tags=["Chat"])
api.include_router(admin.router, prefix="/admin", tags=["Admin"])
api.include_router(notification.router, prefix="/notifications", tags=["Notifications"])


@api.get("/")
def root():
    return {"app": "VolunCore", "version": "2.0.0", "status": "running"}


@api.get("/health")
def health():
    return {"ok": True}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Background scheduler for reminder notifications
from app.services import scheduler  # noqa: E402


@app.on_event("startup")
async def _on_startup():
    scheduler.start()


@app.on_event("shutdown")
async def _on_shutdown():
    await scheduler.stop()
