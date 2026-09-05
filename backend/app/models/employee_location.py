from sqlalchemy import (
    BigInteger,
    Column,
    Float,
    TIMESTAMP,
    ForeignKey,
)
from app.database.database import Base


class EmployeeLocation(Base):
    __tablename__ = "employee_locations"

    id = Column(
        BigInteger,
        primary_key=True,
        index=True
    )

    user_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
        unique=True,
        index=True
    )

    latitude = Column(
        Float,
        nullable=False
    )

    longitude = Column(
        Float,
        nullable=False
    )

    accuracy_meters = Column(
        Float,
        nullable=True
    )

    updated_at = Column(
        TIMESTAMP,
        nullable=False
    )