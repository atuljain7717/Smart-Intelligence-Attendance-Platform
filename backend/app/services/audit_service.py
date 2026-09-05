from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


def create_audit_log(
    db: Session,
    *,
    user_id: int | None = None,
    action: str,
    resource_type: str | None = None,
    resource_id: int | None = None,
    description: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """
    Create a single audit log entry.
    """

    query = text(
        """
        INSERT INTO public.audit_logs
        (
            user_id,
            action,
            resource_type,
            resource_id,
            description,
            ip_address,
            user_agent,
            metadata
        )
        VALUES
        (
            :user_id,
            :action,
            :resource_type,
            :resource_id,
            :description,
            :ip_address,
            :user_agent,
            CAST(:metadata AS JSONB)
        )
        """
    )

    import json

    db.execute(
        query,
        {
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "description": description,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "metadata": json.dumps(metadata or {}),
        },
    )

    db.commit()