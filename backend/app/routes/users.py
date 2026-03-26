"""
User profile routes — GET /users/me, PATCH /users/me
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserProfileUpdate

router = APIRouter(prefix="/users", tags=["users"])


def _user_to_response(user: User) -> UserResponse:
    """Build a UserResponse from a User ORM object without touching lazy relationships."""
    return UserResponse(
        id=user.id,
        email=user.email,
        mobile_number=user.mobile_number,
        name=user.name,
        created_at=user.created_at,
    )


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Return the currently authenticated user's profile."""
    return _user_to_response(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update name and/or mobile_number for the currently authenticated user."""
    if payload.name is not None:
        current_user.name = payload.name.strip() or None
    if payload.mobile_number is not None:
        mobile = payload.mobile_number.strip()
        if mobile:  # validate: must be exactly 10 digits
            if not mobile.isdigit() or len(mobile) != 10:
                raise HTTPException(
                    status_code=422,
                    detail="Mobile number must be exactly 10 digits (e.g. 9876543210).",
                )
        current_user.mobile_number = mobile or None
    db.add(current_user)
    try:
        await db.commit()
        await db.refresh(current_user)
    except IntegrityError as exc:
        await db.rollback()
        err_str = str(exc.orig).lower() if exc.orig else str(exc).lower()
        if "ix_users_mobile" in err_str or ("unique" in err_str and "mobile" in err_str):
            raise HTTPException(
                status_code=409,
                detail="This mobile number is already linked to another account.",
            ) from exc
        raise HTTPException(status_code=400, detail="Could not save profile. Please try again.") from exc
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Could not save profile. Please try again.") from exc
    return _user_to_response(current_user)

