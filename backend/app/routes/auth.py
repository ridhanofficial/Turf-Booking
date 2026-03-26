"""
Authentication routes — Google Sign-In + Email OTP flow
---------------------------------------------------------
POST /auth/google      — verify a Google ID token, return our JWT
POST /auth/send-otp    — generate 6-digit OTP, cache in Redis, send via Gmail (fallback)
POST /auth/verify-otp  — validate OTP, get-or-create user by email, return JWT
POST /auth/refresh     — exchange a valid user JWT for a fresh one
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    GoogleLoginRequest, SendOtpRequest, VerifyOtpRequest, TokenResponse
)
from app.core.security import create_user_token, decode_token
from app.core.config import settings
from app.core.redis import get_redis
from app.utils.sms import send_otp_email

import secrets

router = APIRouter(prefix="/auth", tags=["auth"])
_bearer = HTTPBearer()
logger = logging.getLogger(__name__)

# Redis key prefix and OTP TTL
_OTP_PREFIX = "email_otp:"
_OTP_TTL    = settings.OTP_EXPIRE_MINUTES * 60   # seconds


# ── Google OAuth ───────────────────────────────────────────────────────────────

def _verify_google_token(id_token: str) -> dict:
    """
    Verify a Google ID token using google-auth library.
    Returns the decoded token payload (includes 'email', 'name', 'picture').
    Raises ValueError on invalid/expired token.
    """
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        payload = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
        return payload
    except Exception as exc:
        logger.warning("[AUTH] Google token verification failed: %s", exc)
        raise ValueError(f"Invalid Google token: {exc}") from exc


@router.post("/google", response_model=TokenResponse)
async def google_login(
    request: GoogleLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange a Google Sign-In credential (ID token from the frontend)
    for a Viswa Sports JWT.

    Flow:
      1. Frontend shows "Sign in with Google" button via @react-oauth/google.
      2. On success, @react-oauth/google returns a `credential` string (Google ID token).
      3. Frontend POSTs it here as `{ id_token: "..." }`.
      4. Backend verifies with Google's public keys; extracts email + name.
      5. Gets or creates a User row by email; returns our own JWT.
    """
    try:
        payload = _verify_google_token(request.id_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )

    email: str = payload.get("email", "").lower().strip()
    name: str  = payload.get("name", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token does not contain an email address.",
        )

    # Get or create user by email
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(email=email, name=name or None)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("[AUTH] New user via Google: email=%s id=%d", email, user.id)
    else:
        # Update name from Google profile if not already set
        if name and not user.name:
            user.name = name
            await db.commit()
        logger.info("[AUTH] Google login: email=%s id=%d", email, user.id)

    token = create_user_token(user.id)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        has_mobile=bool(user.mobile_number),
    )


# ── Email OTP (kept as fallback) ──────────────────────────────────────────────

def _generate_otp() -> str:
    return f"{secrets.randbelow(900_000) + 100_000}"


@router.post("/send-otp", status_code=200)
async def send_otp(request: SendOtpRequest):
    """Request a 6-digit OTP to the given email (fallback login method)."""
    email = request.email.lower().strip()
    otp = _generate_otp()

    redis = await get_redis()
    await redis.setex(f"{_OTP_PREFIX}{email}", _OTP_TTL, otp)

    try:
        send_otp_email(email, otp, expiry_minutes=settings.OTP_EXPIRE_MINUTES)
    except Exception as exc:
        logger.error("[AUTH] Failed to send OTP email to %s: %s", email, exc)
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again.")

    return {"message": "OTP sent to your email address. Valid for 10 minutes."}


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(
    request: VerifyOtpRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify the OTP and return a JWT."""
    email = request.email.lower().strip()
    redis = await get_redis()
    stored: bytes | None = await redis.get(f"{_OTP_PREFIX}{email}")

    if stored is None:
        raise HTTPException(status_code=401, detail="OTP has expired. Please request a new one.")
    if stored.decode() != request.otp.strip():
        raise HTTPException(status_code=401, detail="Invalid OTP. Please check and try again.")

    await redis.delete(f"{_OTP_PREFIX}{email}")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        user = User(email=email)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_user_token(user.id)
    return TokenResponse(access_token=token, user_id=user.id, email=user.email, has_mobile=bool(user.mobile_number))


# ── Refresh ───────────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    """Exchange a valid (non-expired) user JWT for a fresh token."""
    payload = decode_token(credentials.credentials, secret_key=settings.JWT_SECRET_KEY)
    if not payload or payload.get("type") != "user":
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_token = create_user_token(user.id)
    return TokenResponse(access_token=new_token, user_id=user.id, email=user.email, has_mobile=bool(user.mobile_number))
