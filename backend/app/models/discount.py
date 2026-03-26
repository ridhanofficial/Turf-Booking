import enum

from sqlalchemy import Column, Integer, DateTime, Date, Numeric, Boolean, Enum as SAEnum, String
from sqlalchemy.sql import func

from app.db.session import Base


class DiscountType(str, enum.Enum):
    flat = "flat"
    percent = "percent"


class Discount(Base):
    __tablename__ = "discounts"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), nullable=True, unique=True)
    type = Column(SAEnum(DiscountType), nullable=False)
    value = Column(Numeric(10, 2), nullable=False)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    # Optional: coupon only applies when user books >= min_slots slots.
    # NULL = no restriction.
    min_slots = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
