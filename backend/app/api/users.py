from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import hash_password


router = APIRouter(
    prefix="/api/users",
    tags=["Users"],
)


# ============================================================
# RESPONSE MODEL
# ============================================================

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    location_id: int | None = None
    location_name: str | None = None
    face_registered: bool = False


# ============================================================
# CREATE EMPLOYEE REQUEST
# ============================================================

class CreateEmployeeRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    email: EmailStr

    password: str = Field(
        ...,
        min_length=6,
        max_length=100,
    )

    # Location is optional.
    location_id: int | None = None


# ============================================================
# UPDATE USER REQUEST
# ============================================================

class UpdateUserRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    email: EmailStr

    location_id: int | None = None


# ============================================================
# ADMIN CHECK
# ============================================================

def require_admin(current_user: dict):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )


# ============================================================
# GET ALL USERS
# ============================================================

@router.get("/", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    query = text(
        """
        SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            u.is_active,
            u.location_id,
            l.name AS location_name,

            EXISTS (
                SELECT 1
                FROM public.face_embeddings fe
                WHERE fe.user_id = u.id
            ) AS face_registered

        FROM public.users u

        LEFT JOIN public.locations l
            ON l.id = u.location_id

        ORDER BY u.id
        """
    )

    users = db.execute(query).mappings().all()

    return [
        {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "is_active": user["is_active"],
            "location_id": user["location_id"],
            "location_name": user["location_name"],
            "face_registered": bool(user["face_registered"]),
        }
        for user in users
    ]


# ============================================================
# CREATE EMPLOYEE
# ============================================================

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_employee(
    data: CreateEmployeeRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    # --------------------------------------------------------
    # DUPLICATE EMAIL
    # --------------------------------------------------------

    existing_user = db.execute(
        text(
            """
            SELECT id
            FROM public.users
            WHERE LOWER(email) = LOWER(:email)
            LIMIT 1
            """
        ),
        {
            "email": str(data.email).lower(),
        },
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    # --------------------------------------------------------
    # LOCATION
    # --------------------------------------------------------

    location = None

    if data.location_id is not None:
        location = db.execute(
            text(
                """
                SELECT
                    id,
                    name
                FROM public.locations
                WHERE id = :location_id
                  AND is_active = TRUE
                """
            ),
            {
                "location_id": data.location_id,
            },
        ).mappings().first()

        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected location not found or inactive.",
            )

    # --------------------------------------------------------
    # PASSWORD
    # --------------------------------------------------------

    password_hash = hash_password(data.password)

    # --------------------------------------------------------
    # INSERT EMPLOYEE
    # --------------------------------------------------------

    try:
        employee = db.execute(
            text(
                """
                INSERT INTO public.users
                (
                    name,
                    email,
                    password_hash,
                    role,
                    location_id,
                    created_at,
                    is_active
                )

                VALUES
                (
                    :name,
                    :email,
                    :password_hash,
                    'employee',
                    :location_id,
                    CURRENT_TIMESTAMP,
                    TRUE
                )

                RETURNING
                    id,
                    name,
                    email,
                    role,
                    location_id,
                    is_active
                """
            ),
            {
                "name": data.name.strip(),
                "email": str(data.email).lower(),
                "password_hash": password_hash,
                "location_id": data.location_id,
            },
        ).mappings().first()

        db.commit()

    except Exception:
        db.rollback()
        raise

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Employee could not be created.",
        )

    return {
        "message": "Employee created successfully.",
        "employee": {
            "id": employee["id"],
            "name": employee["name"],
            "email": employee["email"],
            "role": employee["role"],
            "location_id": employee["location_id"],
            "location_name": (
                location["name"]
                if location
                else None
            ),
            "is_active": employee["is_active"],
            "face_registered": False,
        },
    }


# ============================================================
# GET SINGLE USER
# ============================================================

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    user = db.execute(
        text(
            """
            SELECT
                u.id,
                u.name,
                u.email,
                u.role,
                u.is_active,
                u.location_id,
                l.name AS location_name,

                EXISTS (
                    SELECT 1
                    FROM public.face_embeddings fe
                    WHERE fe.user_id = u.id
                ) AS face_registered

            FROM public.users u

            LEFT JOIN public.locations l
                ON l.id = u.location_id

            WHERE u.id = :user_id
            """
        ),
        {
            "user_id": user_id,
        },
    ).mappings().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "is_active": user["is_active"],
        "location_id": user["location_id"],
        "location_name": user["location_name"],
        "face_registered": bool(user["face_registered"]),
    }


