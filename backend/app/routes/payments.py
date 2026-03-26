"""
Razorpay payment routes:
  POST /payments/create-order  — create Razorpay order (full OR advance)
  POST /payments/verify        — verify payment, confirm booking, send email
"""
import logging
from decimal import Decimal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.slot import Slot, SlotStatus
from app.models.turf import Turf
from app.schemas.payment import (
    CreateOrderRequest, CreateOrderResponse,
    VerifyPaymentRequest, PaymentVerifyResponse,
)
from app.services.payment_service import create_razorpay_order, verify_razorpay_signature
from app.services.booking_service import release_booking
from app.core.config import settings
from app.core.redis import get_redis
from app.utils.sms import send_booking_confirmation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_order(
    request: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.id == request.booking_id,
                Booking.user_id == current_user.id,
                Booking.status == BookingStatus.pending,
            )
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or not in pending state")

    # Fetch turf to get advance_payment_amount
    turf_result = await db.execute(select(Turf).where(Turf.id == booking.turf_id))
    turf = turf_result.scalar_one_or_none()

    total_price = Decimal(str(booking.total_price))

    # Determine the amount to charge
    payment_type = request.payment_type
    if payment_type == 'advance' and turf and turf.advance_payment_amount:
        # Validate advance amount doesn't exceed total
        advance = Decimal(str(turf.advance_payment_amount))
        if advance >= total_price:
            # Advance >= total: treat as full payment
            payment_type = 'full'
            amount_to_charge = total_price
        else:
            amount_to_charge = advance
    else:
        payment_type = 'full'
        amount_to_charge = total_price

    remaining = total_price - amount_to_charge

    try:
        import asyncio
        order = await asyncio.to_thread(
            create_razorpay_order, float(amount_to_charge), booking.id
        )
        booking.razorpay_order_id = order["id"]
        booking.payment_type = payment_type
        booking.amount_paid = amount_to_charge
        await db.commit()

        return CreateOrderResponse(
            order_id=order["id"],
            amount=order["amount"],
            currency=order["currency"],
            key=settings.RAZORPAY_KEY_ID,
            booking_id=booking.id,
            total_price=total_price,
            amount_paid=amount_to_charge,
            payment_type=payment_type,
            remaining_amount=remaining,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment order creation failed: {str(e)}")


@router.post("/verify", response_model=PaymentVerifyResponse)
async def verify_payment(
    request: VerifyPaymentRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.id == request.booking_id,
                Booking.user_id == current_user.id,
                Booking.status == BookingStatus.pending,
            )
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    is_valid = verify_razorpay_signature(
        request.razorpay_order_id,
        request.razorpay_payment_id,
        request.razorpay_signature,
    )

    if is_valid:
        # Confirm booking
        booking.status = BookingStatus.confirmed
        booking.razorpay_payment_id = request.razorpay_payment_id

        # Mark slots as booked
        slots_result = await db.execute(
            select(Slot).where(Slot.booking_id == booking.id)
        )
        slots = slots_result.scalars().all()
        for slot in slots:
            slot.status = SlotStatus.booked

        await db.commit()

        # Remove Redis hold
        redis = await get_redis()
        await redis.delete(f"hold:{booking.id}")

        # Build slot time strings for SMS
        slot_times = [
            f"{s.start_time.strftime('%H:%M')}–{s.end_time.strftime('%H:%M')}"
            for s in slots
        ]

        # Fetch turf name for SMS
        turf_name = "Turf"
        try:
            turf_result = await db.execute(select(Turf).where(Turf.id == booking.turf_id))
            turf = turf_result.scalar_one_or_none()
            if turf:
                turf_name = turf.name
        except Exception:
            pass

        # Send confirmation email in background (non-blocking)
        background_tasks.add_task(
            send_booking_confirmation,
            email=current_user.email or "",
            turf_name=turf_name,
            booking_date=booking.date,
            amount=Decimal(str(booking.amount_paid or booking.total_price)),
            booking_id=booking.id,
            slot_times=slot_times,
        )
        logger.info("Email task queued for booking %d to %s", booking.id, current_user.email)

        return PaymentVerifyResponse(
            success=True,
            message="Payment verified. Booking confirmed!",
            booking_id=booking.id,
        )
    else:
        await release_booking(db, booking.id)
        await db.commit()
        return PaymentVerifyResponse(
            success=False,
            message="Payment verification failed. Slots released.",
        )


@router.get("/test-email")
async def test_email(
    current_user: User = Depends(get_current_user),
):
    """Quick test endpoint — sends a test confirmation email to the logged-in user."""
    from datetime import date as dt_date
    email = current_user.email
    if not email:
        raise HTTPException(status_code=400, detail="No email address on your account")
    send_booking_confirmation(
        email=email,
        turf_name="Test Turf",
        booking_date=dt_date.today(),
        amount=Decimal("0.00"),
        booking_id=0,
        slot_times=["06:00–07:00"],
    )
    return {"message": f"Test email sent to {email}"}
