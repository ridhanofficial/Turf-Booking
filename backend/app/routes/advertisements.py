"""
Public advertisement route — returns the single active ad (if any).
"""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.advertisement import Advertisement

router = APIRouter(prefix="/advertisements", tags=["advertisements"])


class ActiveAdResponse(BaseModel):
    id: int
    title: Optional[str]
    image_url: str
    link_url: Optional[str]

    model_config = {"from_attributes": True}


@router.get("/active", response_model=Optional[ActiveAdResponse])
async def get_active_ad(db: AsyncSession = Depends(get_db)):
    """Returns the most recently created active advertisement, or null."""
    result = await db.execute(
        select(Advertisement)
        .where(Advertisement.is_active == True)
        .order_by(Advertisement.created_at.desc())
        .limit(1)
    )
    ad = result.scalar_one_or_none()
    if not ad:
        return None
    return ad
