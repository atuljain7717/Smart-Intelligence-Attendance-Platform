from datetime import datetime, timedelta, timezone
import base64
import hashlib
import json
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth

from fastapi_mail import (
    FastMail,
    MessageSchema,
    ConnectionConfig,
    MessageType,
)

from app.database.database import get_db
from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


# ============================================================
# GOOGLE OAUTH
# ============================================================

oauth = OAuth()

oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url=(
        "https://accounts.google.com/.well-known/openid-configuration"
    ),
    client_kwargs={
        "scope": "openid email profile",
    },
)


# ============================================================
# EMAIL CONFIGURATION
# ============================================================

mail_config = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM or settings.MAIL_USERNAME,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)


# ============================================================
# REQUEST MODELS
# ============================================================

class RegisterRequest(BaseModel):
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


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(
        ...,
        min_length=1,
        max_length=100,
    )

    new_password: str = Field(
        ...,
        min_length=8,
        max_length=100,
    )


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(
        ...,
        min_length=20,
    )

    new_password: str = Field(
        ...,
        min_length=6,
        max_length=100,
    )


# ============================================================
# REGISTER
# ============================================================

@router.post("/register")
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    email = str(data.email).strip().lower()
    name = data.name.strip()

    if len(name) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Name must contain at least 2 characters.",
        )

    # --------------------------------------------------------
    # CHECK EXISTING USER
    # --------------------------------------------------------

    existing_user = db.execute(
        text("""
            SELECT id
            FROM public.users
            WHERE LOWER(TRIM(email)) = :email
            LIMIT 1
        """),
        {
            "email": email,
        },
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    # --------------------------------------------------------
    # HASH PASSWORD
    # --------------------------------------------------------

    password_hash = hash_password(data.password)

    # --------------------------------------------------------
    # CREATE EMPLOYEE
    # --------------------------------------------------------

    try:
        user = db.execute(
            text("""
                INSERT INTO public.users
                (
                    name,
                    email,
                    password_hash,
                    role,
                    created_at,
                    is_active
                )
                VALUES
                (
                    :name,
                    :email,
                    :password_hash,
                    'employee',
                    CURRENT_TIMESTAMP,
                    TRUE
                )
                RETURNING
                    id,
                    name,
                    email,
                    role,
                    created_at,
                    is_active
            """),
            {
                "name": name,
                "email": email,
                "password_hash": password_hash,
            },
        ).mappings().first()

        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create user account.",
        )

    return {
        "message": "User registered successfully.",
        "user": user,
    }


# ============================================================
# LOGIN
# ============================================================

@router.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # NORMALIZE EMAIL
    # --------------------------------------------------------

    email = str(data.email).strip().lower()

    # --------------------------------------------------------
    # FIND USER
    # --------------------------------------------------------

    user = db.execute(
        text("""
            SELECT
                id,
                name,
                email,
                password_hash,
                role,
                is_active
            FROM public.users
            WHERE LOWER(TRIM(email)) = :email
            LIMIT 1
        """),
        {
            "email": email,
        },
    ).mappings().first()

    # --------------------------------------------------------
    # USER NOT FOUND
    # --------------------------------------------------------

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # --------------------------------------------------------
    # ACCOUNT INACTIVE
    # --------------------------------------------------------

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Your account is inactive. "
                "Please contact the administrator."
            ),
        )

    # --------------------------------------------------------
    # PASSWORD LOGIN NOT AVAILABLE
    # --------------------------------------------------------

    if not user["password_hash"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Password login is not configured "
                "for this account."
            ),
        )

    # --------------------------------------------------------
    # PASSWORD VERIFICATION
    # --------------------------------------------------------

    stored_hash = str(user["password_hash"])

    try:
        password_valid = verify_password(
            data.password,
            stored_hash,
        )

    except Exception as exc:
        print(
            "Password verification error:",
            type(exc).__name__,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify account credentials.",
        )

    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # --------------------------------------------------------
    # NORMALIZE ROLE
    # --------------------------------------------------------

    role = str(
        user["role"] or "employee"
    ).strip().lower()

    # --------------------------------------------------------
    # CREATE JWT
    # --------------------------------------------------------

    access_token = create_access_token(
        {
            "sub": str(user["id"]),
            "email": user["email"],
            "role": role,
        }
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "message": "Login successful.",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": role,
            "is_active": user["is_active"],
        },
    }


