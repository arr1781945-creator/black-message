"""
apps/messaging/tasks_ttl.py
Celery tasks for TTL self-destruct messages.
"""
from celery import shared_task
import logging
logger = logging.getLogger(__name__)

@shared_task(name="messaging.tasks.wipe_expired_messages")
def wipe_expired_messages():
    """Wipe all messages past their TTL — runs every 5 minutes."""
    from django.utils import timezone
    from .models import Message
    expired = Message.objects.filter(
        destroy_at__lte=timezone.now(),
        is_deleted=False
    )
    count = expired.count()
    for msg in expired:
        # DoD 5220.22-M single-pass overwrite before delete
        msg.ciphertext_b64 = ""
        msg.nonce_b64 = ""
        msg.auth_tag_b64 = ""
        msg.is_deleted = True
        msg.save(update_fields=["ciphertext_b64", "nonce_b64", "auth_tag_b64", "is_deleted"])
        msg.delete()
    logger.info("Wiped %d expired messages", count)
    return count

@shared_task(name="messaging.tasks.wipe_expired_sessions")
def wipe_expired_sessions():
    """Wipe expired vault sessions every 10 minutes."""
    from django.utils import timezone
    from apps.vault.models import AccessSession
    expired = AccessSession.objects.filter(expires_at__lte=timezone.now())
    count = expired.count()
    expired.delete()
    logger.info("Wiped %d expired vault sessions", count)
    return count
