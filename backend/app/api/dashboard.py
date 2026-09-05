from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.dependencies import require_admin


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)


# =========================
# DASHBOARD SUMMARY
# =========================

@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    query = text("""
        SELECT
            (
                SELECT COUNT(*)
                FROM public.users
                WHERE role = 'employee'
            ) AS total_employees,

            (
                SELECT COUNT(DISTINCT user_id)
                FROM public.attendance
                WHERE attendance_data = CURRENT_DATE
                  AND status = 'Present'
            ) AS present_today,

            (
                SELECT COUNT(*)
                FROM public.users
                WHERE role = 'employee'
                  AND id NOT IN (
                      SELECT user_id
                      FROM public.attendance
                      WHERE attendance_data = CURRENT_DATE
                        AND status = 'Present'
                  )
            ) AS absent_today,

            (
                SELECT COUNT(*)
                FROM public.attendance
                WHERE attendance_data = CURRENT_DATE
                  AND check_out IS NULL
            ) AS currently_checked_in
    """)

    result = db.execute(query).mappings().first()

    total = result["total_employees"]
    present = result["present_today"]

    percentage = (
        round((present / total) * 100, 2)
        if total > 0
        else 0
    )

    return {
        "total_employees": total,
        "present_today": present,
        "absent_today": result["absent_today"],
        "currently_checked_in": result["currently_checked_in"],
        "attendance_percentage": percentage
    }


# =========================
# TODAY'S ATTENDANCE
# =========================

@router.get("/today")
def today_attendance(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    query = text("""
        SELECT
            u.id AS user_id,
            u.name AS user_name,
            u.email,
            a.id AS attendance_id,
            a.attendance_data,
            a.check_in,
            a.check_out,
            a.status,
            a.latitude,
            a.longitude,
            l.id AS location_id,
            l.name AS location_name
        FROM public.users u
        LEFT JOIN public.attendance a
            ON u.id = a.user_id
            AND a.attendance_data = CURRENT_DATE
        LEFT JOIN public.locations l
            ON a.location_id = l.id
        WHERE u.role = 'employee'
        ORDER BY u.id
    """)

    records = db.execute(query).mappings().all()

    return {
        "date": str(__import__("datetime").date.today()),
        "count": len(records),
        "records": [
            {
                "user_id": record["user_id"],
                "user_name": record["user_name"],
                "email": record["email"],
                "attendance_id": record["attendance_id"],
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
                "status": record["status"] or "Absent",
                "latitude": record["latitude"],
                "longitude": record["longitude"],
                "location_id": record["location_id"],
                "location_name": record["location_name"]
            }
            for record in records
        ]
    }


# =========================
# CURRENTLY CHECKED-IN
# =========================

@router.get("/checked-in")
def currently_checked_in(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    query = text("""
        SELECT
            a.id AS attendance_id,
            a.user_id,
            u.name AS user_name,
            u.email,
            a.attendance_data,
            a.check_in,
            a.status,
            a.latitude,
            a.longitude,
            l.id AS location_id,
            l.name AS location_name
        FROM public.attendance a
        INNER JOIN public.users u
            ON u.id = a.user_id
        LEFT JOIN public.locations l
            ON l.id = a.location_id
        WHERE a.attendance_data = CURRENT_DATE
          AND a.check_out IS NULL
          AND u.role = 'employee'
        ORDER BY a.check_in ASC
    """)

    records = db.execute(query).mappings().all()

    return {
        "count": len(records),
        "records": [
            {
                "attendance_id": record["attendance_id"],
                "user_id": record["user_id"],
                "user_name": record["user_name"],
                "email": record["email"],
                "attendance_data": str(record["attendance_data"]),
                "check_in": (
                    record["check_in"].isoformat()
                    if record["check_in"]
                    else None
                ),
                "status": record["status"],
                "latitude": record["latitude"],
                "longitude": record["longitude"],
                "location_id": record["location_id"],
                "location_name": record["location_name"]
            }
            for record in records
        ]
    }


# =========================
# ATTENDANCE STATISTICS
# =========================

@router.get("/statistics")
def attendance_statistics(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    query = text("""
        SELECT
            COUNT(*) AS total_records,

            COUNT(*) FILTER (
                WHERE status = 'Present'
            ) AS present_records,

            COUNT(*) FILTER (
                WHERE check_in IS NOT NULL
            ) AS total_check_ins,

            COUNT(*) FILTER (
                WHERE check_out IS NOT NULL
            ) AS completed_check_outs,

            COALESCE(
                ROUND(
                    AVG(
                        EXTRACT(
                            EPOCH FROM (check_out - check_in)
                        ) / 3600
                    )::numeric,
                    2
                ),
                0
            ) AS average_working_hours

        FROM public.attendance
    """)

    result = db.execute(query).mappings().first()

    total = result["total_records"]
    present = result["present_records"]

    attendance_percentage = (
        round((present / total) * 100, 2)
        if total > 0
        else 0
    )

    return {
        "total_attendance_records": total,
        "present_records": present,
        "total_check_ins": result["total_check_ins"],
        "completed_check_outs": result["completed_check_outs"],
        "average_working_hours": float(
            result["average_working_hours"]
        ),
        "attendance_percentage": attendance_percentage
    }
    
    # =========================
# ATTENDANCE TREND
# =========================

@router.get("/trend")
def attendance_trend(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    query = text("""
        SELECT
            attendance_data AS date,

            COUNT(*) AS total,

            COUNT(*) FILTER (
                WHERE status = 'Present'
            ) AS present,

            COUNT(*) FILTER (
                WHERE status = 'Absent'
            ) AS absent,

            COUNT(*) FILTER (
                WHERE status = 'Late'
            ) AS late

        FROM public.attendance

        WHERE attendance_data >= CURRENT_DATE - INTERVAL '6 days'
          AND attendance_data <= CURRENT_DATE

        GROUP BY attendance_data

        ORDER BY attendance_data ASC
    """)

    records = db.execute(query).mappings().all()

    return {
        "records": [
            {
                "date": str(record["date"]),
                "total": int(record["total"] or 0),
                "present": int(record["present"] or 0),
                "absent": int(record["absent"] or 0),
                "late": int(record["late"] or 0),
            }
            for record in records
        ]
    }