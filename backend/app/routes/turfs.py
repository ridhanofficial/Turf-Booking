from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, and_, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.turf import Turf, TurfStatus, FacilityType
from app.models.slot import Slot
from app.models.feature import Feature
from app.schemas.turf import TurfResponse
from app.schemas.slot import SlotResponse
from app.schemas.admin import FeatureResponse
from app.services.slot_service import generate_slots_for_turf

router = APIRouter(prefix="/turfs", tags=["turfs"])



@router.get("", response_model=List[TurfResponse])
async def list_turfs(
    facility_type: Optional[FacilityType] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Turf).where(Turf.status == TurfStatus.active)
    if facility_type:
        query = query.where(Turf.facility_type == facility_type)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    turfs = result.scalars().all()

    return [
        TurfResponse(
            id=t.id,
            name=t.name,
            facility_type=t.facility_type,
            description=t.description,
            operating_start_time=t.operating_start_time,
            operating_end_time=t.operating_end_time,
            slot_duration_minutes=t.slot_duration_minutes,
            base_price=t.base_price,
            bowling_machine_price=t.bowling_machine_price,
            advance_payment_amount=t.advance_payment_amount,
            status=t.status,
            image_urls=t.image_urls or [],
            amenities=t.amenities or [],
        )
        for t in turfs
    ]


@router.get("/{turf_id}", response_model=TurfResponse)
async def get_turf(turf_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Turf).where(Turf.id == turf_id))
    turf = result.scalar_one_or_none()
    if not turf:
        raise HTTPException(status_code=404, detail="Turf not found")

    return TurfResponse(
        id=turf.id,
        name=turf.name,
        facility_type=turf.facility_type,
        description=turf.description,
        operating_start_time=turf.operating_start_time,
        operating_end_time=turf.operating_end_time,
        slot_duration_minutes=turf.slot_duration_minutes,
        base_price=turf.base_price,
        bowling_machine_price=turf.bowling_machine_price,
        advance_payment_amount=turf.advance_payment_amount,
        status=turf.status,
        image_urls=turf.image_urls or [],
        amenities=turf.amenities or [],
    )


