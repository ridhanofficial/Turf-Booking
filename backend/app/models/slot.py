import enum

from sqlalchemy import (
    Column, Integer, String, DateTime, Date, Time,
    Enum as SAEnum, Numeric, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class SlotStatus(str, enum.Enum):
    available = "available"
    held = "held"
    booked = "booked"
    disabled = "disabled"


class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, index=True)
    turf_id = Column(Integer, ForeignKey("turfs.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    status = Column(SAEnum(SlotStatus), default=SlotStatus.available, nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    turf = relationship("Turf", back_populates="slots")
    booking = relationship("Booking", back_populates="slots", foreign_keys=[booking_id])

    __table_args__ = (
        Index("ix_slots_turf_date", "turf_id", "date"),
        Index("ix_slots_turf_date_status", "turf_id", "date", "status"),
    )
