from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/api/attendance",
    tags=["Attendance"],
)


# =========================================================
# REQUEST MODEL
# =========================================================

class CheckInRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    location_id: int


# =========================================================
# ADMIN CHECK
# =========================================================

def require_admin(current_user: dict):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )


# =========================================================
# SERIALIZER
# =========================================================

def serialize_attendance(record):
    return {
        "id": record["id"],
        "user_id": record["user_id"],
        "employee_name": record["employee_name"],
        "employee_email": record["employee_email"],
        "attendance_data": (
            str(record["attendance_data"])
            if record["attendance_data"]
            else None
        ),
        "check_in": (
            record["check_in"].isoformat()
            if record["check_in"]
            else None
        ),
        "check_out": (
            record["check_out"].isoformat()
            if record["check_out"]
            else None
        ),
        "status": record["status"],
        "latitude": (
            float(record["latitude"])
            if record["latitude"] is not None
            else None
        ),
        "longitude": (
            float(record["longitude"])
            if record["longitude"] is not None
            else None
        ),
        "location_id": record["location_id"],
        "location_name": record["location_name"],
    }


# =========================================================
# GET ALL ATTENDANCE
# =========================================================

@router.get("/")
def get_all_attendance(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    query = text("""
        SELECT
            a.id,
            a.user_id,
            u.name AS employee_name,
            u.email AS employee_email,
            a.attendance_data,
            a.check_in,
            a.check_out,
            a.status,
            a.latitude,
            a.longitude,
            a.location_id,
            l.name AS location_name
        FROM public.attendance a
        LEFT JOIN public.users u
            ON u.id = a.user_id
        LEFT JOIN public.locations l
            ON l.id = a.location_id
        ORDER BY
            a.attendance_data DESC,
            a.check_in DESC
    """)

    records = db.execute(query).mappings().all()

    return {
        "count": len(records),
        "records": [
            serialize_attendance(record)
            for record in records
        ],
    }


# =========================================================
# GET TODAY'S ATTENDANCE
# =========================================================

@router.get("/today")
def get_today_attendance(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    today = date.today()

    query = text("""
        SELECT
            a.id,
            a.user_id,
            u.name AS employee_name,
            u.email AS employee_email,
            a.attendance_data,
            a.check_in,
            a.check_out,
            a.status,
            a.latitude,
            a.longitude,
            a.location_id,
            l.name AS location_name
        FROM public.attendance a
        LEFT JOIN public.users u
            ON u.id = a.user_id
        LEFT JOIN public.locations l
            ON l.id = a.location_id
        WHERE a.attendance_data = :attendance_date
        ORDER BY a.check_in DESC
    """)

    records = db.execute(
        query,
        {
            "attendance_date": today,
        },
    ).mappings().all()

    return {
        "date": str(today),
        "count": len(records),
        "records": [
            serialize_attendance(record)
            for record in records
        ],
    }


# =========================================================
# LIVE OPERATIONS
#
# Returns:
# - Employee information
# - Attendance information
# - Check-in GPS
# - Latest employee GPS
# - Location name
# - GPS accuracy
# - GPS freshness
# - Working time
# =========================================================

@router.get("/live-operations")
def get_live_operations(
    attendance_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    selected_date = attendance_date or date.today()

    # =====================================================
    # IMPORTANT:
    # PostgreSQL attendance/location timestamp columns are
    # timestamp WITHOUT time zone.
    #
    # Therefore CURRENT_TIMESTAMP is explicitly converted
    # to timestamp without time zone.
    # =====================================================

    query = text("""
        SELECT
            a.id AS attendance_id,
            a.user_id,

            u.name AS employee_name,
            u.email AS employee_email,
            u.role AS employee_role,

            a.attendance_data,
            a.check_in,
            a.check_out,
            a.status,

            a.latitude AS attendance_latitude,
            a.longitude AS attendance_longitude,

            a.location_id,
            l.name AS location_name,

            el.id AS live_location_id,
            el.latitude AS live_latitude,
            el.longitude AS live_longitude,
            el.accuracy_meters,
            el.updated_at AS live_location_updated_at,

            EXTRACT(
                EPOCH FROM (
                    CURRENT_TIMESTAMP::timestamp
                    - el.updated_at
                )
            ) AS seconds_since_location_update

        FROM public.attendance a

        INNER JOIN public.users u
            ON u.id = a.user_id

        LEFT JOIN public.locations l
            ON l.id = a.location_id

        LEFT JOIN public.employee_locations el
            ON el.user_id = a.user_id

        WHERE a.attendance_data = :attendance_date

        ORDER BY a.check_in DESC
    """)

    records = db.execute(
        query,
        {
            "attendance_date": selected_date,
        },
    ).mappings().all()

    # =====================================================
    # DATABASE CURRENT TIME
    #
    # Explicitly cast to timestamp without time zone.
    # =====================================================

    current_db_time = db.execute(
        text(
            "SELECT CURRENT_TIMESTAMP::timestamp"
        )
    ).scalar_one()

    operations = []

    # =====================================================
    # BUILD OPERATIONS
    # =====================================================

    for record in records:

        check_in = record["check_in"]
        check_out = record["check_out"]

        # =================================================
        # ATTENDANCE STATE
        # =================================================

        is_checked_in = (
            check_in is not None
            and check_out is None
        )

        is_checked_out = check_out is not None

        # =================================================
        # WORKING TIME
        # =================================================

        working_seconds = 0

        if check_in:

            if check_out:

                working_seconds = int(
                    (
                        check_out - check_in
                    ).total_seconds()
                )

            elif selected_date == date.today():

                working_seconds = int(
                    (
                        current_db_time - check_in
                    ).total_seconds()
                )

            elif selected_date < date.today():

                # End of selected day.
                end_of_day = db.execute(
                    text("""
                        SELECT
                            CAST(
                                :selected_date
                                + INTERVAL '1 day'
                                AS TIMESTAMP
                            )
                    """),
                    {
                        "selected_date": selected_date,
                    },
                ).scalar_one()

                working_seconds = int(
                    (
                        end_of_day - check_in
                    ).total_seconds()
                )

        working_seconds = max(
            working_seconds,
            0,
        )

        hours = working_seconds // 3600

        minutes = (
            working_seconds % 3600
        ) // 60

        # =================================================
        # LIVE GPS
        # =================================================

        live_location_exists = (
            record["live_location_id"] is not None
        )

        seconds_since_location_update = None
        is_location_live = False

        if (
            live_location_exists
            and record["seconds_since_location_update"]
            is not None
        ):
            seconds_since_location_update = round(
                float(
                    record[
                        "seconds_since_location_update"
                    ]
                ),
                2,
            )

            # GPS is considered live for 120 seconds.
            is_location_live = (
                seconds_since_location_update <= 120
            )

        # =================================================
        # LIVE OPERATION
        #
        # Employee must:
        # 1. Be checked in
        # 2. Have recent GPS
        # =================================================

        is_live_operation = (
            is_checked_in
            and is_location_live
        )

        # =================================================
        # LIVE GPS COORDINATES
        # =================================================

        live_latitude = (
            float(record["live_latitude"])
            if record["live_latitude"] is not None
            else None
        )

        live_longitude = (
            float(record["live_longitude"])
            if record["live_longitude"] is not None
            else None
        )

        accuracy_meters = (
            float(record["accuracy_meters"])
            if record["accuracy_meters"] is not None
            else None
        )

        # =================================================
        # ATTENDANCE GPS
        # =================================================

        attendance_latitude = (
            float(record["attendance_latitude"])
            if record["attendance_latitude"] is not None
            else None
        )

        attendance_longitude = (
            float(record["attendance_longitude"])
            if record["attendance_longitude"] is not None
            else None
        )

        # =================================================
        # LIVE LOCATION UPDATED AT
        # =================================================

        live_location_updated_at = (
            record["live_location_updated_at"].isoformat()
            if record["live_location_updated_at"]
            else None
        )

        # =================================================
        # OPERATION OBJECT
        # =================================================

        operations.append(
            {
                "attendance_id":
                    record["attendance_id"],

                "user_id":
                    record["user_id"],

                "employee_name":
                    record["employee_name"],

                "employee_email":
                    record["employee_email"],

                "employee_role":
                    record["employee_role"],

                "attendance_date": (
                    str(record["attendance_data"])
                    if record["attendance_data"]
                    else None
                ),

                "check_in": (
                    check_in.isoformat()
                    if check_in
                    else None
                ),

                "check_out": (
                    check_out.isoformat()
                    if check_out
                    else None
                ),

                "status":
                    record["status"],

                # -----------------------------------------
                # Attendance location
                # -----------------------------------------

                "location_id":
                    record["location_id"],

                "location_name":
                    record["location_name"],

                # -----------------------------------------
                # GPS captured during check-in
                # -----------------------------------------

                "attendance_latitude":
                    attendance_latitude,

                "attendance_longitude":
                    attendance_longitude,

                # -----------------------------------------
                # Latest live employee GPS
                # -----------------------------------------

                "live_location_id":
                    record["live_location_id"],

                "latitude":
                    live_latitude,

                "longitude":
                    live_longitude,

                "accuracy_meters":
                    accuracy_meters,

                "live_location_updated_at":
                    live_location_updated_at,

                "seconds_since_location_update":
                    seconds_since_location_update,

                "is_location_live":
                    is_location_live,

                "is_live_operation":
                    is_live_operation,

                # -----------------------------------------
                # Working time
                # -----------------------------------------

                "working_seconds":
                    working_seconds,

                "working_hours":
                    f"{hours}h {minutes}m",

                "is_checked_in":
                    is_checked_in,

                "is_checked_out":
                    is_checked_out,
            }
        )

    # =====================================================
    # SUMMARY
    # =====================================================

    active_operations = [
        operation
        for operation in operations
        if operation["is_checked_in"]
    ]

    checked_out_operations = [
        operation
        for operation in operations
        if operation["is_checked_out"]
    ]

    late_operations = [
        operation
        for operation in operations
        if (
            operation["status"]
            and str(operation["status"]).lower().strip()
            == "late"
        )
    ]

    live_location_operations = [
        operation
        for operation in operations
        if operation["is_location_live"]
    ]

    live_operations = [
        operation
        for operation in operations
        if operation["is_live_operation"]
    ]

    # =====================================================
    # RESPONSE
    # =====================================================

    return {
        "date":
            str(selected_date),

        "total_records":
            len(operations),

        "active_count":
            len(active_operations),

        "checked_out_count":
            len(checked_out_operations),

        "late_count":
            len(late_operations),

        "live_location_count":
            len(live_location_operations),

        "live_operation_count":
            len(live_operations),

        "operations":
            operations,
    }


# =========================================================
# MY TODAY ATTENDANCE STATUS
# =========================================================

@router.get("/my-status")
def get_my_attendance_status(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = text("""
        SELECT
            a.id,
            a.user_id,
            a.attendance_data,
            a.check_in,
            a.check_out,
            a.status,

            a.location_id,
            l.name AS location_name

        FROM public.attendance a

        LEFT JOIN public.locations l
            ON l.id = a.location_id

        WHERE a.user_id = :user_id
          AND a.attendance_data = :attendance_date

        ORDER BY a.check_in DESC

        LIMIT 1
    """)

    record = db.execute(
        query,
        {
            "user_id": current_user["id"],
            "attendance_date": date.today(),
        },
    ).mappings().first()

    if not record:
        return {
            "has_attendance": False,
            "is_checked_in": False,
            "attendance": None,
        }

    check_in = record["check_in"]
    check_out = record["check_out"]

    # IMPORTANT:
    # Match timestamp without time zone used by database.
    current_db_time = db.execute(
        text(
            "SELECT CURRENT_TIMESTAMP::timestamp"
        )
    ).scalar_one()

    working_seconds = 0

    if check_in:

        end_time = (
            check_out
            if check_out
            else current_db_time
        )

        working_seconds = int(
            max(
                (
                    end_time - check_in
                ).total_seconds(),
                0,
            )
        )

    hours = working_seconds // 3600

    minutes = (
        working_seconds % 3600
    ) // 60

    is_checked_in = (
        check_in is not None
        and check_out is None
    )

    return {
        "has_attendance": True,

        "is_checked_in":
            is_checked_in,

        "attendance": {

            "id":
                record["id"],

            "user_id":
                record["user_id"],

            "attendance_date": (
                str(record["attendance_data"])
                if record["attendance_data"]
                else None
            ),

            "check_in": (
                check_in.isoformat()
                if check_in
                else None
            ),

            "check_out": (
                check_out.isoformat()
                if check_out
                else None
            ),

            "status":
                record["status"],

            "location_id":
                record["location_id"],

            "location_name":
                record["location_name"],

            "working_seconds":
                working_seconds,

            "working_hours":
                f"{hours}h {minutes}m",

            "is_checked_in":
                is_checked_in,
        },
    }


# =========================================================
# CHECK-IN
#
# Performs:
# 1. User validation
# 2. Workplace validation
# 3. GPS geofence validation
# 4. Duplicate check-in protection
# 5. Attendance creation
# 6. Employee live-location creation/update
# =========================================================

@router.post("/check-in")
def check_in(
    data: CheckInRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # =====================================================
    # GET USER
    # =====================================================

    user = db.execute(
        text("""
            SELECT
                id,
                name,
                email,
                role,
                is_active

            FROM public.users

            WHERE id = :user_id
        """),
        {
            "user_id": current_user["id"],
        },
    ).mappings().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    # =====================================================
    # GEOFENCE
    # =====================================================

    location = db.execute(
        text("""
            SELECT
                l.id AS location_id,
                l.name AS location_name,
                l.radius_meters,

                ST_Y(
                    l.coordinates::geometry
                ) AS workplace_latitude,

                ST_X(
                    l.coordinates::geometry
                ) AS workplace_longitude,

                ST_Distance(
                    l.coordinates,
                    ST_SetSRID(
                        ST_MakePoint(
                            :longitude,
                            :latitude
                        ),
                        4326
                    )::geography
                ) AS distance_meters,

                ST_DWithin(
                    l.coordinates,
                    ST_SetSRID(
                        ST_MakePoint(
                            :longitude,
                            :latitude
                        ),
                        4326
                    )::geography,
                    l.radius_meters
                ) AS is_allowed

            FROM public.locations l

            WHERE l.id = :location_id
        """),
        {
            "longitude": data.longitude,
            "latitude": data.latitude,
            "location_id": data.location_id,
        },
    ).mappings().first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workplace location not found.",
        )

    workplace_latitude = (
        float(location["workplace_latitude"])
        if location["workplace_latitude"] is not None
        else None
    )

    workplace_longitude = (
        float(location["workplace_longitude"])
        if location["workplace_longitude"] is not None
        else None
    )

    distance_meters = (
        round(
            float(location["distance_meters"]),
            2,
        )
        if location["distance_meters"] is not None
        else None
    )

    allowed_radius_meters = (
        float(location["radius_meters"])
        if location["radius_meters"] is not None
        else None
    )

    is_allowed = bool(
        location["is_allowed"]
    )

    # =====================================================
    # GEOFENCE REJECTION
    # =====================================================

    if not is_allowed:

        return {
            "status": "Rejected",

            "message":
                "You are outside the allowed workplace location radius.",

            "reason":
                "GPS distance from the workplace is greater than the configured allowed radius.",

            "current_location": {
                "latitude":
                    data.latitude,

                "longitude":
                    data.longitude,
            },

            "workplace_location": {
                "location_id":
                    location["location_id"],

                "location_name":
                    location["location_name"],

                "latitude":
                    workplace_latitude,

                "longitude":
                    workplace_longitude,
            },

            "distance_meters":
                distance_meters,

            "allowed_radius_meters":
                allowed_radius_meters,

            "outside_by_meters": (
                round(
                    max(
                        distance_meters
                        - allowed_radius_meters,
                        0,
                    ),
                    2,
                )
                if (
                    distance_meters is not None
                    and allowed_radius_meters is not None
                )
                else None
            ),

            "geofence_allowed":
                False,
        }

    # =====================================================
    # PREVENT DUPLICATE ACTIVE CHECK-IN
    # =====================================================

    existing = db.execute(
        text("""
            SELECT id

            FROM public.attendance

            WHERE user_id = :user_id
              AND attendance_data = :attendance_date
              AND check_out IS NULL

            LIMIT 1
        """),
        {
            "user_id":
                current_user["id"],

            "attendance_date":
                date.today(),
        },
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already checked in today.",
        )

    # =====================================================
    # CREATE ATTENDANCE
    # =====================================================

    try:

        attendance_id = db.execute(
            text("""
                INSERT INTO public.attendance
                (
                    user_id,
                    attendance_data,
                    check_in,
                    status,
                    latitude,
                    longitude,
                    location_id
                )

                VALUES
                (
                    :user_id,
                    :attendance_date,
                    CURRENT_TIMESTAMP,
                    'Present',
                    :latitude,
                    :longitude,
                    :location_id
                )

                RETURNING id
            """),
            {
                "user_id":
                    current_user["id"],

                "attendance_date":
                    date.today(),

                "latitude":
                    data.latitude,

                "longitude":
                    data.longitude,

                "location_id":
                    data.location_id,
            },
        ).scalar_one()

        # =================================================
        # SAVE EMPLOYEE LIVE LOCATION
        # =================================================

        db.execute(
            text("""
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
                    CURRENT_TIMESTAMP
                )

                ON CONFLICT (user_id)

                DO UPDATE SET

                    latitude =
                        EXCLUDED.latitude,

                    longitude =
                        EXCLUDED.longitude,

                    accuracy_meters =
                        EXCLUDED.accuracy_meters,

                    updated_at =
                        CURRENT_TIMESTAMP
            """),
            {
                "user_id":
                    current_user["id"],

                "latitude":
                    data.latitude,

                "longitude":
                    data.longitude,

                "accuracy_meters":
                    None,
            },
        )

        db.commit()

    except Exception:
        db.rollback()
        raise

    # =====================================================
    # SUCCESS RESPONSE
    # =====================================================

    return {
        "status":
            "Present",

        "message":
            "Attendance marked successfully.",

        "attendance_id":
            attendance_id,

        "user_id":
            current_user["id"],

        "employee_name":
            user["name"],

        "location":
            location["location_name"],

        "latitude":
            data.latitude,

        "longitude":
            data.longitude,

        "workplace_latitude":
            workplace_latitude,

        "workplace_longitude":
            workplace_longitude,

        "distance_meters":
            distance_meters,

        "allowed_radius_meters":
            allowed_radius_meters,

        "geofence_allowed":
            True,

        "location_saved":
            True,
    }


# =========================================================
# CHECK-OUT
# =========================================================

@router.post("/check-out")
def check_out(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    attendance = db.execute(
        text("""
            SELECT
                id,
                check_in

            FROM public.attendance

            WHERE user_id = :user_id
              AND attendance_data = :attendance_date
              AND check_out IS NULL

            ORDER BY check_in DESC

            LIMIT 1
        """),
        {
            "user_id":
                current_user["id"],

            "attendance_date":
                date.today(),
        },
    ).mappings().first()

    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No active check-in found "
                "for this user today."
            ),
        )

    try:

        updated = db.execute(
            text("""
                UPDATE public.attendance

                SET check_out = CURRENT_TIMESTAMP

                WHERE id = :attendance_id

                RETURNING
                    id,
                    check_in,
                    check_out
            """),
            {
                "attendance_id":
                    attendance["id"],
            },
        ).mappings().first()

        db.commit()

    except Exception:
        db.rollback()
        raise

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found.",
        )

    working_seconds = int(
        max(
            (
                updated["check_out"]
                - updated["check_in"]
            ).total_seconds(),
            0,
        )
    )

    hours = working_seconds // 3600

    minutes = (
        working_seconds % 3600
    ) // 60

    return {
        "status":
            "Checked out",

        "message":
            "Check-out recorded successfully.",

        "attendance_id":
            updated["id"],

        "user_id":
            current_user["id"],

        "check_in":
            updated["check_in"].isoformat(),

        "check_out":
            updated["check_out"].isoformat(),

        "working_seconds":
            working_seconds,

        "working_hours":
            f"{hours} hours {minutes} minutes",
    }