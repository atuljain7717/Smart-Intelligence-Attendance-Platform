from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"]
)


# =========================
# ADMIN CHECK
# =========================

def require_admin(current_user: dict):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required."
        )


# =========================
# ATTENDANCE REPORT
# =========================

@router.get("/attendance")
def attendance_report(
    report_date: date | None = Query(
        default=None,
        description="Attendance date. Example: 2026-08-22"
    ),
    user_id: int | None = Query(
        default=None,
        description="Optional employee ID"
    ),
    status: str | None = Query(
        default=None,
        description="Optional attendance status"
    ),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_admin(current_user)

    # Use today's date if no date supplied
    selected_date = report_date or date.today()

    query = text("""
        SELECT
            a.id AS attendance_id,
            a.user_id,
            u.name AS user_name,
            u.email,

            a.attendance_data,
            a.check_in,
            a.check_out,
            a.status,

            a.latitude,
            a.longitude,

            l.id AS location_id,
            l.name AS location_name,

            CASE
                WHEN a.check_in IS NOT NULL
                 AND a.check_out IS NOT NULL
                THEN ROUND(
                    (
                        EXTRACT(
                            EPOCH FROM
                            (a.check_out - a.check_in)
                        ) / 3600
                    )::numeric,
                    2
                )
                ELSE NULL
            END AS working_hours

        FROM public.attendance a

        INNER JOIN public.users u
            ON u.id = a.user_id

        LEFT JOIN public.locations l
            ON l.id = a.location_id

        WHERE a.attendance_data = :report_date

          AND (
              :user_id IS NULL
              OR a.user_id = :user_id
          )

          AND (
              :status IS NULL
              OR a.status = :status
          )

        ORDER BY a.check_in DESC
    """)

    records = db.execute(
        query,
        {
            "report_date": selected_date,
            "user_id": user_id,
            "status": status
        }
    ).mappings().all()

    return {
        "date": str(selected_date),
        "count": len(records),
        "records": [
            {
                "attendance_id": record["attendance_id"],
                "user_id": record["user_id"],
                "user_name": record["user_name"],
                "email": record["email"],

                "attendance_data": str(
                    record["attendance_data"]
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

                "latitude": record["latitude"],
                "longitude": record["longitude"],

                "location_id": record["location_id"],
                "location_name": record["location_name"],

                "working_hours": (
                    float(record["working_hours"])
                    if record["working_hours"] is not None
                    else None
                )
            }
            for record in records
        ]
    }


# =========================
# EMPLOYEE ATTENDANCE SUMMARY
# =========================

@router.get("/employee/{user_id}")
def employee_report(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_admin(current_user)

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
            "user_id": user_id
        }
    ).mappings().first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Employee not found."
        )

    query = text("""
        SELECT
            COUNT(*) AS total_days,

            COUNT(*) FILTER (
                WHERE status = 'Present'
            ) AS present_days,

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
                            EPOCH FROM
                            (check_out - check_in)
                        ) / 3600
                    )::numeric,
                    2
                ),
                0
            ) AS average_working_hours

        FROM public.attendance

        WHERE user_id = :user_id
    """)

    summary = db.execute(
        query,
        {
            "user_id": user_id
        }
    ).mappings().first()

    return {
        "employee": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "is_active": user["is_active"]
        },
        "attendance_summary": {
            "total_days": summary["total_days"],
            "present_days": summary["present_days"],
            "total_check_ins": summary["total_check_ins"],
            "completed_check_outs": summary["completed_check_outs"],
            "average_working_hours": float(
                summary["average_working_hours"]
            )
        }
    }