"""
apps/users/utils_mfa.py
MFA utilities: TOTP generation, QR URI, OTP verification, Axes lockout handler.
"""

import pyotp
import qrcode
import io
import base64
import logging

logger = logging.getLogger(__name__)


def generate_totp_secret() -> str:
    """Generate a new random TOTP base32 secret."""
    return pyotp.random_base32(length=32)


def get_totp_qr_uri(secret: str, username: str, issuer: str = "SecureBank") -> str:
    """Return the otpauth:// URI for QR code generation."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=username, issuer_name=issuer)


def get_totp_qr_image_b64(secret: str, username: str) -> str:
    """Return a base64-encoded PNG QR code image."""
    uri = get_totp_qr_uri(secret, username)
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def verify_totp(secret: str, code: str, valid_window: int = 1) -> bool:
    """
    Verify a TOTP code. valid_window=1 allows ±30s clock drift.
    Returns True if valid.
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=valid_window)


def axes_lockout_handler(request, credentials=None, *args, **kwargs):
    """
    Called by django-axes on lockout.
    Fires a compliance event and returns a 429 response.
    """
    from django.http import JsonResponse
    from apps.compliance.utils import log_security_event

    logger.warning(
        "ACCOUNT_LOCKED: %s from IP %s",
        credentials.get("username", "unknown") if credentials else "unknown",
        request.META.get("REMOTE_ADDR"),
    )
    log_security_event("ACCOUNT_LOCKED", request, None, extra=credentials)
    return JsonResponse(
        {"detail": "Account temporarily locked due to multiple failed attempts. Try again in 1 hour."},
        status=429,
    )
