"""apps/compliance/utils.py"""
import logging

logger = logging.getLogger("apps.compliance")


def log_security_event(event_type: str, request, user, extra: dict = None):
    """Async-safe security event logger."""
    from .models import SecurityEvent
    try:
        SecurityEvent.objects.create(
            event_type=event_type,
            user=user,
            ip_address=request.META.get("REMOTE_ADDR") if request else None,
            detail=extra or {},
            is_suspicious=event_type in (
                "LOGIN_FAIL", "ACCOUNT_LOCKED", "MFA_FAIL", "VAULT_ACCESS_DENIED",
                "INVALID_SIGNATURE", "INVALID_INVITE",
            ),
        )
    except Exception as e:
        logger.error("Failed to log security event %s: %s", event_type, e)


def log_event(event_type: str, description: str, severity: str = "info", metadata: dict = None):
    """Log a system audit event (no request context)."""
    from .models import AuditLog
    try:
        AuditLog.objects.create(
            event_type=event_type,
            severity=severity,
            description=description,
            metadata=metadata or {},
        )
    except Exception as e:
        logger.error("AuditLog write failed: %s", e)


def secure_exception_handler(exc, context):
    """DRF exception handler — strip internal details in production."""
    from rest_framework.views import exception_handler
    from django.conf import settings
    response = exception_handler(exc, context)
    if response is not None and not settings.DEBUG:
        # Scrub internal error details
        if response.status_code >= 500:
            response.data = {"detail": "An error occurred. Please contact support."}
    return response
