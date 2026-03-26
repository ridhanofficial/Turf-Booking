from pydantic import BaseModel
from decimal import Decimal
from typing import Optional


class CreateOrderRequest(BaseModel):
    booking_id: int
    payment_type: str = 'full'   # 'full' | 'advance'


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int          # in paise — the amount Razorpay will charge
    currency: str
    key: str
    booking_id: int
    total_price: Decimal          # full booking total
    amount_paid: Decimal          # what is being charged now
    payment_type: str             # 'full' | 'advance'
    remaining_amount: Decimal     # total_price - amount_paid (0 if full)


class VerifyPaymentRequest(BaseModel):
    booking_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentVerifyResponse(BaseModel):
    success: bool
    message: str
    booking_id: Optional[int] = None
