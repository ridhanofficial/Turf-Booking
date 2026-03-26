"""
Redis Hold Expiry Service
Background task that monitors expired booking holds and releases slots.

FIX (2026-03-03): replaced Redis key-existence check with a DB status check.
The old code treated an expired Redis TTL key the same as a completed payment,
leaving pending bookings stuck forever. We now query the DB as the single source
of truth, and also run an orphan sweep for old pending bookings with no Redis entry.
"""
import asyncio
import logging
import time
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, and_

from app.core.redis import get_redis
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.booking import Booking, BookingStatus
from app.services.booking_service import release_booking

logger = logging.getLogger(__name__)


async def process_expired_holds():
    """
    Check for expired hold keys in Redis and release corresponding bookings.
    Runs as a background task on startup.
    """
    redis = await get_redis()
    while True:
        try:
            now = time.time()

            # Get all booking IDs whose hold has expired (score <= now)
            expired_ids = await redis.zrangebyscore("hold_expiry_set", 0, now)

            for booking_id_str in expired_ids:
                booking_id = int(booking_id_str)
                hold_key = f"hold:{booking_id}"

                # ── DB is the source of truth ──────────────────────────────
                # We CANNOT use redis.exists(hold_key) here: the hold key has
                # the SAME TTL as the sorted-set score, so by the time we poll
                # it has already expired — exists() returns False for BOTH a
                # paid booking AND an unpaid one. Always check the DB instead.
                async with AsyncSessionLocal() as db:
                    result = await db.execute(
                        select(Booking.status).where(Booking.id == booking_id)
                    )
                    row = result.one_or_none()

                if row is None:
                    # Booking no longer exists — clean up Redis only
                    await redis.delete(hold_key)
                    await redis.zrem("hold_expiry_set", booking_id_str)
                    continue

                booking_status = row[0]

                if booking_status != BookingStatus.pending:
                    # confirmed or already cancelled — nothing to cancel
                    await redis.delete(hold_key)
                    await redis.zrem("hold_expiry_set", booking_id_str)
                    logger.info(
                        f"Hold cleanup: booking {booking_id} already {booking_status.value}"
                    )
                    continue

                # Still pending after hold timeout → auto-cancel
                logger.info(
                    f"Auto-cancelling booking {booking_id}: hold expired, payment not received"
                )
                async with AsyncSessionLocal() as db:
                    released = await release_booking(db, booking_id)
                    if released:
                        try:
                            await db.commit()
                            await redis.delete(hold_key)
                            await redis.zrem("hold_expiry_set", booking_id_str)
                            logger.info(
                                f"Booking {booking_id} auto-cancelled (hold expired)"
                            )
                        except Exception as commit_err:
                            # Leave sorted-set entry so next poll retries
                            logger.error(
                                f"Commit failed releasing booking {booking_id}: {commit_err}"
                            )
                    else:
                        # Already handled — clean up Redis
                        await redis.delete(hold_key)
                        await redis.zrem("hold_expiry_set", booking_id_str)

        except Exception as e:
            logger.error(f"Error in hold expiry processor: {e}")

        # ── Orphan sweep ───────────────────────────────────────────────────
        # Cancel pending bookings older than SLOT_HOLD_MINUTES that have no
        # Redis tracking (e.g. server restarted mid-hold, or bookings created
        # before this service was deployed).
        try:
            await _sweep_orphaned_pending_bookings(redis)
        except Exception as e:
            logger.error(f"Error in orphan sweep: {e}")

        await asyncio.sleep(30)  # Poll every 30 seconds


async def _sweep_orphaned_pending_bookings(redis) -> None:
    """
    Find pending bookings older than SLOT_HOLD_MINUTES with no active Redis
    hold entry and cancel them. This recovers bookings that were lost due to
    a server restart or pre-existing stale records.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.SLOT_HOLD_MINUTES)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Booking).where(
                and_(
                    Booking.status == BookingStatus.pending,
                    Booking.created_at < cutoff,
                )
            )
        )
        orphaned = result.scalars().all()

    for booking in orphaned:
        # Skip if still tracked in Redis sorted set (main loop will handle it)
        in_set = await redis.zscore("hold_expiry_set", str(booking.id))
        if in_set is not None:
            continue

        logger.info(
            f"Orphan sweep: auto-cancelling stale pending booking {booking.id} "
            f"(created {booking.created_at})"
        )
        async with AsyncSessionLocal() as db:
            released = await release_booking(db, booking.id)
            if released:
                try:
                    await db.commit()
                    await redis.delete(f"hold:{booking.id}")
                    logger.info(
                        f"Orphan sweep: cancelled booking {booking.id}"
                    )
                except Exception as e:
                    logger.error(
                        f"Orphan sweep commit failed for booking {booking.id}: {e}"
                    )


async def register_hold(booking_id: int):
    """Register a booking hold in the expiry sorted set."""
    redis = await get_redis()
    expiry_ts = time.time() + (settings.SLOT_HOLD_MINUTES * 60)
    await redis.zadd("hold_expiry_set", {str(booking_id): expiry_ts})
