"""
OTP Utility — DEPRECATED
------------------------
This module has been replaced by Firebase Phone Authentication.

OTP sending and verification is now handled entirely on the client side using the
Firebase JS SDK (signInWithPhoneNumber / confirmationResult.confirm).

The backend no longer sends or validates OTPs directly. Instead, the frontend
exchanges a Firebase ID token via POST /auth/firebase-verify, and the backend
verifies that token using the Firebase Admin SDK (app/utils/firebase_admin.py).

This file is intentionally left with only this notice to avoid breaking any stale
imports. It can be safely deleted once you confirm nothing references it.
"""
