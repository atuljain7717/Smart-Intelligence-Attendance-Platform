from sqlalchemy import BigInteger, Column, Date, Float, String, TIMESTAMP
from app.database.database import Base
class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(
        BigInteger,
        primary_key=True,
        index=True
    )
    user_id = Column(
        BigInteger,
        nullable=False,
        index=True
    )
    attendance_data = Column(
        Date,
        nullable=False,
        index=True
    )
    check_in = Column(
        TIMESTAMP,
        nullable=False
    )
    check_out = Column(
        TIMESTAMP,
        nullable=True
    )
    status = Column(
        String(50),
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
    location_id = Column(
        BigInteger,
        nullable=False
    )