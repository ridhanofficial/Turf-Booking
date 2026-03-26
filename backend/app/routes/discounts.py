"""
Public discounts routes — coupon validation & listing for customers.

  GET  /discounts        — list all active, currently-valid coupons (public)
  POST /discounts/validate — validate a coupon code and calculate discount
"""
from datetime import date
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.discount import Discount, DiscountType

router = APIRouter(prefix="/discounts", tags=["discounts"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class ValidateCouponRequest(BaseModel):
    code: str
    subtotal: Decimal       # total price BEFORE discount
    slot_count: int = 1     # number of slots the user is booking


class ValidateCouponResponse(BaseModel):
    valid: bool
    code: str
    type: str               # "flat" | "percent"
    value: Decimal
    discount_amount: Decimal
    final_price: Decimal
    message: str


class PublicCouponResponse(BaseModel):
    id: int
    code: Optional[str]
    type: str               # "flat" | "percent"
    value: Decimal
    valid_from: date
    valid_to: date
    min_slots: Optional[int] = None

    model_config = {"from_attributes": True}


# ── List active coupons (public) ──────────────────────────────────────────────
@router.get("", response_model=List[PublicCouponResponse])
async def list_active_coupons(
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all active, currently-valid coupon codes.
    Used by the user booking page to display a coupon gallery.
    """
    today = date.today()
    result = await db.execute(
        select(Discount).where(
            Discount.is_active == True,
            Discount.code != None,         # only named coupons
            Discount.valid_from <= today,
            Discount.valid_to >= today,
        ).order_by(Discount.value.desc())
    )
    return result.scalars().all()


# ── Validate coupon ───────────────────────────────────────────────────────────
@router.post("/validate", response_model=ValidateCouponResponse)
async def validate_coupon(
    body: ValidateCouponRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint — no auth required.
    Validates a coupon code, checks min_slots condition, returns discount + final price.
    """
    code = body.code.strip().upper()
    today = date.today()

    result = await db.execute(
        select(Discount).where(
            Discount.code == code,
            Discount.is_active == True,
            Discount.valid_from <= today,
            Discount.valid_to >= today,
        )
    )
    discount = result.scalar_one_or_none()

    if not discount:
        raise HTTPException(
            status_code=404,
            detail=f"Coupon '{code}' is invalid or has expired.",
        )

    # ── Min slots condition ────────────────────────────────────────────────────
    if discount.min_slots and body.slot_count < discount.min_slots:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Coupon '{code}' requires a minimum of {discount.min_slots} slot"
                f"{'s' if discount.min_slots > 1 else ''} "
                f"— you've selected {body.slot_count}."
            ),
        )

    subtotal = body.subtotal
    if discount.type == DiscountType.flat:
        discount_amount = min(Decimal(str(discount.value)), subtotal)
        message = f"Flat ₹{discount_amount} off applied!"
    else:  # percent
        discount_amount = (subtotal * Decimal(str(discount.value)) / 100).quantize(Decimal("0.01"))
        message = f"{discount.value}% off applied — saving ₹{discount_amount}!"

    final_price = max(subtotal - discount_amount, Decimal("0"))

    return ValidateCouponResponse(
        valid=True,
        code=code,
        type=discount.type.value,
        value=discount.value,
        discount_amount=discount_amount,
        final_price=final_price,
        message=message,
    )
