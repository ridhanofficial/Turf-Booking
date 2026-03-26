from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: Dict[str, Any],
    secret_key: str = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    secret = secret_key or settings.JWT_SECRET_KEY
    return jwt.encode(to_encode, secret, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, secret_key: str = None) -> Optional[Dict[str, Any]]:
    secret = secret_key or settings.JWT_SECRET_KEY
    try:
        payload = jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def create_user_token(user_id: int) -> str:
    return create_access_token(
        data={"sub": str(user_id), "type": "user"},
        secret_key=settings.JWT_SECRET_KEY,
    )


def create_admin_token(admin_id: int) -> str:
    return create_access_token(
        data={"sub": str(admin_id), "type": "admin"},
        secret_key=settings.ADMIN_JWT_SECRET_KEY,
    )
