"""
Razorpay Payment Service

NOTE: The Razorpay client is lazy-initialized on first use so that
pydantic-settings has time to load `.env` before we read the API keys.
"""
import hashlib
import hmac
import logging

import razorpay

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Lazy client ───────────────────────────────────────────────────────────────
_client: razorpay.Client | None = None


def _get_client() -> razorpay.Client:
    """Return (and cache) a Razorpay client built from the current settings."""
    global _client
    if _client is None:
        _client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
        logger.info(
            "Razorpay client initialised (key=%s, secret_len=%d)",
            settings.RAZORPAY_KEY_ID,
            len(settings.RAZORPAY_KEY_SECRET),
        )
    return _client


def create_razorpay_order(amount_rupees: float, booking_id: int) -> dict:
    """Create a Razorpay order. Amount in rupees, converted to paise."""
    client = _get_client()
    amount_paise = int(amount_rupees * 100)
    order = client.order.create(
        {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"booking_{booking_id}",
            "notes": {"booking_id": str(booking_id)},
        }
    )
    return order


def verify_razorpay_signature(
    order_id: str,
    payment_id: str,
    signature: str,
) -> bool:
    """Verify Razorpay payment signature using HMAC-SHA256."""
    message = f"{order_id}|{payment_id}"
    expected = hmac.HMAC(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def issue_refund(payment_id: str, amount_paise: int) -> dict:
    """
    Issue a Razorpay refund for the given payment.
    amount_paise: amount in paise (rupees × 100).
    Returns the Razorpay refund object. Raises on error.
    """
    client = _get_client()
    logger.info("Issuing refund: payment=%s amount=%d paise", payment_id, amount_paise)
    refund = client.payment.refund(payment_id, {"amount": amount_paise})
    logger.info("Refund created: refund_id=%s", refund.get("id"))
    return refund