# ============================================================
# CHANGE PASSWORD
# ============================================================

@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Change the currently authenticated user's password.

    Requires:
        Authorization: Bearer <access_token>
    """

    # --------------------------------------------------------
    # GET AUTHORIZATION HEADER
    # --------------------------------------------------------

    authorization = request.headers.get("Authorization")

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    # --------------------------------------------------------
    # CHECK BEARER TOKEN
    # --------------------------------------------------------

    parts = authorization.strip().split()

    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
        )

    token = parts[1]

    # --------------------------------------------------------
    # DECODE JWT
    # --------------------------------------------------------

    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        )

    # --------------------------------------------------------
    # GET USER ID FROM TOKEN
    # --------------------------------------------------------

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )

    # --------------------------------------------------------
    # FIND CURRENT USER
    # --------------------------------------------------------

    user = db.execute(
        text("""
            SELECT
                id,
                name,
                email,
                password_hash,
                role,
                is_active
            FROM public.users
            WHERE id = :user_id
            LIMIT 1
        """),
        {
            "user_id": user_id,
        },
    ).mappings().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    # --------------------------------------------------------
    # CHECK ACCOUNT STATUS
    # --------------------------------------------------------

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is inactive.",
        )

    # --------------------------------------------------------
    # CHECK EXISTING PASSWORD
    # --------------------------------------------------------

    if not user["password_hash"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password login is not configured for this account.",
        )

    try:
        current_password_valid = verify_password(
            data.current_password,
            str(user["password_hash"]),
        )

    except Exception as exc:
        print(
            "Current password verification error:",
            type(exc).__name__,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify current password.",
        )

    if not current_password_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    # --------------------------------------------------------
    # PREVENT SAME PASSWORD
    # --------------------------------------------------------

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "New password must be different "
                "from your current password."
            ),
        )

    # --------------------------------------------------------
    # HASH NEW PASSWORD
    # --------------------------------------------------------

    new_password_hash = hash_password(
        data.new_password
    )

    # --------------------------------------------------------
    # UPDATE PASSWORD
    # --------------------------------------------------------

    try:
        db.execute(
            text("""
                UPDATE public.users
                SET password_hash = :password_hash
                WHERE id = :user_id
            """),
            {
                "password_hash": new_password_hash,
                "user_id": user["id"],
            },
        )

        db.commit()

    except Exception as exc:
        db.rollback()

        print(
            "Password update error:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to change password.",
        )

    # --------------------------------------------------------
    # SUCCESS
    # --------------------------------------------------------

    return {
        "message": "Password changed successfully."
    }


# ============================================================
# GOOGLE LOGIN
# ============================================================

@router.get("/google/login")
async def google_login(
    request: Request,
):
    try:
        redirect_uri = settings.GOOGLE_REDIRECT_URI

        print("========================================")
        print("GOOGLE OAUTH LOGIN")
        print(
            "Client ID configured:",
            bool(settings.GOOGLE_CLIENT_ID),
        )
        print(
            "Client Secret configured:",
            bool(settings.GOOGLE_CLIENT_SECRET),
        )
        print(
            "Redirect URI:",
            redirect_uri,
        )
        print("========================================")

        return await oauth.google.authorize_redirect(
            request,
            redirect_uri,
        )

    except Exception as exc:
        print(
            "Google login error:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to start Google authentication.",
        )


# ============================================================
# GOOGLE CALLBACK
# ============================================================

@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        print("========================================")
        print("GOOGLE OAUTH CALLBACK")
        print(
            "Callback URL:",
            str(request.url),
        )
        print("========================================")

        token = await oauth.google.authorize_access_token(
            request,
        )

        print(
            "Google access token received:",
            bool(token),
        )

        user_info = token.get("userinfo")

        if not user_info:
            user_info = await oauth.google.userinfo(
                token=token,
            )

        print(
            "Google user info received:",
            bool(user_info),
        )

    except Exception as exc:
        print("========================================")
        print("GOOGLE OAUTH ERROR")
        print(
            "Error type:",
            type(exc).__name__,
        )
        print(
            "Error:",
            repr(exc),
        )
        print("========================================")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication failed.",
        )

    # --------------------------------------------------------
    # GOOGLE USER INFORMATION
    # --------------------------------------------------------

    google_email = user_info.get("email")
    google_name = user_info.get("name")

    if not google_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Google account email could not "
                "be retrieved."
            ),
        )

    google_email = str(
        google_email
    ).strip().lower()

    if not google_name:
        google_name = google_email.split("@")[0]

    google_name = str(
        google_name
    ).strip()

    # --------------------------------------------------------
    # FIND EXISTING USER
    # --------------------------------------------------------

    user = db.execute(
        text("""
            SELECT
                id,
                name,
                email,
                role,
                is_active
            FROM public.users
            WHERE LOWER(TRIM(email)) = :email
            LIMIT 1
        """),
        {
            "email": google_email,
        },
    ).mappings().first()

    # --------------------------------------------------------
    # EXISTING USER
    # --------------------------------------------------------

    if user:

        if not user["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Your account is inactive. "
                    "Please contact the administrator."
                ),
            )

        print(
            "Google existing user:",
            google_email,
        )

    # --------------------------------------------------------
    # NEW GOOGLE USER
    # --------------------------------------------------------

    else:

        try:
            user = db.execute(
                text("""
                    INSERT INTO public.users
                    (
                        name,
                        email,
                        password_hash,
                        role,
                        created_at,
                        is_active
                    )
                    VALUES
                    (
                        :name,
                        :email,
                        NULL,
                        'employee',
                        CURRENT_TIMESTAMP,
                        TRUE
                    )
                    RETURNING
                        id,
                        name,
                        email,
                        role,
                        is_active
                """),
                {
                    "name": google_name,
                    "email": google_email,
                },
            ).mappings().first()

            db.commit()

        except Exception:
            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to create Google account.",
            )

        print(
            "Google new user created:",
            google_email,
        )

    # --------------------------------------------------------
    # NORMALIZE ROLE
    # --------------------------------------------------------

    role = str(
        user["role"] or "employee"
    ).strip().lower()

    # --------------------------------------------------------
    # CREATE JWT
    # --------------------------------------------------------

    access_token = create_access_token(
        {
            "sub": str(user["id"]),
            "email": user["email"],
            "role": role,
        }
    )

    # --------------------------------------------------------
    # FRONTEND USER
    # --------------------------------------------------------

    frontend_user = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": role,
        "is_active": user["is_active"],
    }

    user_json = json.dumps(
        frontend_user,
        separators=(",", ":"),
    )

    # --------------------------------------------------------
    # URL-SAFE BASE64
    # --------------------------------------------------------

    user_encoded = (
        base64.urlsafe_b64encode(
            user_json.encode("utf-8")
        )
        .decode("utf-8")
        .rstrip("=")
    )

    # --------------------------------------------------------
    # FRONTEND REDIRECT
    # --------------------------------------------------------

    frontend_url = (
        f"{settings.FRONTEND_URL}"
        f"/google-callback"
        f"?access_token={access_token}"
        f"&user={user_encoded}"
    )

    print(
        "Google authentication successful."
    )

    print(
        "Redirecting to:",
        f"{settings.FRONTEND_URL}/google-callback",
    )

    return RedirectResponse(
        url=frontend_url,
    )


# ============================================================
# FORGOT PASSWORD
# ============================================================

@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    email = str(data.email).strip().lower()

    # --------------------------------------------------------
    # FIND USER
    # --------------------------------------------------------

    user = db.execute(
        text("""
            SELECT
                id,
                email,
                name
            FROM public.users
            WHERE LOWER(TRIM(email)) = :email
            LIMIT 1
        """),
        {
            "email": email,
        },
    ).mappings().first()

    # Always return generic response for unknown emails
    if not user:
        return {
            "message": (
                "If an account exists with this "
                "email, a password reset link "
                "has been generated."
            )
        }

    reset_token = secrets.token_urlsafe(32)

    token_hash = hashlib.sha256(
        reset_token.encode("utf-8")
    ).hexdigest()

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=30)
    )

    # --------------------------------------------------------
    # STORE RESET TOKEN
    # --------------------------------------------------------

    try:
        db.execute(
            text("""
                ALTER TABLE public.users
                ADD COLUMN IF NOT EXISTS
                reset_token_hash VARCHAR(255)
            """)
        )

        db.execute(
            text("""
                ALTER TABLE public.users
                ADD COLUMN IF NOT EXISTS
                reset_token_expires_at TIMESTAMP
            """)
        )

        db.execute(
            text("""
                UPDATE public.users
                SET
                    reset_token_hash = :token_hash,
                    reset_token_expires_at = :expires_at
                WHERE id = :user_id
            """),
            {
                "token_hash": token_hash,
                "expires_at": expires_at.replace(
                    tzinfo=None
                ),
                "user_id": user["id"],
            },
        )

        db.commit()

    except Exception as exc:
        db.rollback()

        print(
            "Password reset token error:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unable to create password reset request."
            ),
        )

    # --------------------------------------------------------
    # RESET URL
    # --------------------------------------------------------

    reset_url = (
        f"{settings.FRONTEND_URL}"
        f"/reset-password"
        f"?token={reset_token}"
    )

    # --------------------------------------------------------
    # SEND EMAIL
    # --------------------------------------------------------

    if (
        settings.MAIL_USERNAME
        and settings.MAIL_PASSWORD
    ):
        try:
            message = MessageSchema(
                subject="Smart Attendance Password Reset",
                recipients=[
                    user["email"]
                ],
                body=f"""
