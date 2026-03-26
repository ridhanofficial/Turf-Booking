from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class GoogleLoginRequest(BaseModel):
    """Request body for POST /auth/google — Google Sign-In credential."""
    id_token: str


class SendOtpRequest(BaseModel):
    """Request body for POST /auth/send-otp."""
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    """Request body for POST /auth/verify-otp."""
    email: EmailStr
    otp:   str


class TokenResponse(BaseModel):
    access_token:     str
    token_type:       str = "bearer"
    user_id:          int
    email:            Optional[str] = None
    has_mobile:       bool = False   # True when user already has a mobile number on file


class UserResponse(BaseModel):
    id:             int
    email:          Optional[str] = None
    mobile_number:  Optional[str] = None   # kept for backward-compat; may be null
    name:           Optional[str] = None
    created_at:     datetime

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    name:          Optional[str] = None
    mobile_number: Optional[str] = None   # 10-digit Indian mobile number
