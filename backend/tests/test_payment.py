"""
Unit tests for app.services.payment_service — HMAC signature verification.
"""
import hashlib
import hmac

import pytest

from app.core.config import settings


def test_hmac_signature_verification():
    """Verify the HMAC fix produces correct Razorpay-compatible signatures."""
    order_id = "order_test123"
    payment_id = "pay_test456"

    message = f"{order_id}|{payment_id}"
    expected = hmac.HMAC(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Import the actual function after the fix
    from app.services.payment_service import verify_razorpay_signature

    assert verify_razorpay_signature(order_id, payment_id, expected) is True


def test_hmac_signature_rejects_invalid():
    """Reject a tampered signature."""
    from app.services.payment_service import verify_razorpay_signature

    result = verify_razorpay_signature("order_1", "pay_1", "badsignature")
    assert result is False


def test_hmac_signature_rejects_wrong_order():
    """Signature from a different order must not pass."""
    order_id = "order_real"
    payment_id = "pay_real"

    message = f"{order_id}|{payment_id}"
    sig = hmac.HMAC(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    from app.services.payment_service import verify_razorpay_signature

    # Same sig but wrong order_id should fail
    assert verify_razorpay_signature("order_DIFFERENT", payment_id, sig) is False
