from sqlalchemy import (
    BigInteger,
    Column,
    Float,
    Integer,
    String,
    TIMESTAMP,
)
from geoalchemy2 import Geography
from app.database.database import Base
class Location(Base):
    __tablename__ = "locations"
    id = Column(
        BigInteger,
        primary_key=True,
        index=True
    )
    name = Column(
        String(100),
        nullable=False
    )
    latitude = Column(
        Float,
        nullable=False
    )
    longitude = Column(
        Float,
        nullable=False
    )
    radius_meters = Column(
        Integer,
        nullable=False
    )
    created_at = Column(
        TIMESTAMP,
        nullable=False
    )
    coordinates = Column(
        Geography(
            geometry_type="POINT",
            srid=4326
        )
    )