import os
from pathlib import Path

from dotenv import load_dotenv


# =========================
# BASE DIRECTORY
# =========================

BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env")


# =========================
# APPLICATION SETTINGS
# =========================

class Settings:

    # =========================
    # DATABASE
    # =========================

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        ""
    )

    # =========================
    # JWT AUTHENTICATION
    # =========================

    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "smart-attendance-development-secret-key"
    )

    JWT_ALGORITHM: str = os.getenv(
        "JWT_ALGORITHM",
        "HS256"
    )

    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv(
            "ACCESS_TOKEN_EXPIRE_MINUTES",
            "60"
        )
    )

    # =========================
    # FRONTEND
    # =========================

    FRONTEND_URL: str = os.getenv(
        "FRONTEND_URL",
        "http://localhost:5173"
    )

    # =========================
    # EMAIL / SMTP
    # =========================

    MAIL_USERNAME: str = os.getenv(
        "MAIL_USERNAME",
        ""
    )

    MAIL_PASSWORD: str = os.getenv(
        "MAIL_PASSWORD",
        ""
    )

    MAIL_FROM: str = os.getenv(
        "MAIL_FROM",
        ""
    )

    MAIL_SERVER: str = os.getenv(
        "MAIL_SERVER",
        "smtp.gmail.com"
    )

    MAIL_PORT: int = int(
        os.getenv(
            "MAIL_PORT",
            "587"
        )
    )

    # =========================
    # GOOGLE OAUTH
    # =========================

    GOOGLE_CLIENT_ID: str = os.getenv(
        "GOOGLE_CLIENT_ID",
        ""
    )

    GOOGLE_CLIENT_SECRET: str = os.getenv(
        "GOOGLE_CLIENT_SECRET",
        ""
    )

    GOOGLE_REDIRECT_URI: str = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8000/api/auth/google/callback"
    )


# =========================
# SETTINGS INSTANCE
# =========================

settings = Settings()