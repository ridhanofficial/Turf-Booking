"""
Admin Discounts routes — GET /admin/discounts, POST /admin/discounts, PATCH, DELETE
"""
from datetime import date
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.deps import get_current_admin
from app.models.admin import Admin
from app.models.discount import Discount, DiscountType

router = APIRouter(prefix="/admin/discounts", tags=["admin-discounts"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class DiscountCreate(BaseModel):
    code: Optional[str] = None
    type: DiscountType
    value: Decimal
    valid_from: date
    valid_to: date
    is_active: bool = True
    # Optional: coupon only applicable when booking >= min_slots slots
    min_slots: Optional[int] = None


class DiscountUpdate(BaseModel):
    code: Optional[str] = None
    type: Optional[DiscountType] = None
    value: Optional[Decimal] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    is_active: Optional[bool] = None
    min_slots: Optional[int] = None


class DiscountResponse(BaseModel):
    id: int
    code: Optional[str]
    type: DiscountType
    value: Decimal
    valid_from: date
    valid_to: date
    is_active: bool
    min_slots: Optional[int] = None

    model_config = {"from_attributes": True}


# ── Routes ────────────────────────────────────────────────────────────────────
@router.get("", response_model=List[DiscountResponse])
async def list_discounts(
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(select(Discount).order_by(Discount.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=DiscountResponse, status_code=201)
async def create_discount(
    data: DiscountCreate,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    if data.valid_to < data.valid_from:
        raise HTTPException(status_code=400, detail="valid_to must be after valid_from")
    if data.min_slots is not None and data.min_slots < 1:
        raise HTTPException(status_code=400, detail="min_slots must be at least 1")

    discount = Discount(
        code=data.code.strip().upper() if data.code else None,
        type=data.type,
        value=data.value,
        valid_from=data.valid_from,
        valid_to=data.valid_to,
        is_active=data.is_active,
        min_slots=data.min_slots,
    )
    db.add(discount)
    await db.commit()
    await db.refresh(discount)
    return discount


@router.patch("/{discount_id}", response_model=DiscountResponse)
async def update_discount(
    discount_id: int,
    data: DiscountUpdate,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(select(Discount).where(Discount.id == discount_id))
    discount = result.scalar_one_or_none()
    if not discount:
        raise HTTPException(status_code=404, detail="Discount not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(discount, field, value)
    await db.commit()
    await db.refresh(discount)
    return discount


@router.delete("/{discount_id}", status_code=204)
async def delete_discount(
    discount_id: int,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(select(Discount).where(Discount.id == discount_id))
    discount = result.scalar_one_or_none()
    if not discount:
        raise HTTPException(status_code=404, detail="Discount not found")
    await db.delete(discount)
    await db.commit()
