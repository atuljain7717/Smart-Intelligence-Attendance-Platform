from sqlalchemy import text

from app.database.database import engine


def ensure_schema() -> None:
    """Ensure required database columns exist."""

    with engine.begin() as connection:
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

        print("Database schema check completed successfully.")
        print(" - users.face_embedding -> JSONB")
        print(" - users.face_enrolled_at -> TIMESTAMPTZ")