# ============================================================
# UPDATE USER
# ============================================================

@router.patch("/{user_id}")
def update_user(
    user_id: int,
    data: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    existing_user = db.execute(
        text(
            """
            SELECT id
            FROM public.users
            WHERE id = :user_id
            """
        ),
        {
            "user_id": user_id,
        },
    ).first()

    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    duplicate_email = db.execute(
        text(
            """
            SELECT id
            FROM public.users
            WHERE LOWER(email) = LOWER(:email)
              AND id != :user_id
            LIMIT 1
            """
        ),
        {
            "email": str(data.email).lower(),
            "user_id": user_id,
        },
    ).first()

    if duplicate_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered by another user.",
        )

    # --------------------------------------------------------
    # LOCATION VALIDATION
    # --------------------------------------------------------

    if data.location_id is not None:
        location = db.execute(
            text(
                """
                SELECT id
                FROM public.locations
                WHERE id = :location_id
                  AND is_active = TRUE
                """
            ),
            {
                "location_id": data.location_id,
            },
        ).first()

        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected location not found or inactive.",
            )

    # --------------------------------------------------------
    # UPDATE
    # --------------------------------------------------------

    try:
        user = db.execute(
            text(
                """
                UPDATE public.users

                SET
                    name = :name,
                    email = :email,
                    location_id = :location_id

                WHERE id = :user_id

                RETURNING
                    id,
                    name,
                    email,
                    role,
                    location_id,
                    is_active
                """
            ),
            {
                "name": data.name.strip(),
                "email": str(data.email).lower(),
                "location_id": data.location_id,
                "user_id": user_id,
            },
        ).mappings().first()

        db.commit()

    except Exception:
        db.rollback()
        raise

    location_name = None

    if user["location_id"] is not None:
        location = db.execute(
            text(
                """
                SELECT name
                FROM public.locations
                WHERE id = :location_id
                """
            ),
            {
                "location_id": user["location_id"],
            },
        ).first()

        if location:
            location_name = location[0]

    return {
        "message": "Employee updated successfully.",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "location_id": user["location_id"],
            "location_name": location_name,
            "is_active": user["is_active"],
        },
    }


# ============================================================
# EMPLOYEE ATTENDANCE
# ============================================================

