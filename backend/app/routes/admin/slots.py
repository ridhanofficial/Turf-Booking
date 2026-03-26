"""
Admin slot management:
  GET   /admin/slots                  — list slots for a turf on a date
  PATCH /admin/slots/{id}             — override slot price or status
  POST  /admin/slots/generate         — generate for one turf+date
  POST  /admin/slots/generate-bulk    — generate for one turf across a date range
  POST  /admin/slots/block            — block (or unblock) multiple slots on a date
  GET   /admin/slots/booked           — all booked slots with customer details
"""
from datetime import date, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel
from sqlalchemy import select, func, and_, update as sql_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.deps import get_current_admin
from app.models.admin import Admin
from app.models.booking import Booking, BookingStatus
from app.models.slot import Slot, SlotStatus
from app.models.turf import Turf
from app.models.user import User
from app.schemas.slot import SlotOverrideRequest, SlotResponse
from app.services.slot_service import generate_slots_for_turf

router = APIRouter(prefix="/admin/slots", tags=["admin-slots"])


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[SlotResponse])
async def get_slots(
    turf_id: int = Query(...),
    date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(
        select(Slot).where(
            and_(Slot.turf_id == turf_id, Slot.date == date)
        )
    )
    return result.scalars().all()


# ── Override ──────────────────────────────────────────────────────────────────

@router.patch("/{slot_id}", response_model=SlotResponse)
async def override_slot(
    slot_id: int,
    data: SlotOverrideRequest,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(select(Slot).where(Slot.id == slot_id))
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    if data.price is not None:
        slot.price = data.price
    if data.status is not None:
        slot.status = data.status

    await db.commit()
    await db.refresh(slot)
    return slot


# ── Generate single day ───────────────────────────────────────────────────────

@router.post("/generate", status_code=201)
async def generate_slots(
    turf_id: int = Query(...),
    date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Generate slots for a single turf on a single date."""
    slots = await generate_slots_for_turf(db, turf_id, date)
    return {"generated": len(slots), "turf_id": turf_id, "date": str(date)}


# ── Generate bulk ─────────────────────────────────────────────────────────────

class BulkGenerateRequest(BaseModel):
    turf_id: int
    start_date: date
    days: int = 30  # number of days from start_date (max 365)


class BulkGenerateResponse(BaseModel):
    turf_id: int
    start_date: str
    days_requested: int
    days_generated: int
    slots_created: int
    days_skipped: int   # already had slots


@router.post("/generate-bulk", response_model=BulkGenerateResponse, status_code=201)
async def generate_slots_bulk(
    body: BulkGenerateRequest,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """
    Generate slots for a turf across a date range.
    Idempotent — skips dates that already have slots.
    Max 365 days per call.
    """
    days = min(body.days, 365)
    dates = [body.start_date + timedelta(days=i) for i in range(days)]

    slots_created = 0
    days_generated = 0
    days_skipped = 0

    for target_date in dates:
        # Check if slots already exist
        count_result = await db.execute(
            select(func.count(Slot.id)).where(
                and_(Slot.turf_id == body.turf_id, Slot.date == target_date)
            )
        )
        existing_count = count_result.scalar_one()
        if existing_count > 0:
            days_skipped += 1
            continue

        try:
            new_slots = await generate_slots_for_turf(db, body.turf_id, target_date)
            slots_created += len(new_slots)
            days_generated += 1
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))

    return BulkGenerateResponse(
        turf_id=body.turf_id,
        start_date=str(body.start_date),
        days_requested=days,
        days_generated=days_generated,
        slots_created=slots_created,
        days_skipped=days_skipped,
    )


# ── Block / Unblock slots ───────────────────────────────────────────────────────

class BlockSlotsRequest(BaseModel):
    turf_id: int
    date: date
    slot_ids: List[int]  # slot IDs to block or unblock
    action: str = "block"  # "block" | "unblock"


@router.post("/block", status_code=200)
async def block_slots(
    body: BlockSlotsRequest,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """
    Block (disable) or unblock (re-enable) specific slots on a date.
    Only `available` slots can be blocked; only `disabled` slots can be unblocked.
    Already-booked or held slots are skipped.
    """
    if body.action not in ("block", "unblock"):
        raise HTTPException(status_code=400, detail="action must be 'block' or 'unblock'")

    result = await db.execute(
        select(Slot).where(
            and_(
                Slot.id.in_(body.slot_ids),
                Slot.turf_id == body.turf_id,
                Slot.date == body.date,
            )
        )
    )
    slots = result.scalars().all()

    changed = 0
    skipped = 0
    for slot in slots:
        if body.action == "block":
            if slot.status == SlotStatus.available:
                slot.status = SlotStatus.disabled
                changed += 1
            else:
                skipped += 1  # booked/held slots are protected
        else:  # unblock
            if slot.status == SlotStatus.disabled:
                slot.status = SlotStatus.available
                changed += 1
            else:
                skipped += 1

    await db.commit()
    return {
        "changed": changed,
        "skipped": skipped,
        "action": body.action,
        "date": str(body.date),
    }


# ── Admin: All bookings with customer details ──────────────────────────────────

@router.get("/booked")
async def get_all_bookings(
    turf_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """
    Returns all customer bookings with full customer and turf details.
    Supports filtering by turf, status, and date range.
    """
    filters = []
    if turf_id:
        filters.append(Booking.turf_id == turf_id)
    if status:
        try:
            filters.append(Booking.status == BookingStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status '{status}'")
    if from_date:
        filters.append(Booking.date >= from_date)
    if to_date:
        filters.append(Booking.date <= to_date)

    query = (
        select(Booking, User, Turf)
        .join(User, Booking.user_id == User.id)
        .join(Turf, Booking.turf_id == Turf.id)
        .where(and_(*filters) if filters else True)
        .order_by(Booking.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.all()

    # Build output rows
    bookings_out = []
    for booking, user, turf in rows:
        # Fetch slot times for this booking
        slots_result = await db.execute(
            select(Slot).where(Slot.booking_id == booking.id).order_by(Slot.start_time)
        )
        slot_list = slots_result.scalars().all()

        bookings_out.append({
            "id": booking.id,
            "date": str(booking.date),
            "status": booking.status.value,
            "total_price": float(booking.total_price),
            "amount_paid": float(booking.amount_paid) if booking.amount_paid else 0,
            "payment_type": booking.payment_type,
            "with_bowling_machine": booking.with_bowling_machine,
            "created_at": booking.created_at.isoformat(),
            "turf": {"id": turf.id, "name": turf.name, "facility_type": turf.facility_type},
            "customer": {
                "id": user.id,
                "name": user.name or "—",
                "mobile": user.mobile_number,
                "email": user.email or "—",
            },
            "slots": [
                {"start": str(s.start_time)[:5], "end": str(s.end_time)[:5]}
                for s in slot_list
            ],
        })

    return bookings_out
