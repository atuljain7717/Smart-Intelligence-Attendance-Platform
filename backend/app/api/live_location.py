from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/api/live-location",
    tags=["Live Location"],
)


# ============================================================
# SCHEMAS
# ============================================================

class LiveLocationRequest(BaseModel):
    """
    GPS data sent by the employee's browser/device.

    user_id is optional because the authenticated user's ID
    should normally be used by the backend.
    """

    user_id: Optional[int] = Field(default=None, gt=0)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

    # Accept the frontend field used by EmployeeAttendance.tsx.
    accuracy_meters: Optional[float] = Field(default=None, ge=0)

    # Also accept "accuracy" for backwards compatibility.
    accuracy: Optional[float] = Field(default=None, ge=0)

    speed: Optional[float] = Field(default=None, ge=0)
    heading: Optional[float] = Field(default=None, ge=0, le=360)


class LiveLocationResponse(BaseModel):
    success: bool
    message: str
    user_id: int
    latitude: float
    longitude: float
    timestamp: datetime


# ============================================================
# HELPERS
# ============================================================

def get_authenticated_user_id(current_user) -> Optional[int]:
    """
    The existing authentication dependency in this project
    returns a dictionary in the attendance API.

    Support both dictionary-style and object-style users so
    this route remains robust.
    """

    if isinstance(current_user, dict):
        value = current_user.get("id")

        if value is not None:
            return int(value)

    value = getattr(current_user, "id", None)

    if value is not None:
        return int(value)

    return None


def get_authenticated_user_role(current_user) -> Optional[str]:
    if isinstance(current_user, dict):
        return current_user.get("role")

    return getattr(current_user, "role", None)


def is_admin_or_manager(current_user) -> bool:
    role = get_authenticated_user_role(current_user)

    if not role:
        return False

    return str(role).lower() in {
        "admin",
        "manager",
    }


def resolve_accuracy(data: LiveLocationRequest) -> Optional[float]:
    """
    Prefer accuracy_meters because that is what the employee
    frontend sends. Fall back to accuracy for compatibility.
    """

    if data.accuracy_meters is not None:
        return data.accuracy_meters

    return data.accuracy


def resolve_user_id(
    data: LiveLocationRequest,
    current_user,
) -> int:
    """
    For normal employees, always use the authenticated user ID.

    Administrators/managers may optionally send another user_id
    for controlled administrative operations.
    """

    authenticated_id = get_authenticated_user_id(current_user)

    if authenticated_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to identify the authenticated user.",
        )

    if is_admin_or_manager(current_user):
        return int(data.user_id or authenticated_id)

    return authenticated_id


# ============================================================
# HEALTH
# ============================================================

@router.get("/health")
def live_location_health():
    return {
        "success": True,
        "service": "live-location",
        "status": "online",
        "storage": "employee_locations",
    }


# ============================================================
# GET EMPLOYEES
# ============================================================

@router.get("/employees")
def get_live_location_employees(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Return active employees for the Live Location screen.

    This endpoint is intentionally separate from live GPS data.
    It allows the admin screen to know which employees exist
    even before their first GPS update.
    """

    query = text(
        """
        SELECT
            u.id,
            u.name AS full_name,
            u.email,
            u.role,
            u.is_active,
            u.location_id,
            l.name AS location_name
        FROM public.users u
        LEFT JOIN public.locations l
            ON l.id = u.location_id
        WHERE COALESCE(u.is_active, TRUE) = TRUE
        ORDER BY u.name ASC
        """
    )

    try:
        results = db.execute(query).mappings().all()

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to retrieve employees: {str(exc)}",
        )

    return {
        "success": True,
        "count": len(results),
        "data": [dict(row) for row in results],
    }


# ============================================================
# UPDATE LIVE LOCATION
# ============================================================

@router.post(
    "/update",
    response_model=LiveLocationResponse,
    status_code=status.HTTP_200_OK,
)
def update_live_location(
    data: LiveLocationRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Save the latest GPS position in employee_locations.

    Normal employees can only update their own location.

    Administrators/managers may provide another user_id when
    required by an administrative workflow.
    """

    user_id = resolve_user_id(data, current_user)

    # --------------------------------------------------------
    # Verify user exists and is active
    # --------------------------------------------------------

    user_query = text(
        """
        SELECT
            id,
            is_active
        FROM public.users
        WHERE id = :user_id
        LIMIT 1
        """
    )

    user = db.execute(
        user_query,
        {"user_id": user_id},
    ).mappings().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if user["is_active"] is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This employee account is inactive.",
        )

    # --------------------------------------------------------
    # Only allow location updates during an active attendance
    # session.
    # --------------------------------------------------------

    attendance_query = text(
        """
        SELECT id
        FROM public.attendance
        WHERE user_id = :user_id
          AND attendance_date = CURRENT_DATE
          AND check_out IS NULL
        ORDER BY check_in DESC
        LIMIT 1
        """
    )

    active_attendance = db.execute(
        attendance_query,
        {"user_id": user_id},
    ).fetchone()

    if not active_attendance:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No active attendance session found. Check in before sending live GPS.",
        )

    # --------------------------------------------------------
    # Timestamp
    # --------------------------------------------------------

    now = datetime.now(timezone.utc)

    accuracy = resolve_accuracy(data)

    # --------------------------------------------------------
    # Upsert employee location
    #
    # This intentionally uses employee_locations because the
    # attendance API and live operations API already use this
    # table.
    # --------------------------------------------------------

    try:
        update_query = text(
            """
            UPDATE public.employee_locations
            SET
                latitude = :latitude,
                longitude = :longitude,
                accuracy_meters = :accuracy_meters,
                updated_at = :updated_at
            WHERE user_id = :user_id
            """
        )

        result = db.execute(
            update_query,
            {
                "user_id": user_id,
                "latitude": data.latitude,
                "longitude": data.longitude,
                "accuracy_meters": accuracy,
                "updated_at": now,
            },
        )

        # ----------------------------------------------------
        # No existing row -> insert
        # ----------------------------------------------------

        if result.rowcount == 0:
            insert_query = text(
                """
                INSERT INTO public.employee_locations
                (
                    user_id,
                    latitude,
                    longitude,
                    accuracy_meters,
                    updated_at
                )
                VALUES
                (
                    :user_id,
                    :latitude,
                    :longitude,
                    :accuracy_meters,
                    :updated_at
                )
                """
            )

            db.execute(
                insert_query,
                {
                    "user_id": user_id,
                    "latitude": data.latitude,
                    "longitude": data.longitude,
                    "accuracy_meters": accuracy,
                    "updated_at": now,
                },
            )

        db.commit()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to save live location: {str(exc)}",
        )

    return LiveLocationResponse(
        success=True,
        message="Live location updated successfully.",
        user_id=user_id,
        latitude=data.latitude,
        longitude=data.longitude,
        timestamp=now,
    )