@router.get("/{user_id}/attendance")
def get_user_attendance(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    user = db.execute(
        text(
            """
            SELECT id
            FROM public.users
            WHERE id = :user_id
            """
        ),
        {
            "user_id": user_id,
        },
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    records = db.execute(
        text(
            """
            SELECT
                a.id,
                a.user_id,
                a.attendance_data,
                a.check_in,
                a.check_out,
                a.status,
                a.latitude,
                a.longitude,
                a.location_id,
                l.name AS location_name

            FROM public.attendance a

            LEFT JOIN public.locations l
                ON l.id = a.location_id

            WHERE a.user_id = :user_id

            ORDER BY
                a.attendance_data DESC,
                a.check_in DESC
            """
        ),
        {
            "user_id": user_id,
        },
    ).mappings().all()

    return {
        "user_id": user_id,
        "count": len(records),
        "records": [
            {
                "id": record["id"],
                "user_id": record["user_id"],
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
                "latitude": record["latitude"],
                "longitude": record["longitude"],
                "location_id": record["location_id"],
                "location_name": record["location_name"],
            }
            for record in records
        ],
    }


# ============================================================
# DEACTIVATE
# ============================================================

@router.patch("/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    user = db.execute(
        text(
            """
            UPDATE public.users
            SET is_active = FALSE
            WHERE id = :user_id
            RETURNING
                id,
                name,
                email,
                role,
                location_id,
                is_active
            """
        ),
        {
            "user_id": user_id,
        },
    ).mappings().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    db.commit()

    return {
        "message": "User deactivated successfully.",
        "user": user,
    }


# ============================================================
# ACTIVATE
# ============================================================

@router.patch("/{user_id}/activate")
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    user = db.execute(
        text(
            """
            UPDATE public.users
            SET is_active = TRUE
            WHERE id = :user_id
            RETURNING
                id,
                name,
                email,
                role,
                location_id,
                is_active
            """
        ),
        {
            "user_id": user_id,
        },
    ).mappings().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    db.commit()

    return {
        "message": "User activated successfully.",
        "user": user,
    }


# ============================================================
# PERMANENT DELETE EMPLOYEE
# ============================================================
#
# Deletes:
#   1. Face/biometric embeddings
#   2. Attendance records
#   3. User account
#
# IMPORTANT:
#   The employee's assigned location is NOT deleted because
#   locations are shared resources and may belong to other
#   employees.
#
# ============================================================

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    # --------------------------------------------------------
    # FIND USER
    # --------------------------------------------------------

    user = db.execute(
        text(
            """
            SELECT
                id,
                name,
                email,
                role,
                location_id
            FROM public.users
            WHERE id = :user_id
            """
        ),
        {
            "user_id": user_id,
        },
    ).mappings().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # --------------------------------------------------------
    # PREVENT ADMIN SELF-DELETION
    # --------------------------------------------------------

    current_user_id = current_user.get("id")

    if current_user_id is not None:
        try:
            if int(current_user_id) == int(user_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You cannot permanently delete your own account.",
                )
        except (TypeError, ValueError):
            pass

    # --------------------------------------------------------
    # ONLY EMPLOYEE CAN BE DELETED THROUGH THIS ENDPOINT
    # --------------------------------------------------------

    if str(user["role"]).lower() == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrator accounts cannot be deleted from this endpoint.",
        )

    # --------------------------------------------------------
    # DELETE RELATED RECORDS + USER
    # --------------------------------------------------------

    try:
        # ----------------------------------------------------
        # 1. DELETE FACE / BIOMETRIC DATA
        # ----------------------------------------------------

        face_result = db.execute(
            text(
                """
                DELETE FROM public.face_embeddings
                WHERE user_id = :user_id
                """
            ),
            {
                "user_id": user_id,
            },
        )

        deleted_face_records = face_result.rowcount or 0

        # ----------------------------------------------------
        # 2. DELETE ATTENDANCE RECORDS
        # ----------------------------------------------------

        attendance_result = db.execute(
            text(
                """
                DELETE FROM public.attendance
                WHERE user_id = :user_id
                """
            ),
            {
                "user_id": user_id,
            },
        )

        deleted_attendance_records = attendance_result.rowcount or 0

        # ----------------------------------------------------
        # 3. DELETE USER
        # ----------------------------------------------------

        deleted_user = db.execute(
            text(
                """
                DELETE FROM public.users
                WHERE id = :user_id
                RETURNING id
                """
            ),
            {
                "user_id": user_id,
            },
        ).mappings().first()

        if not deleted_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User could not be deleted.",
            )

        # ----------------------------------------------------
        # COMMIT EVERYTHING TOGETHER
        # ----------------------------------------------------

        db.commit()

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Employee deletion failed. "
                "No records were permanently deleted."
            ),
        ) from exc

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "message": "Employee permanently deleted successfully.",
        "deleted_employee": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
        },
        "deleted_records": {
            "face_embeddings": deleted_face_records,
            "attendance": deleted_attendance_records,
        },
    }