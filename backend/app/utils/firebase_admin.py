"""
Firebase Admin SDK — Token Verification Utility
-------------------------------------------------
Initializes the Firebase Admin app (once) using a service account JSON string
stored in the FIREBASE_SERVICE_ACCOUNT_JSON environment variable.

Mock Mode (MOCK_OTP_MODE=true in .env):
  The frontend sends id_token = "mock:<phone_e164>:<otp>" instead of a real
  Firebase token.  The backend validates the OTP against MOCK_OTP_CODE (default
  "123456") and returns a fake decoded dict — no Firebase call is made.
  NEVER enable this in production.
"""
import json
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)


# ── Mock Mode ─────────────────────────────────────────────────────────────────
def _try_mock_verify(id_token: str) -> dict | None:
    """
    If MOCK_OTP_MODE is enabled and the token looks like "mock:<phone>:<otp>",
    validate the OTP and return a fake decoded dict.
    Returns None if mock mode is off or the token is not a mock token.
    """
    from app.core.config import settings

    if not settings.MOCK_OTP_MODE:
        return None

    if not id_token.startswith("mock:"):
        return None

    parts = id_token.split(":")
    # expected format: mock:<phone_e164>:<otp>
    if len(parts) < 3:
        raise ValueError("Mock token format must be 'mock:<phone_e164>:<otp>'")

    phone = parts[1]
    submitted_otp = parts[2]

    if submitted_otp != settings.MOCK_OTP_CODE:
        raise ValueError(
            f"[Mock Mode] Invalid OTP '{submitted_otp}'. Expected '{settings.MOCK_OTP_CODE}'."
        )

    logger.warning(
        "[MOCK_OTP_MODE] Bypassing Firebase for phone %s — dev/test only!", phone
    )
    return {"phone_number": phone, "uid": f"mock-uid-{phone}", "mock": True}


# ── Firebase Real Verify ───────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def _get_firebase_app():
    """
    Initialise the Firebase Admin SDK once and return the app.
    Uses FIREBASE_SERVICE_ACCOUNT_JSON from settings.
    """
    import firebase_admin  # type: ignore
    from firebase_admin import credentials  # type: ignore
    from app.core.config import settings

    if firebase_admin._apps:
        return firebase_admin.get_app()

    sa_json = settings.FIREBASE_SERVICE_ACCOUNT_JSON.strip()

    if not sa_json:
        raise RuntimeError(
            "FIREBASE_SERVICE_ACCOUNT_JSON is not set in the environment. "
            "Download a service account key from Firebase Console "
            "(Project Settings → Service Accounts → Generate new private key) "
            "and paste its content as the value of FIREBASE_SERVICE_ACCOUNT_JSON in .env."
        )

    try:
        sa_dict = json.loads(sa_json)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: {exc}"
        ) from exc

    cred = credentials.Certificate(sa_dict)
    app = firebase_admin.initialize_app(cred)
    logger.info("Firebase Admin SDK initialised for project: %s", sa_dict.get("project_id"))
    return app


def verify_firebase_token(id_token: str) -> dict:
    """
    Verify a Firebase Phone Auth ID token and return the decoded claims.
    In MOCK_OTP_MODE, accepts "mock:<phone_e164>:<otp>" tokens without Firebase.

    Returns:
        dict with keys including 'phone_number', 'uid', etc.

    Raises:
        ValueError: If the token is invalid, expired, or phone_number is missing.
    """
    # Try mock mode first
    mock_result = _try_mock_verify(id_token)
    if mock_result is not None:
        return mock_result

    # Real Firebase verification
    from firebase_admin import auth  # type: ignore

    _get_firebase_app()  # ensure app is initialised

    try:
        decoded = auth.verify_id_token(id_token)
    except Exception as exc:
        logger.warning("Firebase token verification failed: %s", exc)
        raise ValueError(f"Invalid Firebase token: {exc}") from exc

    phone_number = decoded.get("phone_number")
    if not phone_number:
        raise ValueError(
            "Firebase token does not contain a phone_number claim. "
            "Ensure the token came from Phone Authentication."
        )

    return decoded