@router.get("/{turf_id}/available-dates")
async def get_available_dates(
    turf_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Return a sorted list of date strings (YYYY-MM-DD) for which at least one
    slot exists for this turf, from today onward.
    The frontend uses this to grey-out days with no generated slots in the calendar.
    """
    today = date.today()
    result = await db.execute(
        select(distinct(Slot.date))
        .where(
            and_(
                Slot.turf_id == turf_id,
                Slot.date >= today,
            )
        )
        .order_by(Slot.date)
    )
    dates = [str(row[0]) for row in result.fetchall()]
    return {"dates": dates}


@router.get("/{turf_id}/slots", response_model=List[SlotResponse])

async def get_turf_slots(
    request: Request,
    turf_id: int,
    date: date = Query(..., description="Date in YYYY-MM-DD format"),
    db: AsyncSession = Depends(get_db),
):
    from app.models.booking import Booking, BookingStatus
    from app.core.security import decode_token
    from app.core.config import settings

    # Verify turf exists and is active
    turf_result = await db.execute(
        select(Turf).where(and_(Turf.id == turf_id, Turf.status == TurfStatus.active))
    )
    turf = turf_result.scalar_one_or_none()
    if not turf:
        raise HTTPException(status_code=404, detail="Turf not found or inactive")

    is_net = turf.facility_type in (FacilityType.net_normal, FacilityType.net_cement)

    # Fetch existing slots; generate on-demand only if the scheduler hasn't run yet
    existing = await db.execute(
        select(Slot)
        .where(and_(Slot.turf_id == turf_id, Slot.date == date))
        .order_by(Slot.start_time)
    )
    slots = existing.scalars().all()
    if not slots:
        slots = await generate_slots_for_turf(db, turf_id, date)

    # ── Optional auth: find which held slots belong to the requesting user ──────
    my_held_slot_ids: set[int] = set()
    auth_header = request.headers.get("authorization", "") if request else ""
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token, secret_key=settings.JWT_SECRET_KEY)
        if payload and payload.get("type") == "user":
            user_id = int(payload.get("sub", 0))
            # Find pending bookings by this user for this turf+date
            pending_result = await db.execute(
                select(Booking).where(
                    and_(
                        Booking.user_id == user_id,
                        Booking.turf_id == turf_id,
                        Booking.date == date,
                        Booking.status == BookingStatus.pending,
                    )
                )
            )
            pending_bookings = pending_result.scalars().all()
            if pending_bookings:
                booking_ids = [b.id for b in pending_bookings]
                my_slots_result = await db.execute(
                    select(Slot.id).where(Slot.booking_id.in_(booking_ids))
                )
                my_held_slot_ids = {row[0] for row in my_slots_result.fetchall()}

    # For net turfs: one batch query to find ALL machine-booked time windows on this date
    machine_blocked_windows: list[tuple] = []
    if is_net:
        blocked_result = await db.execute(
            select(Slot.start_time, Slot.end_time)
            .join(Booking, Slot.booking_id == Booking.id)
            .join(Turf, Turf.id == Booking.turf_id)
            .where(
                and_(
                    Booking.date == date,
                    Booking.with_bowling_machine == True,
                    Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
                    Turf.facility_type.in_([FacilityType.net_normal, FacilityType.net_cement]),
                )
            )
        )
        machine_blocked_windows = blocked_result.fetchall()  # list of (start_time, end_time)

    def is_machine_available_for(slot: Slot) -> bool:
        """True if no existing machine booking overlaps this slot's window."""
        for (bk_start, bk_end) in machine_blocked_windows:
            if slot.start_time < bk_end and slot.end_time > bk_start:
                return False
        return True

    return [
        SlotResponse(
            id=s.id,
            turf_id=s.turf_id,
            date=s.date,
            start_time=s.start_time,
            end_time=s.end_time,
            price=s.price,
            status=s.status,
            machine_available=is_machine_available_for(s) if is_net else None,
            held_by_me=s.id in my_held_slot_ids,
        )
        for s in slots
    ]



@router.get("/{turf_id}/machine-availability")
async def check_machine_availability(
    turf_id: int,
    date: date = Query(...),
    slot_ids: str = Query(..., description="Comma-separated slot IDs"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns { available: bool } — True if the bowling machine is free
    for the requested time window across ALL nets at the venue.
    One machine is shared: a booking on any net blocks it for all others.
    """
    from app.models.booking import Booking, BookingStatus
    from app.models.turf import Turf

    # Parse slot_ids
    try:
        ids = [int(x) for x in slot_ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="slot_ids must be comma-separated integers")

    if not ids:
        return {"available": True}

    # Fetch the requested slots to get their time range
    slots_result = await db.execute(
        select(Slot).where(and_(Slot.id.in_(ids), Slot.turf_id == turf_id, Slot.date == date))
    )
    slots = slots_result.scalars().all()
    if not slots:
        return {"available": True}

    booked_start = min(s.start_time for s in slots)
    booked_end   = max(s.end_time   for s in slots)

    # Check ALL net-type turf bookings that overlap this window on this date.
    # The machine is a single shared venue resource — any conflicting net booking blocks it.
    from sqlalchemy import func

    conflict_result = await db.execute(
        select(func.count(Booking.id))
        .join(Slot, Slot.booking_id == Booking.id)
        .join(Turf, Turf.id == Booking.turf_id)
        .where(
            and_(
                Booking.date == date,
                Booking.with_bowling_machine == True,
                Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
                Turf.facility_type.in_([FacilityType.net_normal, FacilityType.net_cement]),
                Slot.start_time < booked_end,
                Slot.end_time   > booked_start,
            )
        )
    )
    machine_taken = (conflict_result.scalar() or 0) > 0
    return {"available": not machine_taken}

