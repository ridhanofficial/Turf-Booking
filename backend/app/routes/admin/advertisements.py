"""
Admin Advertisements routes — full CRUD + image upload.
"""
import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.deps import get_current_admin
from app.models.admin import Admin
from app.models.advertisement import Advertisement

router = APIRouter(prefix="/admin/advertisements", tags=["admin-advertisements"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "ads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB


class AdResponse(BaseModel):
    id: int
    title: Optional[str]
    image_url: str
    link_url: Optional[str]
    is_active: bool

    model_config = {"from_attributes": True}


# ── List ──────────────────────────────────────────────────────────────────────
@router.get("", response_model=List[AdResponse])
async def list_ads(
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(select(Advertisement).order_by(Advertisement.created_at.desc()))
    return result.scalars().all()


# ── Create (multipart: image file + metadata) ─────────────────────────────────
@router.post("", response_model=AdResponse, status_code=201)
async def create_ad(
    title: Optional[str] = Form(None),
    link_url: Optional[str] = Form(None),
    is_active: bool = Form(True),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    ext = os.path.splitext(image.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP and GIF are allowed")

    data = await image.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Image must be under 5 MB")

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(data)

    ad = Advertisement(
        title=title,
        image_url=f"/uploads/ads/{filename}",
        link_url=link_url,
        is_active=is_active,
    )
    db.add(ad)
    await db.commit()
    await db.refresh(ad)
    return ad


# ── Toggle active / update metadata ──────────────────────────────────────────
@router.patch("/{ad_id}", response_model=AdResponse)
async def update_ad(
    ad_id: int,
    title: Optional[str] = Form(None),
    link_url: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(select(Advertisement).where(Advertisement.id == ad_id))
    ad = result.scalar_one_or_none()
    if not ad:
        raise HTTPException(status_code=404, detail="Advertisement not found")

    if title is not None:
        ad.title = title
    if link_url is not None:
        ad.link_url = link_url
    if is_active is not None:
        ad.is_active = is_active

    if image and image.filename:
        ext = os.path.splitext(image.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Invalid image type")
        data = await image.read()
        if len(data) > MAX_SIZE:
            raise HTTPException(status_code=413, detail="Image must be under 5 MB")
        filename = f"{uuid.uuid4().hex}{ext}"
        with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
            f.write(data)
        ad.image_url = f"/uploads/ads/{filename}"

    await db.commit()
    await db.refresh(ad)
    return ad


# ── Delete ────────────────────────────────────────────────────────────────────
@router.delete("/{ad_id}", status_code=204)
async def delete_ad(
    ad_id: int,
    db: AsyncSession = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    result = await db.execute(select(Advertisement).where(Advertisement.id == ad_id))
    ad = result.scalar_one_or_none()
    if not ad:
        raise HTTPException(status_code=404, detail="Advertisement not found")
    await db.delete(ad)
    await db.commit()
