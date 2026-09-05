
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/api/locations",
    tags=["Locations & Geofences"],
)


# ============================================================
# RESPONSE MODEL
# ============================================================

class LocationResponse(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    radius_meters: float
    is_active: bool


# ============================================================
# CREATE REQUEST
# ============================================================

class CreateLocationRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
    )

    radius_meters: float = Field(
        default=100,
        gt=0,
        le=10000,
    )


# ============================================================
# UPDATE REQUEST
# ============================================================

class UpdateLocationRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
    )

    radius_meters: float = Field(
        ...,
        gt=0,
        le=10000,
    )


# ============================================================
# ADMIN CHECK
# ============================================================

def require_admin(current_user: dict):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    role = str(
        current_user.get("role", "")
    ).strip().lower()

    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Admin access required to create or modify "
                "workplace locations."
            ),
        )


# ============================================================
# RESPONSE HELPER
# ============================================================

def location_to_dict(location):
    return {
        "id": int(location["id"]),
        "name": str(location["name"]),
        "latitude": float(location["latitude"]),
        "longitude": float(location["longitude"]),
        "radius_meters": float(location["radius_meters"]),
        "is_active": bool(location["is_active"]),
    }


# ============================================================
# GET ACTIVE LOCATIONS
# ============================================================

@router.get(
    "/",
    response_model=list[LocationResponse],
)
def get_locations(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    try:
        locations = (
            db.execute(
                text(
                    """
                    SELECT
                        id,
                        name,
                        latitude,
                        longitude,
                        radius_meters,
                        is_active
                    FROM public.locations
                    WHERE is_active = TRUE
                    ORDER BY id
                    """
                )
            )
            .mappings()
            .all()
        )

        return [
            location_to_dict(location)
            for location in locations
        ]

    except SQLAlchemyError as exc:
        db.rollback()

        print("=" * 70)
        print("GET LOCATIONS DATABASE ERROR")
        print(repr(exc))
        print("=" * 70)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to read workplace locations from database.",
        )


# ============================================================
# GET LOCATION BY ID
# ============================================================

@router.get(
    "/{location_id}",
    response_model=LocationResponse,
)
def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    try:
        location = (
            db.execute(
                text(
                    """
                    SELECT
                        id,
                        name,
                        latitude,
                        longitude,
                        radius_meters,
                        is_active
                    FROM public.locations
                    WHERE id = :location_id
                    """
                ),
                {
                    "location_id": location_id,
                },
            )
            .mappings()
            .first()
        )

        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found.",
            )

        return location_to_dict(location)

    except HTTPException:
        raise

    except SQLAlchemyError as exc:
        db.rollback()

        print("=" * 70)
        print("GET LOCATION DATABASE ERROR")
        print(repr(exc))
        print("=" * 70)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to read this workplace location.",
        )


# ============================================================
# CREATE LOCATION
# ============================================================

@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
)
def create_location(
    data: CreateLocationRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    name = data.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Location name cannot be empty.",
        )

    latitude = float(data.latitude)
    longitude = float(data.longitude)
    radius_meters = float(data.radius_meters)

    # PostgreSQL column is:
    # timestamp without time zone
    #
    # Therefore use a timezone-naive UTC datetime.
    created_at = datetime.now(timezone.utc).replace(
        tzinfo=None
    )

    try:
        print("=" * 70)
        print("CREATING WORKPLACE LOCATION")
        print("Name:", name)
        print("Latitude:", latitude)
        print("Longitude:", longitude)
        print("Radius:", radius_meters)
        print("Created At:", created_at)
        print("=" * 70)

        location = (
            db.execute(
                text(
                    """
                    INSERT INTO public.locations
                    (
                        name,
                        latitude,
                        longitude,
                        radius_meters,
                        created_at,
                        coordinates,
                        is_active
                    )
                    VALUES
                    (
                        :name,
                        :latitude,
                        :longitude,
                        :radius_meters,
                        :created_at,

                        ST_SetSRID(
                            ST_MakePoint(
                                :longitude,
                                :latitude
                            ),
                            4326
                        )::geography,

                        TRUE
                    )

                    RETURNING
                        id,
                        name,
                        latitude,
                        longitude,
                        radius_meters,
                        is_active
                    """
                ),
                {
                    "name": name,
                    "latitude": latitude,
                    "longitude": longitude,
                    "radius_meters": radius_meters,
                    "created_at": created_at,
                },
            )
            .mappings()
            .first()
        )

        db.commit()

        if not location:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Location was not created.",
            )

        print("=" * 70)
        print("WORKPLACE LOCATION CREATED SUCCESSFULLY")
        print(dict(location))
        print("=" * 70)

        return {
            "success": True,
            "message": "Location created successfully.",
            "location": location_to_dict(location),
        }

    except HTTPException:
        db.rollback()
        raise

    except SQLAlchemyError as exc:
        db.rollback()

        print("=" * 70)
        print("CREATE LOCATION DATABASE ERROR")
        print("TYPE:", type(exc).__name__)
        print("ERROR:", repr(exc))
        print("STRING:", str(exc))
        print("=" * 70)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Database error while creating "
                "the workplace location: "
                + str(exc)
            ),
        )

    except Exception as exc:
        db.rollback()

        print("=" * 70)
        print("CREATE LOCATION UNEXPECTED ERROR")
        print("TYPE:", type(exc).__name__)
        print("ERROR:", repr(exc))
        print("=" * 70)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unexpected error while creating "
                "the workplace location: "
                + str(exc)
            ),
        )


