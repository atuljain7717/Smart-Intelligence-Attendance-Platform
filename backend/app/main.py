from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings

from app.api.attendance import router as attendance_router
from app.api.users import router as users_router
from app.api.dashboard import router as dashboard_router
from app.api.locations import router as locations_router
from app.api.auth import router as auth_router
from app.api.profile import router as profile_router
from app.api.reports import router as reports_router
from app.api.live_location import router as live_location_router
from app.api.face_recognition import router as face_router
from app.api.audit_logs import router as audit_logs_router
from app.api.settings import router as settings_router


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="Smart Attendance Intelligence API",
    version="1.0.0",
    description="AI-powered attendance and location management platform",
)


# ============================================================
# SESSION MIDDLEWARE
# ============================================================
# Required by Authlib for storing OAuth state between:
#
# /api/auth/google/login
#              ↓
#           Google
#              ↓
# /api/auth/google/callback
#
# IMPORTANT:
# SECRET_KEY must remain the same between server restarts.

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    same_site="lax",
    https_only=False,
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ROUTERS
# ============================================================

app.include_router(attendance_router)
app.include_router(users_router)
app.include_router(dashboard_router)
app.include_router(locations_router)
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(reports_router)

# Live employee GPS location API
app.include_router(live_location_router)

# Face recognition API
app.include_router(face_router)

# Audit logs API
app.include_router(audit_logs_router)

# Platform settings API
app.include_router(settings_router)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Smart Attendance Intelligence API",
        "status": "running",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "database": "connected",
    }