from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.admin import Admin
from app.schemas.admin import AdminLoginRequest, AdminTokenResponse
from app.core.security import verify_password, create_admin_token, decode_token
from app.core.config import settings

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])
_bearer = HTTPBearer()


@router.post("/login", response_model=AdminTokenResponse)
async def admin_login(
    request: AdminLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Admin).where(Admin.email == request.email))
    admin = result.scalar_one_or_none()

    if not admin or not verify_password(request.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not admin.is_active:
        raise HTTPException(status_code=403, detail="Admin account is inactive")

    token = create_admin_token(admin.id)
    return AdminTokenResponse(access_token=token, admin_id=admin.id)


@router.post("/refresh", response_model=AdminTokenResponse)
async def admin_refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    """Exchange a valid (non-expired) admin JWT for a fresh token."""
    payload = decode_token(credentials.credentials, secret_key=settings.ADMIN_JWT_SECRET_KEY)
    if not payload or payload.get("type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired admin token",
        )

    admin_id = int(payload["sub"])
    result = await db.execute(select(Admin).where(Admin.id == admin_id))
    admin = result.scalar_one_or_none()

    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    if not admin.is_active:
        raise HTTPException(status_code=403, detail="Admin account is inactive")

    new_token = create_admin_token(admin.id)
    return AdminTokenResponse(access_token=new_token, admin_id=admin.id)
