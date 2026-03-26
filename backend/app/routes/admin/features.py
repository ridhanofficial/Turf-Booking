from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.deps import get_current_admin
from app.models.admin import Admin
from app.models.feature import Feature
from app.schemas.admin import FeatureCreate, FeatureResponse

router = APIRouter(tags=["admin-features"])


# ─── Features ────────────────────────────────────────────────────────────────

@router.get("/admin/features", response_model=List[FeatureResponse])
async def list_features(
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(select(Feature))
    return result.scalars().all()


@router.post("/admin/features", response_model=FeatureResponse, status_code=201)
async def create_feature(
    data: FeatureCreate,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    feature = Feature(**data.model_dump())
    db.add(feature)
    await db.commit()
    await db.refresh(feature)
    return feature


@router.delete("/admin/features/{feature_id}", status_code=204)
async def delete_feature(
    feature_id: int,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(select(Feature).where(Feature.id == feature_id))
    feature = result.scalar_one_or_none()
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")
    await db.delete(feature)
    await db.commit()

