"""
Booking routes:
  POST   /bookings         — create booking (hold slots)
  GET    /bookings/me      — list current user's bookings
  POST   /bookings/{id}/cancel — cancel a booking + Razorpay refund
"""
import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.slot import Slot, SlotStatus
from app.models.turf import Turf
from app.schemas.booking import (
    BookingCreate, BookingResponse, MyBookingResponse, CancelBookingResponse,
)
from app.services.booking_service import create_booking, set_booking_hold, BookingError
from app.services.hold_service import register_hold
from app.services.payment_service import issue_refund
from app.utils.sms import send_cancellation_notice

router = APIRouter(prefix="/bookings", tags=["bookings"])

# Users can cancel up to this many hours before the booking date
CANCEL_CUTOFF_HOURS = 2


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking_endpoint(
    request: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # ── Guard: mobile number required ────────────────────────────────────────
    if not current_user.mobile_number:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please add your mobile number in your profile before booking.",
        )
    try:

        booking = await create_booking(
            db=db,
            user_id=current_user.id,
            turf_id=request.turf_id,
            booking_date=request.date,
            slot_ids=request.slot_ids,
            feature_ids=request.feature_ids,
            discount_code=request.discount_code,
            with_bowling_machine=request.with_bowling_machine,
        )
        # Commit the transaction — session is now clean
        await db.commit()
        await db.refresh(booking)

        # Set Redis hold AFTER commit so the booking ID is stable
        await set_booking_hold(booking.id, request.slot_ids)
        await register_hold(booking.id)

        return BookingResponse(
            id=booking.id,
            user_id=booking.user_id,
            turf_id=booking.turf_id,
            date=booking.date,
            total_price=booking.total_price,
            status=booking.status,
            razorpay_order_id=booking.razorpay_order_id,
            with_bowling_machine=booking.with_bowling_machine,
            created_at=booking.created_at,
        )
    except BookingError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))



@router.get("/me", response_model=List[MyBookingResponse])
async def get_my_bookings(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all bookings for the currently authenticated user, newest first, with pagination."""
    result = await db.execute(
        select(Booking, Turf.name.label("turf_name"))
        .join(Turf, Booking.turf_id == Turf.id)
        .where(Booking.user_id == current_user.id)
        .order_by(Booking.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = result.all()
    return [
        MyBookingResponse(
            id=b.id,
            user_id=b.user_id,
            turf_id=b.turf_id,
            turf_name=turf_name,
            date=b.date,
            total_price=b.total_price,
            status=b.status,
            razorpay_order_id=b.razorpay_order_id,
            created_at=b.created_at,
        )
        for b, turf_name in rows
    ]


@router.post("/{booking_id}/cancel", response_model=CancelBookingResponse)
async def cancel_booking(
    booking_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel a booking owned by the current user.
    - Pending bookings: cancelled immediately, slots freed.
    - Confirmed bookings: cancelled if CANCEL_CUTOFF_HOURS before booking date,
      Razorpay refund issued automatically.
    """
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.id == booking_id,
                Booking.user_id == current_user.id,
            )
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status not in (BookingStatus.pending, BookingStatus.confirmed):
        raise HTTPException(status_code=400, detail=f"Cannot cancel a booking with status '{booking.status}'")

    # Enforce cancellation cutoff for confirmed bookings
    now_utc = datetime.now(timezone.utc)

    # Get the earliest slot start time for the booking
    earliest_slot_result = await db.execute(
        select(Slot.start_time)
        .where(Slot.booking_id == booking_id)
        .order_by(Slot.start_time)
        .limit(1)
    )
    earliest_slot_time = earliest_slot_result.scalar_one_or_none()

    if earliest_slot_time is None:
        raise HTTPException(status_code=500, detail="Booking has no associated slots.")

    booking_start_datetime = datetime.combine(booking.date, earliest_slot_time).replace(tzinfo=timezone.utc)

    if booking.status == BookingStatus.confirmed:
        if now_utc >= booking_start_datetime - timedelta(hours=CANCEL_CUTOFF_HOURS):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel within {CANCEL_CUTOFF_HOURS} hours of the booking start time",
            )

    # Capture whether this was a confirmed (paid) booking BEFORE changing status
    was_confirmed = booking.status == BookingStatus.confirmed

    # Free the slots
    slots_result = await db.execute(
        select(Slot).where(Slot.booking_id == booking_id)
    )
    for slot in slots_result.scalars().all():
        slot.status = SlotStatus.available
        slot.booking_id = None

    booking.status = BookingStatus.cancelled

    # Attempt Razorpay refund for confirmed bookings that were paid
    refund_initiated = False
    if was_confirmed and booking.razorpay_payment_id:
        try:
            # Use the actual amount charged (advance or full), not the total booking price
            refund_amount = booking.amount_paid or booking.total_price
            amount_paise = int(Decimal(str(refund_amount)) * 100)
            issue_refund(booking.razorpay_payment_id, amount_paise)
            refund_initiated = True
        except Exception as exc:
            # Log but don't block the cancellation
            logging.getLogger(__name__).error("Refund failed for booking %d: %s", booking_id, exc)

    await db.commit()

    # Send cancellation SMS (non-blocking)
    turf_result = await db.execute(select(Turf).where(Turf.id == booking.turf_id))
    turf = turf_result.scalar_one_or_none()
    turf_name = turf.name if turf else "Turf"
    background_tasks.add_task(
        send_cancellation_notice,
        mobile=current_user.mobile_number,
        turf_name=turf_name,
        booking_date=booking.date,
        amount=Decimal(str(booking.total_price)),
        booking_id=booking.id,
    )

    return CancelBookingResponse(
        success=True,
        message="Booking cancelled. Refund will be processed in 3–5 business days." if refund_initiated
                else "Booking cancelled successfully.",
        booking_id=booking.id,
        refund_initiated=refund_initiated,
    )