# ============================================================
# GET ONE USER'S LIVE LOCATION
# ============================================================

@router.get("/{user_id}")
def get_live_location(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Return one employee's latest GPS position.
    """

    if user_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID.",
        )

    query = text(
        """
        SELECT
            el.user_id,
            u.name AS full_name,
            u.email,
            el.latitude,
            el.longitude,
            el.accuracy_meters,
            el.updated_at
        FROM public.employee_locations el
        LEFT JOIN public.users u
            ON u.id = el.user_id
        WHERE el.user_id = :user_id
        LIMIT 1
        """
    )

    try:
        result = db.execute(
            query,
            {"user_id": user_id},
        ).mappings().first()

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to retrieve live location: {str(exc)}",
        )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Live location not found.",
        )

    return {
        "success": True,
        "data": dict(result),
    }


# ============================================================
# GET ALL LIVE LOCATIONS
# ============================================================

@router.get("/")
def get_all_live_locations(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Return the latest GPS position of employees who currently
    have a location record.

    The frontend can refresh this endpoint periodically.
    """

    query = text(
        """
        SELECT
            el.user_id,
            u.name AS full_name,
            u.email,
            u.role,
            u.is_active,
            u.location_id,
            l.name AS location_name,

            el.latitude,
            el.longitude,
            el.accuracy_meters,
            el.updated_at,

            EXTRACT(
                EPOCH FROM (
                    CURRENT_TIMESTAMP - el.updated_at
                )
            ) AS seconds_since_update

        FROM public.employee_locations el

        LEFT JOIN public.users u
            ON u.id = el.user_id

        LEFT JOIN public.locations l
            ON l.id = u.location_id

        WHERE COALESCE(u.is_active, TRUE) = TRUE

        ORDER BY el.updated_at DESC
        """
    )

    try:
        results = db.execute(query).mappings().all()

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to retrieve live locations: {str(exc)}",
        )

    locations = []

    for row in results:
        item = dict(row)

        seconds = item.get("seconds_since_update")

        if seconds is not None:
            seconds = float(seconds)

        item["seconds_since_update"] = seconds

        # Consider telemetry live for two minutes.
        item["is_live"] = (
            seconds is not None
            and seconds <= 120
        )

        locations.append(item)

    return {
        "success": True,
        "count": len(locations),
        "data": locations,
    }


# ============================================================
# STOP LIVE LOCATION
# ============================================================

@router.post("/{user_id}/stop")
def stop_live_location(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Stop an employee's live GPS session by removing the
    employee_locations record.

    Normal employees can only stop their own tracking.
    Administrators/managers may stop another employee.
    """

    if user_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID.",
        )

    authenticated_id = get_authenticated_user_id(current_user)

    if authenticated_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to identify the authenticated user.",
        )

    if not is_admin_or_manager(current_user):
        if int(authenticated_id) != int(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only stop your own live location.",
            )

    try:
        query = text(
            """
            DELETE FROM public.employee_locations
            WHERE user_id = :user_id
            """
        )

        result = db.execute(
            query,
            {"user_id": user_id},
        )

        db.commit()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to stop live location: {str(exc)}",
        )

    return {
        "success": True,
        "message": (
            "Live location stopped successfully."
            if result.rowcount
            else "Live location was already stopped."
        ),
        "user_id": user_id,
    }


# ============================================================
# DELETE / CLEAR USER LIVE LOCATION
# ============================================================

@router.delete("/{user_id}")
def delete_live_location(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Backwards-compatible DELETE endpoint.
    """

    if user_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID.",
        )

    authenticated_id = get_authenticated_user_id(current_user)

    if authenticated_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to identify the authenticated user.",
        )

    if not is_admin_or_manager(current_user):
        if int(authenticated_id) != int(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own live location.",
            )

    try:
        query = text(
            """
            DELETE FROM public.employee_locations
            WHERE user_id = :user_id
            """
        )

        result = db.execute(
            query,
            {"user_id": user_id},
        )

        db.commit()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to delete live location: {str(exc)}",
        )

    return {
        "success": True,
        "message": "Live location removed successfully.",
        "user_id": user_id,
        "removed": result.rowcount > 0,
    }