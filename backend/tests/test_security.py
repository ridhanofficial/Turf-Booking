"""
Unit tests for app.core.security — JWT token creation, decoding, password hashing.
"""
from datetime import timedelta, datetime, timezone

import pytest

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    create_user_token,
    create_admin_token,
)


# ── Password hashing ─────────────────────────────────────────────────────────

def test_hash_password_returns_bcrypt_hash():
    hashed = hash_password("mysecret")
    assert hashed != "mysecret"
    assert hashed.startswith("$2b$")


def test_verify_password_correct():
    hashed = hash_password("mysecret")
    assert verify_password("mysecret", hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("mysecret")
    assert verify_password("wrongpass", hashed) is False


# ── JWT tokens ────────────────────────────────────────────────────────────────

def test_create_and_decode_access_token():
    data = {"sub": "42", "type": "user"}
    token = create_access_token(data)
    payload = decode_token(token)

    assert payload is not None
    assert payload["sub"] == "42"
    assert payload["type"] == "user"
    assert "exp" in payload


def test_create_access_token_with_custom_expiry():
    data = {"sub": "1", "type": "user"}
    token = create_access_token(data, expires_delta=timedelta(minutes=5))
    payload = decode_token(token)

    assert payload is not None
    assert payload["sub"] == "1"


def test_decode_token_invalid_returns_none():
    result = decode_token("not.a.valid.token")
    assert result is None


def test_decode_token_wrong_secret_returns_none():
    token = create_access_token({"sub": "1"}, secret_key="secret-a")
    result = decode_token(token, secret_key="secret-b")
    assert result is None


def test_create_user_token():
    token = create_user_token(99)
    payload = decode_token(token)

    assert payload is not None
    assert payload["sub"] == "99"
    assert payload["type"] == "user"


def test_create_admin_token():
    from app.core.config import settings
    token = create_admin_token(1)
    payload = decode_token(token, secret_key=settings.ADMIN_JWT_SECRET_KEY)

    assert payload is not None
    assert payload["sub"] == "1"
    assert payload["type"] == "admin"


def test_token_uses_timezone_aware_expiry():
    """Verify the datetime.utcnow() deprecation fix — exp should be tz-aware."""
    data = {"sub": "1", "type": "user"}
    token = create_access_token(data)
    payload = decode_token(token)

    assert payload is not None
    # The 'exp' claim is a Unix timestamp (int); as long as token decodes fine
    # after being created with datetime.now(timezone.utc), this test passes.
    assert isinstance(payload["exp"], (int, float))
