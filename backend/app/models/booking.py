import enum

from sqlalchemy import (
    Column, Integer, DateTime, Date, Numeric,
    Enum as SAEnum, ForeignKey, String, Boolean, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    turf_id = Column(Integer, ForeignKey("turfs.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    status = Column(SAEnum(BookingStatus), default=BookingStatus.pending, nullable=False, index=True)
    razorpay_order_id = Column(String(255), nullable=True, unique=True)
    razorpay_payment_id = Column(String(255), nullable=True)
    with_bowling_machine = Column(Boolean, default=False, nullable=False, server_default='false')
    payment_type = Column(String(10), nullable=True)   # 'full' | 'advance'
    amount_paid = Column(Numeric(10, 2), nullable=True)  # actual amount charged to Razorpay
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="bookings")
    turf = relationship("Turf", back_populates="bookings")
    slots = relationship("Slot", back_populates="booking", foreign_keys="Slot.booking_id")
    booking_features = relationship("BookingFeature", back_populates="booking", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_bookings_user_turf_date", "user_id", "turf_id", "date"),
        Index("ix_bookings_status", "status"),
    )
