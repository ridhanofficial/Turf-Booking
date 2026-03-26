import enum

from sqlalchemy import Column, Integer, Time, Numeric, ForeignKey, Enum as SAEnum, Index
from sqlalchemy.orm import relationship

from app.db.session import Base


class DayType(str, enum.Enum):
    weekday = "weekday"
    weekend = "weekend"
    all = "all"


class PricingRule(Base):
    __tablename__ = "pricing_rules"

    id = Column(Integer, primary_key=True, index=True)
    turf_id = Column(Integer, ForeignKey("turfs.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    day_type = Column(SAEnum(DayType), default=DayType.all, nullable=False)

    turf = relationship("Turf", back_populates="pricing_rules")

    __table_args__ = (
        Index("ix_pricing_rules_turf", "turf_id"),
    )
