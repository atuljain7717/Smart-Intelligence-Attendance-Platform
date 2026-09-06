from sqlalchemy import text

from app.database.database import engine


def ensure_schema():
    """
    Initialize required database tables.
    Safe to run every time FastAPI starts.
    """

    with engine.begin() as db:

        # ---------------------------------------------------------
        # Platform Settings
        # ---------------------------------------------------------
        db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS public.platform_settings (
                    id SERIAL PRIMARY KEY,
                    organization_name VARCHAR(255) NOT NULL
                        DEFAULT 'Smart Attendance Intelligence',
                    default_location VARCHAR(255) NOT NULL
                        DEFAULT 'Aurangabad',
                    timezone VARCHAR(100) NOT NULL
                        DEFAULT 'Asia/Kolkata',
                    notifications_enabled BOOLEAN NOT NULL
                        DEFAULT TRUE,
                    location_tracking_enabled BOOLEAN NOT NULL
                        DEFAULT TRUE,
                    face_recognition_enabled BOOLEAN NOT NULL
                        DEFAULT TRUE,
                    updated_by INTEGER NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
        )

        # Add missing columns to an existing table
        db.execute(
            text(
                """
                ALTER TABLE public.platform_settings
                ADD COLUMN IF NOT EXISTS organization_name
                VARCHAR(255)
                DEFAULT 'Smart Attendance Intelligence';
                """
            )
        )

        db.execute(
            text(
                """
                ALTER TABLE public.platform_settings
                ADD COLUMN IF NOT EXISTS default_location
                VARCHAR(255)
                DEFAULT 'Nanded';
                """
            )
        )

        db.execute(
            text(
                """
                ALTER TABLE public.platform_settings
                ADD COLUMN IF NOT EXISTS timezone
                VARCHAR(100)
                DEFAULT 'Asia/Kolkata';
                """
            )
        )

        db.execute(
            text(
                """
                ALTER TABLE public.platform_settings
                ADD COLUMN IF NOT EXISTS notifications_enabled
                BOOLEAN DEFAULT TRUE;
                """
            )
        )

        db.execute(
            text(
                """
                ALTER TABLE public.platform_settings
                ADD COLUMN IF NOT EXISTS location_tracking_enabled
                BOOLEAN DEFAULT TRUE;
                """
            )
        )

        db.execute(
            text(
                """
                ALTER TABLE public.platform_settings
                ADD COLUMN IF NOT EXISTS face_recognition_enabled
                BOOLEAN DEFAULT TRUE;
                """
            )
        )

        db.execute(
            text(
                """
                ALTER TABLE public.platform_settings
                ADD COLUMN IF NOT EXISTS updated_by
                INTEGER NULL;
                """
            )
        )

        db.execute(
            text(
                """
                ALTER TABLE public.platform_settings
                ADD COLUMN IF NOT EXISTS updated_at
                TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                """
            )
        )

        # ---------------------------------------------------------
        # Create default settings row if none exists
        # ---------------------------------------------------------
        db.execute(
            text(
                """
                INSERT INTO public.platform_settings (
                    organization_name,
                    default_location,
                    timezone,
                    notifications_enabled,
                    location_tracking_enabled,
                    face_recognition_enabled,
                    updated_at
                )
                SELECT
                    'Smart Attendance Intelligence',
                    'Aurangabad',
                    'Asia/Kolkata',
                    TRUE,
                    TRUE,
                    TRUE,
                    CURRENT_TIMESTAMP
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM public.platform_settings
                );
                """
            )
        )

    print("Database schema check completed successfully.")