import os
import sys
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

# Absolute path to .env — works regardless of the CWD when uvicorn starts
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"

# Weak/placeholder values that must NEVER reach production
_INSECURE_JWT_DEFAULTS = {"change-me-in-production", "admin-change-me-in-production"}
_INSECURE_ADMIN_PWD = "admin123"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "Viswa Sports"
    APP_ENV: str = "development"
    # CORS — empty string means no CORS allowed; always set explicitly in production
    CORS_ORIGINS: str = ""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/viswa_sports"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT - User
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour (use /auth/refresh to extend)

    # JWT - Admin
    ADMIN_JWT_SECRET_KEY: str = "admin-change-me-in-production"

    # Razorpay
    RAZORPAY_KEY_ID: str = "rzp_test_placeholder"
    RAZORPAY_KEY_SECRET: str = "placeholder_secret"

    # ── Gmail SMTP — OTP emails + booking notifications ──────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""        # e.g. viswasportsarena@gmail.com
    SMTP_PASSWORD: str = ""   # Google App Password (spaces allowed)
    SMTP_FROM_NAME: str = "Viswa Sports Arena"

    # OTP settings
    OTP_EXPIRE_MINUTES: int = 10

    # Google OAuth — for verifying Sign-in-with-Google ID tokens
    GOOGLE_CLIENT_ID: str = "403615569584-nsoj18gj22oq079oraqcj0331ib8h088.apps.googleusercontent.com"

    # Slot hold — pending bookings auto-cancel after this many minutes
    SLOT_HOLD_MINUTES: int = 5

    # Legacy — kept so existing .env files with these vars don't crash startup
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    MOCK_OTP_MODE: bool = False
    MOCK_OTP_CODE: str = "123456"

    # Admin seed
    ADMIN_EMAIL: str = "admin@viswa.com"
    ADMIN_PASSWORD: str = "admin123"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def validate_production_security(self) -> None:
        """Raise at startup if dangerous defaults are detected in production."""
        if self.APP_ENV != "production":
            return
        errors = []
        if self.JWT_SECRET_KEY in _INSECURE_JWT_DEFAULTS:
            errors.append("JWT_SECRET_KEY is using an insecure default value")
        if self.ADMIN_JWT_SECRET_KEY in _INSECURE_JWT_DEFAULTS:
            errors.append("ADMIN_JWT_SECRET_KEY is using an insecure default value")
        if self.ADMIN_PASSWORD == _INSECURE_ADMIN_PWD:
            errors.append("ADMIN_PASSWORD is set to 'admin123' — change it before deploying")
        if not self.CORS_ORIGINS:
            errors.append("CORS_ORIGINS is empty — set it to your frontend domain")
        if not self.SMTP_USER or not self.SMTP_PASSWORD:
            errors.append("SMTP_USER / SMTP_PASSWORD not set — email OTP will not work")
        if errors:
            print("\n[SECURITY] Production startup blocked due to insecure configuration:", file=sys.stderr)
            for e in errors:
                print(f"  ✗ {e}", file=sys.stderr)
            print("Set the above environment variables correctly and restart.\n", file=sys.stderr)
            sys.exit(1)


settings = Settings()
