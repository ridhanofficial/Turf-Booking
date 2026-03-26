from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from app.db.session import Base


class Feature(Base):
    __tablename__ = "features"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    extra_price = Column(Numeric(10, 2), nullable=False, default=0)

    booking_features = relationship("BookingFeature", back_populates="feature")


class BookingFeature(Base):
    __tablename__ = "booking_features"

    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), primary_key=True)
    feature_id = Column(Integer, ForeignKey("features.id", ondelete="CASCADE"), primary_key=True)

    booking = relationship("Booking", back_populates="booking_features")
    feature = relationship("Feature", back_populates="booking_features")
