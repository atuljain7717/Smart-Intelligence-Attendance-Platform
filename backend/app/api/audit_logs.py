from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db


router = APIRouter(
    prefix="/api/audit-logs",
    tags=["Audit Logs"],
)


# ============================================================
# GET AUDIT LOGS
# ============================================================

@router.get("/")
def get_audit_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    action: str | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Return audit logs for administrators.
    """

    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required.",
        )

    offset = (page - 1) * limit

    where_clause = ""
    params: dict[str, object] = {
        "limit": limit,
        "offset": offset,
    }

    if action:
        where_clause = """
            WHERE al.action = :action
        """
        params["action"] = action

    count_query = text(
        f"""
        SELECT COUNT(*)
        FROM public.audit_logs al
        {where_clause}
        """
    )

    total = db.execute(
        count_query,
        params,
    ).scalar_one()

    query = text(
        f"""
        SELECT
            al.id,
            al.user_id,
            u.name AS user_name,
            u.email AS user_email,
            u.role AS user_role,
            al.action,
            al.resource_type,
            al.resource_id,
            al.description,
            al.ip_address,
            al.user_agent,
            al.metadata,
            al.created_at
        FROM public.audit_logs al
        LEFT JOIN public.users u
            ON u.id = al.user_id
        {where_clause}
        ORDER BY al.created_at DESC
        LIMIT :limit
        OFFSET :offset
        """
    )

    rows = db.execute(
        query,
        params,
    ).mappings().all()

    return {
        "success": True,
        "page": page,
        "limit": limit,
        "total": total,
        "pages": (
            (total + limit - 1) // limit
            if total
            else 0
        ),
        "logs": [
            dict(row)
            for row in rows
        ],
    }


# ============================================================
# GET SINGLE AUDIT LOG
# ============================================================

@router.get("/{log_id}")
def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Return one audit log entry.
    """

    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required.",
        )

    row = db.execute(
        text(
            """
            SELECT
                al.id,
                al.user_id,
                u.name AS user_name,
                u.email AS user_email,
                u.role AS user_role,
                al.action,
                al.resource_type,
                al.resource_id,
                al.description,
                al.ip_address,
                al.user_agent,
                al.metadata,
                al.created_at
            FROM public.audit_logs al
            LEFT JOIN public.users u
                ON u.id = al.user_id
            WHERE al.id = :log_id
            """
        ),
        {
            "log_id": log_id,
        },
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Audit log not found.",
        )

    return {
        "success": True,
        "log": dict(row),
    }