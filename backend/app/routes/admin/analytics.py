from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.deps import get_current_admin
from app.models.admin import Admin
from app.models.booking import Booking, BookingStatus

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])


@router.get("/bookings")
async def booking_analytics(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    query = select(
        Booking.date,
        func.count(Booking.id).label("total_bookings"),
        func.sum(Booking.total_price).label("total_revenue"),
    ).where(Booking.status == BookingStatus.confirmed)

    if from_date:
        query = query.where(Booking.date >= from_date)
    if to_date:
        query = query.where(Booking.date <= to_date)

    query = query.group_by(Booking.date).order_by(Booking.date.desc())
    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "date": str(row.date),
            "total_bookings": row.total_bookings,
            "total_revenue": float(row.total_revenue or 0),
        }
        for row in rows
    ]


@router.get("/summary")
async def analytics_summary(
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    total_confirmed = await db.execute(
        select(func.count(Booking.id)).where(Booking.status == BookingStatus.confirmed)
    )
    total_revenue = await db.execute(
        select(func.sum(Booking.total_price)).where(Booking.status == BookingStatus.confirmed)
    )
    total_pending = await db.execute(
        select(func.count(Booking.id)).where(Booking.status == BookingStatus.pending)
    )

    return {
        "total_confirmed_bookings": total_confirmed.scalar() or 0,
        "total_revenue": float(total_revenue.scalar() or 0),
        "total_pending_bookings": total_pending.scalar() or 0,
    }
