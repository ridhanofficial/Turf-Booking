"""
Slot Scheduler — Auto-generates slots for all active turfs.
Runs as a background task: immediately on startup, then every 24 hours.
Generates slots for the next SLOT_LOOKAHEAD_DAYS (7) days.
Idempotent: skips dates that already have slots.

Rolling window guarantee:
  - Scheduler runs every 24 h, regenerating today + next 6 days.
  - Each day that passes, the oldest date falls off and the new 7th day is added.
  - New turfs get slots generated immediately via generate_slots_for_single_turf().
"""
import asyncio
import logging
from datetime import date, timedelta

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.turf import Turf, TurfStatus
from app.services.slot_service import generate_slots_for_turf

logger = logging.getLogger(__name__)

SLOT_LOOKAHEAD_DAYS = 30   # Rolling 30-day window — always keep exactly 30 days of slots
RUN_INTERVAL_SECONDS = 86_400  # 24 hours — each daily run adds the new 30th day



async def generate_slots_for_single_turf(turf_id: int) -> None:
    """
    Immediately generate the next SLOT_LOOKAHEAD_DAYS of slots for ONE turf.
    Called in a background task right after a new turf is created so that
    slots are available instantly without waiting for the next scheduler tick.
    Idempotent — safe to call multiple times (skips existing slots).
    """
    today = date.today()
    dates = [today + timedelta(days=i) for i in range(SLOT_LOOKAHEAD_DAYS)]
    created = 0

    try:
        async with AsyncSessionLocal() as db:
            for target_date in dates:
                try:
                    slots = await generate_slots_for_turf(db, turf_id, target_date)
                    if slots:
                        created += len(slots)
                except Exception as exc:
                    logger.error(
                        "generate_slots_for_single_turf: turf %d date %s: %s",
                        turf_id, target_date, exc,
                    )
                await asyncio.sleep(0)   # yield to event loop
    except Exception as exc:
        logger.error("generate_slots_for_single_turf: turf %d outer error: %s", turf_id, exc)

    logger.info(
        "generate_slots_for_single_turf: turf %d → %d slots created across %d days.",
        turf_id, created, SLOT_LOOKAHEAD_DAYS,
    )


async def _generate_for_all_turfs() -> None:
    """Generate slots for all active turfs for the next N days."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Turf).where(Turf.status == TurfStatus.active)
        )
        turfs = result.scalars().all()

    if not turfs:
        logger.info("Slot scheduler: no active turfs found, skipping.")
        return

    today = date.today()
    dates = [today + timedelta(days=i) for i in range(SLOT_LOOKAHEAD_DAYS)]
    created = 0
    skipped = 0

    for turf in turfs:
        # One session per turf instead of one per date — reduces connection overhead
        try:
            async with AsyncSessionLocal() as db:
                for target_date in dates:
                    try:
                        slots = await generate_slots_for_turf(db, turf.id, target_date)
                        if slots:
                            created += len(slots)
                        else:
                            skipped += 1
                    except Exception as exc:
                        logger.error(
                            "Slot scheduler error — turf %d date %s: %s",
                            turf.id, target_date, exc,
                        )
                    # Yield to event loop so HTTP requests can be served during startup
                    await asyncio.sleep(0)
        except Exception as exc:
            logger.error("Slot scheduler error — turf %d: %s", turf.id, exc)

    logger.info(
        "Slot scheduler: %d new slots created, %d date-turf combos already existed.",
        created, skipped,
    )


async def run_slot_scheduler() -> None:
    """Background loop — runs after a brief startup delay, then every 24 h."""
    # Wait a few seconds so the HTTP server can start accepting requests first.
    # Without this, the heavy slot generation queries starve the event loop on startup.
    await asyncio.sleep(5)
    logger.info("Slot scheduler started — running initial generation.")
    while True:
        try:
            await _generate_for_all_turfs()
        except Exception as exc:
            logger.error("Slot scheduler top-level error: %s", exc)
        await asyncio.sleep(RUN_INTERVAL_SECONDS)

