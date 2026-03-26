"""
Booking Service
---------------
Core business logic for creating, holding, and releasing bookings.

Symbols exported (all imported by routes/bookings.py, routes/payments.py,
and services/hold_service.py):

  BookingError          — raised for business-logic conflicts (HTTP 409)
  create_booking(...)   — validate slots, apply pricing/discounts, persist Booking
  set_booking_hold(...) — store slot IDs in Redis with a TTL hold
  release_booking(...)  — cancel a pending booking and free its slots
"""
import json
import logging
from datetime import date
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import get_redis
from app.models.booking import Booking, BookingStatus
from app.models.discount import Discount, DiscountType
from app.models.feature import Feature, BookingFeature
from app.models.slot import Slot, SlotStatus
from app.models.turf import Turf

logger = logging.getLogger(__name__)


# ── Custom exception ──────────────────────────────────────────────────────────

class BookingError(Exception):
    """Raised for booking business-logic conflicts (e.g. slot unavailable)."""


# ── Main booking creation ─────────────────────────────────────────────────────

async def create_booking(
    db: AsyncSession,
    user_id: int,
    turf_id: int,
    booking_date: date,
    slot_ids: List[int],
    feature_ids: Optional[List[int]] = None,
    discount_code: Optional[str] = None,
    with_bowling_machine: bool = False,
) -> Booking:
    """
    Validate slot availability, compute total price (with optional features and
    discount), create a Booking row, and mark the requested slots as 'held'.

    Raises:
        BookingError: If any slot is unavailable or inputs are invalid.
    """
    if not slot_ids:
        raise BookingError("No slot IDs provided.")

    # ── 1. Load and validate slots ────────────────────────────────────────────
    result = await db.execute(
        select(Slot).where(
            and_(
                Slot.id.in_(slot_ids),
                Slot.turf_id == turf_id,
                Slot.date == booking_date,
            )
        )
    )
    slots = result.scalars().all()

    if len(slots) != len(slot_ids):
        found_ids = {s.id for s in slots}
        missing = set(slot_ids) - found_ids
        raise BookingError(f"Slots not found or not on the requested date: {missing}")

    unavailable = [s for s in slots if s.status != SlotStatus.available]
    if unavailable:
        ids = [s.id for s in unavailable]
        raise BookingError(
            f"Slot(s) {ids} are no longer available "
            f"(status: {[s.status.value for s in unavailable]})"
        )

    # ── 2. Base price: sum of slot prices ────────────────────────────────────
    total_price = sum(Decimal(str(s.price)) for s in slots)

    # ── 3. Bowling machine add-on ─────────────────────────────────────────────
    if with_bowling_machine:
        turf_result = await db.execute(select(Turf).where(Turf.id == turf_id))
        turf = turf_result.scalar_one_or_none()
        if turf and turf.bowling_machine_price:
            # Charge per slot booked
            total_price += Decimal(str(turf.bowling_machine_price)) * len(slots)

    # ── 4. Optional features ─────────────────────────────────────────────────
    features: List[Feature] = []
    if feature_ids:
        feat_result = await db.execute(
            select(Feature).where(Feature.id.in_(feature_ids))
        )
        features = feat_result.scalars().all()
        for feature in features:
            total_price += Decimal(str(feature.extra_price))

    # ── 5. Optional discount ──────────────────────────────────────────────────
    if discount_code:
        from datetime import date as dt_date
        today = dt_date.today()
        discount_result = await db.execute(
            select(Discount).where(
                and_(
                    Discount.code == discount_code,
                    Discount.is_active.is_(True),
                    Discount.valid_from <= today,
                    Discount.valid_to >= today,
                )
            )
        )
        discount = discount_result.scalar_one_or_none()
        if discount:
            if discount.type == DiscountType.flat:
                total_price = max(Decimal("0"), total_price - Decimal(str(discount.value)))
            elif discount.type == DiscountType.percent:
                reduction = (total_price * Decimal(str(discount.value)) / Decimal("100")).quantize(Decimal("0.01"))
                total_price = max(Decimal("0"), total_price - reduction)
        else:
            logger.warning("Discount code '%s' is invalid or expired.", discount_code)

    # ── 6. Create Booking row ─────────────────────────────────────────────────
    booking = Booking(
        user_id=user_id,
        turf_id=turf_id,
        date=booking_date,
        total_price=total_price,
        status=BookingStatus.pending,
        with_bowling_machine=with_bowling_machine,
    )
    db.add(booking)
    # Flush to get the PK without committing (caller commits)
    await db.flush()

    # ── 7. Attach BookingFeature join rows ────────────────────────────────────
    for feature in features:
        db.add(BookingFeature(booking_id=booking.id, feature_id=feature.id))

    # ── 8. Mark slots as held ────────────────────────────────────────────────
    for slot in slots:
        slot.status = SlotStatus.held
        slot.booking_id = booking.id

    await db.flush()
    logger.info(
        "Booking %d created for user %d, turf %d, date %s, total=%.2f",
        booking.id, user_id, turf_id, booking_date, total_price,
    )
    return booking


# ── Redis hold ────────────────────────────────────────────────────────────────

async def set_booking_hold(booking_id: int, slot_ids: List[int]) -> None:
    """
    Store the list of held slot IDs in Redis with a TTL of SLOT_HOLD_MINUTES.
    Key format: hold:{booking_id}  →  JSON-encoded list of slot IDs.
    """
    redis = await get_redis()
    ttl_seconds = settings.SLOT_HOLD_MINUTES * 60
    await redis.set(
        f"hold:{booking_id}",
        json.dumps(slot_ids),
        ex=ttl_seconds,
    )
    logger.debug("Redis hold set: booking=%d slots=%s ttl=%ds", booking_id, slot_ids, ttl_seconds)


# ── Release / cancel booking ──────────────────────────────────────────────────

async def release_booking(db: AsyncSession, booking_id: int) -> bool:
    """
    Cancel a pending booking and free its held/pending slots back to 'available'.

    Returns:
        True  — booking was found and cancelled.
        False — booking not found, or already in a terminal state (no action taken).
    """
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()

    if booking is None:
        logger.warning("release_booking: booking %d not found.", booking_id)
        return False

    if booking.status != BookingStatus.pending:
        logger.info(
            "release_booking: booking %d is '%s' — skipping.",
            booking_id, booking.status.value,
        )
        return False

    # Free slots that belong to this booking
    slots_result = await db.execute(
        select(Slot).where(Slot.booking_id == booking_id)
    )
    for slot in slots_result.scalars().all():
        slot.status = SlotStatus.available
        slot.booking_id = None

    booking.status = BookingStatus.cancelled
    await db.flush()

    logger.info("Booking %d released (slots freed, status → cancelled).", booking_id)
    return True
