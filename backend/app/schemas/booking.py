from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel

from app.models.booking import BookingStatus


class BookingCreate(BaseModel):
    turf_id: int
    date: date
    slot_ids: List[int]
    feature_ids: Optional[List[int]] = []
    discount_code: Optional[str] = None
    with_bowling_machine: bool = False


class BookingResponse(BaseModel):
    id: int
    user_id: int
    turf_id: int
    date: date
    total_price: Decimal
    status: BookingStatus
    razorpay_order_id: Optional[str] = None
    with_bowling_machine: bool = False
    payment_type: Optional[str] = None   # 'full' | 'advance'
    amount_paid: Optional[Decimal] = None
    # Passed from turf so frontend knows advance option is available
    advance_payment_amount: Optional[Decimal] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BookingDetailResponse(BookingResponse):
    slots: List[dict] = []
    features: List[dict] = []


class MyBookingResponse(BookingResponse):
    """Booking with turf name — used for GET /bookings/me."""
    turf_name: str


class CancelBookingResponse(BaseModel):
    success: bool
    message: str
    booking_id: int
    refund_initiated: bool = False
