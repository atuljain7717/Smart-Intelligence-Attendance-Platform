from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/api/profile",
    tags=["Profile"]
)


@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = text("""
        SELECT
            id,
            name,
            email,
            role,
            created_at
        FROM public.users
        WHERE id = :user_id
    """)

    user = db.execute(
        query,
        {
            "user_id": current_user["id"]
        }
    ).mappings().first()

    if not user:
        return {
            "message": "User not found"
        }

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "created_at": user["created_at"]
    }