# ============================================================
# UPDATE LOCATION
# ============================================================

@router.put(
    "/{location_id}",
)
def update_location(
    location_id: int,
    data: UpdateLocationRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    name = data.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Location name cannot be empty.",
        )

    latitude = float(data.latitude)
    longitude = float(data.longitude)
    radius_meters = float(data.radius_meters)

    try:
        existing = db.execute(
            text(
                """
                SELECT id
                FROM public.locations
                WHERE id = :location_id
                """
            ),
            {
                "location_id": location_id,
            },
        ).first()

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found.",
            )

        location = (
            db.execute(
                text(
                    """
                    UPDATE public.locations
                    SET
                        name = :name,
                        latitude = :latitude,
                        longitude = :longitude,
                        radius_meters = :radius_meters,

                        coordinates = ST_SetSRID(
                            ST_MakePoint(
                                :longitude,
                                :latitude
                            ),
                            4326
                        )::geography

                    WHERE id = :location_id

                    RETURNING
                        id,
                        name,
                        latitude,
                        longitude,
                        radius_meters,
                        is_active
                    """
                ),
                {
                    "location_id": location_id,
                    "name": name,
                    "latitude": latitude,
                    "longitude": longitude,
                    "radius_meters": radius_meters,
                },
            )
            .mappings()
            .first()
        )

        db.commit()

        if not location:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Location was not updated.",
            )

        return {
            "success": True,
            "message": "Location updated successfully.",
            "location": location_to_dict(location),
        }

    except HTTPException:
        db.rollback()
        raise

    except SQLAlchemyError as exc:
        db.rollback()

        print("=" * 70)
        print("UPDATE LOCATION DATABASE ERROR")
        print("TYPE:", type(exc).__name__)
        print("ERROR:", repr(exc))
        print("STRING:", str(exc))
        print("=" * 70)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Database error while updating "
                "the workplace location: "
                + str(exc)
            ),
        )

    except Exception as exc:
        db.rollback()

        print("=" * 70)
        print("UPDATE LOCATION UNEXPECTED ERROR")
        print("TYPE:", type(exc).__name__)
        print("ERROR:", repr(exc))
        print("=" * 70)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unexpected error while updating "
                "the workplace location: "
                + str(exc)
            ),
        )


# ============================================================
# DEACTIVATE
# ============================================================

@router.patch(
    "/{location_id}/deactivate",
)
def deactivate_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    try:
        location = (
            db.execute(
                text(
                    """
                    UPDATE public.locations
                    SET is_active = FALSE
                    WHERE id = :location_id

                    RETURNING
                        id,
                        name,
                        latitude,
                        longitude,
                        radius_meters,
                        is_active
                    """
                ),
                {
                    "location_id": location_id,
                },
            )
            .mappings()
            .first()
        )

        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found.",
            )

        db.commit()

        return {
            "success": True,
            "message": "Location deactivated successfully.",
            "location": location_to_dict(location),
        }

    except HTTPException:
        db.rollback()
        raise

    except SQLAlchemyError as exc:
        db.rollback()

        print(
            "DEACTIVATE LOCATION DATABASE ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to deactivate location.",
        )


# ============================================================
# ACTIVATE
# ============================================================

@router.patch(
    "/{location_id}/activate",
)
def activate_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    try:
        location = (
            db.execute(
                text(
                    """
                    UPDATE public.locations
                    SET is_active = TRUE
                    WHERE id = :location_id

                    RETURNING
                        id,
                        name,
                        latitude,
                        longitude,
                        radius_meters,
                        is_active
                    """
                ),
                {
                    "location_id": location_id,
                },
            )
            .mappings()
            .first()
        )

        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found.",
            )

        db.commit()

        return {
            "success": True,
            "message": "Location activated successfully.",
            "location": location_to_dict(location),
        }

    except HTTPException:
        db.rollback()
        raise

    except SQLAlchemyError as exc:
        db.rollback()

        print(
            "ACTIVATE LOCATION ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to activate location.",
        )


# ============================================================
# DELETE
# ============================================================

@router.delete(
    "/{location_id}",
)
def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_admin(current_user)

    try:
        existing = db.execute(
            text(
                """
                SELECT id
                FROM public.locations
                WHERE id = :location_id
                """
            ),
            {
                "location_id": location_id,
            },
        ).first()

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found.",
            )

        db.execute(
            text(
                """
                DELETE FROM public.locations
                WHERE id = :location_id
                """
            ),
            {
                "location_id": location_id,
            },
        )

        db.commit()

        return {
            "success": True,
            "message": "Location deleted successfully.",
        }

    except HTTPException:
        db.rollback()
        raise

    except SQLAlchemyError as exc:
        db.rollback()

        print(
            "DELETE LOCATION DATABASE ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unable to delete location. "
                "It may be referenced by attendance records."
            ),
        )
