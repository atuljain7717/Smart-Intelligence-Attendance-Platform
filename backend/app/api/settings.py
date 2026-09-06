from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db


router = APIRouter(
    prefix="/api/settings",
    tags=["Settings"],
)


class SettingsUpdate(BaseModel):
    organization_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )

    default_location: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )

    timezone: str = Field(
        ...,
        min_length=1,
        max_length=100,
    )

    notifications_enabled: bool
    location_tracking_enabled: bool
    face_recognition_enabled: bool


def require_admin(current_user: dict) -> None:
    role = str(current_user.get("role", "")).lower()

    if role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required.",
        )


# ============================================================
# GET SETTINGS
# ============================================================

@router.get("")
def get_settings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    try:
        row = db.execute(
            text(
                """
                SELECT
                    id,
                    organization_name,
                    default_location,
                    timezone,
                    notifications_enabled,
                    location_tracking_enabled,
                    face_recognition_enabled,
                    updated_by,
                    updated_at
                FROM public.platform_settings
                ORDER BY id
                LIMIT 1
                """
            )
        ).mappings().first()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Platform settings not found.",
            )

        return {
            "success": True,
            "settings": dict(row),
        }

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        print(f"GET /api/settings error: {exc}")

        raise HTTPException(
            status_code=500,
            detail="Unable to load platform settings.",
        )


# ============================================================
# UPDATE SETTINGS
# ============================================================

@router.put("")
def update_settings(
    data: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    try:
        row = db.execute(
            text(
                """
                UPDATE public.platform_settings
                SET
                    organization_name = :organization_name,
                    default_location = :default_location,
                    timezone = :timezone,
                    notifications_enabled = :notifications_enabled,
                    location_tracking_enabled = :location_tracking_enabled,
                    face_recognition_enabled = :face_recognition_enabled,
                    updated_by = :updated_by,
                    updated_at = CURRENT_TIMESTAMP

                WHERE id = (
                    SELECT id
                    FROM public.platform_settings
                    ORDER BY id
                    LIMIT 1
                )

                RETURNING
                    id,
                    organization_name,
                    default_location,
                    timezone,
                    notifications_enabled,
                    location_tracking_enabled,
                    face_recognition_enabled,
                    updated_by,
                    updated_at
                """
            ),
            {
                "organization_name": data.organization_name.strip(),
                "default_location": data.default_location.strip(),
                "timezone": data.timezone.strip(),
                "notifications_enabled": data.notifications_enabled,
                "location_tracking_enabled": data.location_tracking_enabled,
                "face_recognition_enabled": data.face_recognition_enabled,
                "updated_by": current_user["id"],
            },
        ).mappings().first()

        if not row:
            db.rollback()

            raise HTTPException(
                status_code=404,
                detail="Platform settings not found.",
            )

        db.commit()

        return {
            "success": True,
            "message": "Settings updated successfully.",
            "settings": dict(row),
        }

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        print(f"PUT /api/settings error: {exc}")

        raise HTTPException(
            status_code=500,
            detail="Unable to update platform settings.",
        )