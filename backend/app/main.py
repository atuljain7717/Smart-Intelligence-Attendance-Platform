from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.database.schema import ensure_schema

# API routers
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
# DATABASE / SCHEMA STARTUP
# ============================================================

@app.on_event("startup")
def startup_schema_check():
    try:
        ensure_schema()
        print("Database schema check completed successfully.")
    except Exception as exc:
        print(f"Database schema check failed: {exc}")
        raise


# ============================================================
# SESSION MIDDLEWARE
# ============================================================

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    same_site="lax",
    https_only=False,
)


# ============================================================
# CORS
# ============================================================

# Supports both common Vite development URLs:
# http://localhost:5173
# http://127.0.0.1:5173

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Add configured frontend URL if it exists and isn't duplicated.
frontend_url = getattr(settings, "FRONTEND_URL", None)

if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ROUTERS
# ============================================================

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profile_router)

app.include_router(attendance_router)
app.include_router(dashboard_router)
app.include_router(locations_router)
app.include_router(reports_router)
app.include_router(live_location_router)
app.include_router(face_router)
app.include_router(audit_logs_router)

# Platform Settings
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