from sqlalchemy import text

from app.database.database import engine


def ensure_schema() -> None:
    """Ensure required database columns exist."""

    with engine.begin() as connection:
        # ========================================================
        # USERS - FACE RECOGNITION
        # ========================================================

        connection.execute(
            text("""
                ALTER TABLE public.users
                ADD COLUMN IF NOT EXISTS face_embedding JSONB
            """)
        )

        connection.execute(
            text("""
                ALTER TABLE public.users
                ADD COLUMN IF NOT EXISTS face_enrolled_at TIMESTAMPTZ
            """)
        )

        # ========================================================
        # LOCATIONS - WORKPLACE STATUS
        # ========================================================

        connection.execute(
            text("""
                ALTER TABLE public.locations
                ADD COLUMN IF NOT EXISTS is_active BOOLEAN
                DEFAULT TRUE
            """)
        )

        # Make sure existing locations are active
        connection.execute(
            text("""
                UPDATE public.locations
                SET is_active = TRUE
                WHERE is_active IS NULL
            """)
        )

        # ========================================================
        # COMPLETED
        # ========================================================

        print("Database schema check completed successfully.")
        print(" - users.face_embedding -> JSONB")
        print(" - users.face_enrolled_at -> TIMESTAMPTZ")
        print(" - locations.is_active -> BOOLEAN")