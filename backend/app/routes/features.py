"""
Public features endpoint — no auth required.
Allows the booking page to fetch available add-ons.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.feature import Feature
from app.schemas.admin import FeatureResponse

router = APIRouter(prefix="/features", tags=["features"])


@router.get("", response_model=List[FeatureResponse])
async def list_features(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Feature))
    return result.scalars().all()
