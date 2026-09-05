from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.services.face_service import face_service


router = APIRouter(
    prefix="/api/face",
    tags=["Face Recognition"],
)


# ============================================================
# REGISTER FACE
# ============================================================

@router.post("/register")
async def register_face(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Register or update an employee's face biometric.

    Endpoint:
        POST /api/face/register?user_id=123

    Content-Type:
        multipart/form-data

    Field:
        file=<image>
    """

    # --------------------------------------------------------
    # Validate uploaded file
    # --------------------------------------------------------

    if not file.content_type:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type.",
        )

    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid image file.",
        )

    # --------------------------------------------------------
    # Validate employee
    # --------------------------------------------------------

    user = db.execute(
        text(
            """
            SELECT
                id,
                name,
                email,
                role,
                is_active
            FROM public.users
            WHERE id = :user_id
            LIMIT 1
            """
        ),
        {
            "user_id": user_id,
        },
    ).mappings().first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"Employee with ID {user_id} was not found.",
        )

    if user["role"] != "employee":
        raise HTTPException(
            status_code=400,
            detail="Face registration is available only for employees.",
        )

    if user["is_active"] is False:
        raise HTTPException(
            status_code=400,
            detail="This employee account is inactive.",
        )

    # --------------------------------------------------------
    # Read image
    # --------------------------------------------------------

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="The captured image is empty.",
        )

    # Basic size protection
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image is too large. Maximum allowed size is 10 MB.",
        )

    # --------------------------------------------------------
    # Register biometric
    # --------------------------------------------------------

    try:
        result = face_service.register_face(
            db=db,
            user_id=user_id,
            image_bytes=image_bytes,
        )

        return {
            "success": True,
            "message": "Face registered successfully.",
            "user_id": user_id,
            "employee_name": user["name"],
            "employee_email": user["email"],
            **result,
        }

    except ValueError as exc:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Face registration failed: {str(exc)}",
        )


# ============================================================
# VERIFY FACE
# ============================================================

@router.post("/verify")
async def verify_face(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Verify a live camera face against registered employee faces.

    Endpoint:
        POST /api/face/verify

    Content-Type:
        multipart/form-data

    Field:
        file=<image>
    """

    # --------------------------------------------------------
    # Validate uploaded file
    # --------------------------------------------------------

    if not file.content_type:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type.",
        )

    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid image file.",
        )

    # --------------------------------------------------------
    # Read image
    # --------------------------------------------------------

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="The captured image is empty.",
        )

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image is too large. Maximum allowed size is 10 MB.",
        )

    # --------------------------------------------------------
    # Verify face
    # --------------------------------------------------------

    try:
        result = face_service.verify_face(
            db=db,
            image_bytes=image_bytes,
        )

        return {
            "success": True,
            **result,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Face verification failed: {str(exc)}",
        )


# ============================================================
# FACE ATTENDANCE
# ============================================================

@router.post("/attendance")
async def face_attendance(
    user_id: int,
    latitude: float,
    longitude: float,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Compatibility endpoint for face-based attendance.

    The main frontend currently uses:
        POST /api/attendance/check-in

    This endpoint is retained for compatibility.
    """

    # --------------------------------------------------------
    # Verify employee
    # --------------------------------------------------------

    employee = db.execute(
        text(
            """
            SELECT
                id,
                name,
                email,
                role,
                is_active
            FROM public.users
            WHERE id = :user_id
            LIMIT 1
            """
        ),
        {
            "user_id": user_id,
        },
    ).mappings().first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found.",
        )

    if employee["role"] != "employee":
        raise HTTPException(
            status_code=400,
            detail="Attendance is available only for employees.",
        )

    if employee["is_active"] is False:
        raise HTTPException(
            status_code=400,
            detail="Employee account is inactive.",
        )

    # --------------------------------------------------------
    # Find active workplace within allowed radius
    # --------------------------------------------------------

    location = db.execute(
        text(
            """
            SELECT
                id,
                name,
                latitude,
                longitude,
                radius_meters,
                ST_Distance(
                    coordinates,
                    ST_SetSRID(
                        ST_MakePoint(
                            :longitude,
                            :latitude
                        ),
                        4326
                    )::geography
                ) AS distance_meters
            FROM public.locations
            WHERE is_active = TRUE
              AND ST_DWithin(
                    coordinates,
                    ST_SetSRID(
                        ST_MakePoint(
                            :longitude,
                            :latitude
                        ),
                        4326
                    )::geography,
                    radius_meters
              )
            ORDER BY distance_meters ASC
            LIMIT 1
            """
        ),
        {
            "latitude": latitude,
            "longitude": longitude,
        },
    ).mappings().first()

    if not location:
        raise HTTPException(
            status_code=403,
            detail="You are outside the allowed attendance location.",
        )

    distance_meters = float(
        location["distance_meters"]
    )

    # --------------------------------------------------------
    # Prevent duplicate attendance
    # --------------------------------------------------------

    existing = db.execute(
        text(
            """
            SELECT id
            FROM public.attendance
            WHERE user_id = :user_id
              AND attendance_date = CURRENT_DATE
              AND status = 'Present'
            LIMIT 1
            """
        ),
        {
            "user_id": user_id,
        },
    ).first()

    if existing:
        return {
            "success": True,
            "status": "Already Present",
            "message": "Attendance has already been marked for today.",
            "attendance_id": existing.id,
            "user_id": user_id,
            "employee_name": employee["name"],
            "employee_email": employee["email"],
            "location": location["name"],
            "distance_meters": round(
                distance_meters,
                2,
            ),
            "allowed_radius_meters": location["radius_meters"],
        }

    # --------------------------------------------------------
    # Insert attendance
    # --------------------------------------------------------

    attendance = db.execute(
        text(
            """
            INSERT INTO public.attendance
            (
                user_id,
                attendance_date,
                check_in,
                status,
                latitude,
                longitude,
                location_id
            )
            VALUES
            (
                :user_id,
                CURRENT_DATE,
                CURRENT_TIMESTAMP,
                'Present',
                :latitude,
                :longitude,
                :location_id
            )
            RETURNING id
            """
        ),
        {
            "user_id": user_id,
            "latitude": latitude,
            "longitude": longitude,
            "location_id": location["id"],
        },
    ).first()

    db.commit()

    return {
        "success": True,
        "status": "Present",
        "message": "Attendance marked successfully.",
        "attendance_id": attendance.id if attendance else None,
        "user_id": user_id,
        "employee_name": employee["name"],
        "employee_email": employee["email"],
        "location": location["name"],
        "distance_meters": round(
            distance_meters,
            2,
        ),
        "allowed_radius_meters": location["radius_meters"],
        "latitude": latitude,
        "longitude": longitude,
    }