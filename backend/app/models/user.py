from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    ForeignKey,
    Integer,
    String,
    TIMESTAMP,
)

from app.database.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        BigInteger,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(100),
        nullable=False,
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False,
    )

    password_hash = Column(
        String(255),
        nullable=False,
    )

    role = Column(
        String(50),
        nullable=False,
        default="employee",
    )

    location_id = Column(
        Integer,
        ForeignKey("locations.id"),
        nullable=True,
    )

    created_at = Column(
        TIMESTAMP,
        nullable=False,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )