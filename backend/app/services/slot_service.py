"""
Slot Generation Service
Generates time slots for a turf on a given date.
Idempotent: skips if slots already exist for that turf+date.
"""
import json
from datetime import date, time, datetime, timedelta
from decimal import Decimal
from typing import List

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.slot import Slot, SlotStatus
from app.models.turf import Turf
from app.models.pricing_rule import PricingRule, DayType


def _combine(d: date, t: time) -> datetime:
    return datetime.combine(d, t)


def _get_day_type(d: date) -> str:
    """Returns 'weekday' or 'weekend'"""
    return "weekend" if d.weekday() >= 5 else "weekday"


def _find_price(
    start: time,
    end: time,
    pricing_rules: List[PricingRule],
    day_type: str,
    base_price: Decimal,
) -> Decimal:
    """
    Find the best matching pricing rule for a slot.
    Priority: exact day_type match > 'all' > base_price
    """
    best_price = None
    best_priority = -1

    for rule in pricing_rules:
        # Check time overlap
        if rule.start_time <= start and rule.end_time >= end:
            if rule.day_type.value == day_type:
                priority = 2
            elif rule.day_type.value == "all":
                priority = 1
            else:
                continue

            if priority > best_priority:
                best_priority = priority
                best_price = rule.price

    return best_price if best_price is not None else base_price


async def generate_slots_for_turf(
    db: AsyncSession,
    turf_id: int,
    target_date: date,
) -> List[Slot]:
    """
    Generate slots for a turf on a given date.
    Returns existing slots if already generated.
    """
    # Check if slots already exist
    existing = await db.execute(
        select(Slot).where(
            and_(Slot.turf_id == turf_id, Slot.date == target_date)
        )
    )
    existing_slots = existing.scalars().all()
    if existing_slots:
        return list(existing_slots)

    # Load turf
    turf_result = await db.execute(select(Turf).where(Turf.id == turf_id))
    turf = turf_result.scalar_one_or_none()
    if not turf:
        raise ValueError(f"Turf {turf_id} not found")

    # Load pricing rules
    rules_result = await db.execute(
        select(PricingRule).where(PricingRule.turf_id == turf_id)
    )
    pricing_rules = rules_result.scalars().all()

    day_type = _get_day_type(target_date)
    duration = timedelta(minutes=turf.slot_duration_minutes)

    # Generate slots
    current_dt = _combine(target_date, turf.operating_start_time)
    end_dt = _combine(target_date, turf.operating_end_time)

    new_slots = []
    while current_dt + duration <= end_dt:
        slot_start = current_dt.time()
        slot_end = (current_dt + duration).time()

        price = _find_price(
            slot_start, slot_end, pricing_rules, day_type, turf.base_price
        )

        slot = Slot(
            turf_id=turf_id,
            date=target_date,
            start_time=slot_start,
            end_time=slot_end,
            price=price,
            status=SlotStatus.available,
        )
        db.add(slot)
        new_slots.append(slot)
        current_dt += duration

    await db.commit()
    # Refresh to get IDs
    for slot in new_slots:
        await db.refresh(slot)

    return new_slots


async def generate_slots_for_turf_range(turf_id: int, days: int = 7) -> None:
    """
    Generate slots for a turf for the next `days` days (starting today).
    Uses one DB session per date — safe to call as an asyncio background task.
    Idempotent: skips dates that already have slots.
    """
    from app.db.session import AsyncSessionLocal
    from datetime import date, timedelta
    import logging

    _log = logging.getLogger(__name__)
    today = date.today()
    dates = [today + timedelta(days=i) for i in range(days)]
    _log.info("Auto slot generation started: turf=%d days=%d", turf_id, days)

    created_total = 0
    for target_date in dates:
        # One fresh session per date — prevents a single bad commit from
        # corrupting the session used by all subsequent dates.
        try:
            async with AsyncSessionLocal() as db:
                slots = await generate_slots_for_turf(db, turf_id, target_date)
                created_total += len(slots)
                _log.info(
                    "Auto slot gen: turf=%d date=%s → %d slots",
                    turf_id, target_date, len(slots),
                )
        except Exception as exc:
            _log.error(
                "Auto slot generation error — turf %d date %s: %s",
                turf_id, target_date, exc,
            )

    _log.info("Auto slot generation complete: turf=%d total_slots=%d", turf_id, created_total)