Hello {user["name"]},

We received a request to reset your Smart Attendance password.

Use the link below to reset your password:

{reset_url}

This link will expire in 30 minutes.

If you did not request this reset, you can safely ignore this email.

Smart Attendance Intelligence Platform
""",
                subtype=MessageType.plain,
            )

            fast_mail = FastMail(
                mail_config
            )

            await fast_mail.send_message(
                message
            )

            return {
                "message": (
                    "Password reset link has "
                    "been sent to your email."
                )
            }

        except Exception as exc:
            print(
                "Password reset email error:",
                repr(exc),
            )

    # --------------------------------------------------------
    # DEVELOPMENT RESPONSE
    # --------------------------------------------------------

    return {
        "message": (
            "Password reset request created successfully."
        ),
        "development_reset_url": reset_url,
    }


# ============================================================
# RESET PASSWORD
# ============================================================

@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    token_hash = hashlib.sha256(
        data.token.encode("utf-8")
    ).hexdigest()

    # --------------------------------------------------------
    # FIND RESET TOKEN
    # --------------------------------------------------------

    user = db.execute(
        text("""
            SELECT
                id,
                reset_token_hash,
                reset_token_expires_at
            FROM public.users
            WHERE reset_token_hash = :token_hash
            LIMIT 1
        """),
        {
            "token_hash": token_hash,
        },
    ).mappings().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    # --------------------------------------------------------
    # CHECK EXPIRATION
    # --------------------------------------------------------

    expires_at = user[
        "reset_token_expires_at"
    ]

    if not expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    now = datetime.now()

    if now > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    # --------------------------------------------------------
    # HASH NEW PASSWORD
    # --------------------------------------------------------

    password_hash = hash_password(
        data.new_password
    )

    # --------------------------------------------------------
    # UPDATE PASSWORD
    # --------------------------------------------------------

    try:
        db.execute(
            text("""
                UPDATE public.users
                SET
                    password_hash = :password_hash,
                    reset_token_hash = NULL,
                    reset_token_expires_at = NULL
                WHERE id = :user_id
            """),
            {
                "password_hash": password_hash,
                "user_id": user["id"],
            },
        )

        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to reset password.",
        )

    return {
        "message": "Password reset successfully."
    }