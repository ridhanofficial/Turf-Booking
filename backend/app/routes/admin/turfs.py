import os
import uuid
import logging
from decimal import Decimal
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, and_, delete as sql_delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.deps import get_current_admin
from app.models.admin import Admin
from app.models.booking import Booking, BookingStatus
from app.models.feature import BookingFeature
from app.models.turf import Turf, TurfStatus
from app.schemas.turf import TurfCreate, TurfUpdate, TurfResponse
from app.services.slot_scheduler import generate_slots_for_single_turf

_log = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/turfs", tags=["admin-turfs"])

# ── Constants for image uploads ───────────────────────────────────────────────
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.normpath(os.path.join(_BASE_DIR, "..", "..", "..", "uploads", "turf_images"))
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


@router.get("", response_model=List[TurfResponse])
async def list_all_turfs(
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(select(Turf))
    turfs = result.scalars().all()
    return [
        TurfResponse(
            id=t.id, name=t.name, facility_type=t.facility_type, description=t.description,
            operating_start_time=t.operating_start_time, operating_end_time=t.operating_end_time,
            slot_duration_minutes=t.slot_duration_minutes, base_price=t.base_price,
            bowling_machine_price=t.bowling_machine_price,
            advance_payment_amount=t.advance_payment_amount,
            status=t.status,
            image_urls=t.image_urls or [],
            amenities=t.amenities or [],
        )
        for t in turfs
    ]


@router.post("", response_model=TurfResponse, status_code=201)
async def create_turf(
    data: TurfCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    turf = Turf(
        name=data.name,
        facility_type=data.facility_type,
        description=data.description,
        operating_start_time=data.operating_start_time,
        operating_end_time=data.operating_end_time,
        slot_duration_minutes=data.slot_duration_minutes,
        base_price=data.base_price,
        bowling_machine_price=data.bowling_machine_price,
        advance_payment_amount=data.advance_payment_amount,
        image_urls=data.image_urls or [],
        amenities=data.amenities or [],
    )
    db.add(turf)
    await db.commit()
    await db.refresh(turf)

    # Immediately generate 7 days of slots in the background so the turf is
    # bookable right away without waiting for the next scheduler tick (up to 24 h).
    background_tasks.add_task(generate_slots_for_single_turf, turf.id)
    _log.info("Turf %d created — slot generation queued for next 7 days.", turf.id)

    return TurfResponse(
        id=turf.id, name=turf.name, facility_type=turf.facility_type, description=turf.description,
        operating_start_time=turf.operating_start_time, operating_end_time=turf.operating_end_time,
        slot_duration_minutes=turf.slot_duration_minutes, base_price=turf.base_price,
        bowling_machine_price=turf.bowling_machine_price,
        advance_payment_amount=turf.advance_payment_amount,
        status=turf.status,
        image_urls=turf.image_urls or [],
        amenities=turf.amenities or [],
    )




@router.patch("/{turf_id}", response_model=TurfResponse)
async def update_turf(
    turf_id: int,
    data: TurfUpdate,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(select(Turf).where(Turf.id == turf_id))
    turf = result.scalar_one_or_none()
    if not turf:
        raise HTTPException(status_code=404, detail="Turf not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(turf, field, value)  # JSONB handles list values natively

    await db.commit()
    await db.refresh(turf)
    return TurfResponse(
        id=turf.id, name=turf.name, facility_type=turf.facility_type, description=turf.description,
        operating_start_time=turf.operating_start_time, operating_end_time=turf.operating_end_time,
        slot_duration_minutes=turf.slot_duration_minutes, base_price=turf.base_price,
        bowling_machine_price=turf.bowling_machine_price,
        advance_payment_amount=turf.advance_payment_amount,
        status=turf.status,
        image_urls=turf.image_urls or [],
        amenities=turf.amenities or [],
    )


@router.delete("/{turf_id}", status_code=204)
async def deactivate_turf(
    turf_id: int,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(select(Turf).where(Turf.id == turf_id))
    turf = result.scalar_one_or_none()
    if not turf:
        raise HTTPException(status_code=404, detail="Turf not found")
    turf.status = TurfStatus.inactive
    await db.commit()


@router.get("/{turf_id}/delete-summary")
async def get_turf_delete_summary(
    turf_id: int,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """
    Returns a summary of what will be lost if this turf is deleted.
    Used by the frontend to populate a warning modal before deletion.
    """
    result = await db.execute(select(Turf).where(Turf.id == turf_id))
    turf = result.scalar_one_or_none()
    if not turf:
        raise HTTPException(status_code=404, detail="Turf not found")

    # Count confirmed bookings and total revenue at stake
    confirmed_result = await db.execute(
        select(
            func.count(Booking.id).label("count"),
            func.coalesce(func.sum(Booking.amount_paid), 0).label("revenue"),
        ).where(
            and_(
                Booking.turf_id == turf_id,
                Booking.status == BookingStatus.confirmed,
            )
        )
    )
    row = confirmed_result.one()

    # Count pending bookings
    pending_result = await db.execute(
        select(func.count(Booking.id)).where(
            and_(Booking.turf_id == turf_id, Booking.status == BookingStatus.pending)
        )
    )
    pending_count = pending_result.scalar() or 0

    return {
        "turf_id": turf_id,
        "turf_name": turf.name,
        "confirmed_bookings": int(row.count),
        "confirmed_revenue": float(row.revenue),
        "pending_bookings": int(pending_count),
    }


@router.delete("/{turf_id}/permanent", status_code=200)
async def permanently_delete_turf(
    turf_id: int,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """
    Permanently delete a turf and ALL associated data (slots, bookings, pricing rules).
    Admin is responsible for confirming via the warning modal before calling this.
    """
    result = await db.execute(select(Turf).where(Turf.id == turf_id))
    turf = result.scalar_one_or_none()
    if not turf:
        raise HTTPException(status_code=404, detail="Turf not found")

    turf_name = turf.name

    # ── Core SQL deletes in FK-safe order ─────────────────────────────────
    # We use core SQL (not ORM db.delete) because ORM-level cascade requires
    # lazy-loading relationships, which is forbidden in async SQLAlchemy.
    # DB-level ondelete="CASCADE" handles slots & pricing_rules automatically.

    # Step 1: find all booking IDs on this turf
    booking_ids_result = await db.execute(
        select(Booking.id).where(Booking.turf_id == turf_id)
    )
    booking_ids = [row[0] for row in booking_ids_result.all()]

    if booking_ids:
        # Step 2: delete BookingFeature junction rows first (FK → bookings)
        await db.execute(
            sql_delete(BookingFeature).where(
                BookingFeature.booking_id.in_(booking_ids)
            )
        )
        # Step 3: delete Bookings — DB CASCADE sets slots.booking_id = NULL
        await db.execute(
            sql_delete(Booking).where(Booking.id.in_(booking_ids))
        )

    # Step 4: delete the Turf row — DB ondelete CASCADE removes Slots & PricingRules
    await db.execute(sql_delete(Turf).where(Turf.id == turf_id))
    await db.commit()
    return {"success": True, "message": f"Turf '{turf_name}' permanently deleted."}


@router.post("/{turf_id}/upload-image", status_code=200)
async def upload_turf_image(
    turf_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """
    Upload a turf image (JPEG / PNG / WebP, max 5 MB).
    Saves to backend/uploads/turf_images/ with a UUID filename.
    Appends the public URL to turf.image_urls.
    Returns: { "url": "/uploads/turf_images/<filename>", "image_urls": [...] }
    """
    # Validate turf exists
    result = await db.execute(select(Turf).where(Turf.id == turf_id))
    turf = result.scalar_one_or_none()
    if not turf:
        raise HTTPException(status_code=404, detail="Turf not found")

    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: image/jpeg, image/png, image/webp.",
        )

    # Read file and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds maximum size of 5 MB.")

    # Build filename
    ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    ext = ext_map[file.content_type]
    filename = f"{uuid.uuid4().hex}{ext}"

    # Ensure upload directory exists and write file
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as fp:
        fp.write(contents)

    # Append URL to turf.image_urls JSONB list
    public_url = f"/uploads/turf_images/{filename}"
    existing_urls = list(turf.image_urls or [])
    existing_urls.append(public_url)
    turf.image_urls = existing_urls
    await db.commit()

    return {"url": public_url, "turf_id": turf_id, "image_urls": turf.image_urls}
