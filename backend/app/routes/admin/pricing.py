from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.deps import get_current_admin
from app.models.admin import Admin
from app.models.pricing_rule import PricingRule
from app.models.turf import Turf
from app.schemas.admin import PricingRuleCreate, PricingRuleResponse

router = APIRouter(prefix="/admin/pricing", tags=["admin-pricing"])


@router.get("/{turf_id}", response_model=List[PricingRuleResponse])
async def get_pricing_rules(
    turf_id: int,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(
        select(PricingRule).where(PricingRule.turf_id == turf_id)
    )
    return result.scalars().all()


@router.post("", response_model=PricingRuleResponse, status_code=201)
async def create_pricing_rule(
    data: PricingRuleCreate,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    # ── Validate against the turf's operating window ──────────────────────────
    turf_result = await db.execute(select(Turf).where(Turf.id == data.turf_id))
    turf = turf_result.scalar_one_or_none()
    if not turf:
        raise HTTPException(status_code=404, detail="Turf not found")

    rule_start = data.start_time
    rule_end = data.end_time

    if rule_start >= rule_end:
        raise HTTPException(
            status_code=422,
            detail="Peak-hour start time must be before end time.",
        )

    if rule_start < turf.operating_start_time:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Peak-hour start {rule_start} is before the turf's opening time "
                f"({turf.operating_start_time}). Intervals must be within operating hours."
            ),
        )

    if rule_end > turf.operating_end_time:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Peak-hour end {rule_end} is after the turf's closing time "
                f"({turf.operating_end_time}). Intervals must be within operating hours."
            ),
        )

    rule = PricingRule(**data.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=204)
async def delete_pricing_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(select(PricingRule).where(PricingRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    await db.delete(rule)
    await db.commit()
