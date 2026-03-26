import enum

from sqlalchemy import (
    Column, Integer, String, DateTime, Enum as SAEnum,
    Boolean, Numeric, Time, Text
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base



class TurfStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class FacilityType(str, enum.Enum):
    full_pitch = "full_pitch"
    net_normal = "net_normal"
    net_cement = "net_cement"


class Turf(Base):
    __tablename__ = "turfs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    facility_type = Column(SAEnum(FacilityType, name='sporttype', create_constraint=False), nullable=False, index=True)
    description = Column(Text, nullable=True)
    operating_start_time = Column(Time, nullable=False)
    operating_end_time = Column(Time, nullable=False)
    slot_duration_minutes = Column(Integer, nullable=False, default=60)
    base_price = Column(Numeric(10, 2), nullable=False)
    bowling_machine_price = Column(Numeric(10, 2), nullable=True, server_default='200')  # net turfs only
    advance_payment_amount = Column(Numeric(10, 2), nullable=True)  # None = full payment only
    status = Column(SAEnum(TurfStatus, name='turfstatus', create_constraint=False), default=TurfStatus.active, nullable=False, index=True)
    image_urls = Column(JSONB, nullable=True, default=list)   # Native JSON array
    amenities = Column(JSONB, nullable=True, default=list)    # Native JSON array
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    slots = relationship("Slot", back_populates="turf", lazy="select")
    bookings = relationship("Booking", back_populates="turf", lazy="select")
    pricing_rules = relationship("PricingRule", back_populates="turf", lazy="select")
