"""apps/messaging/managers.py"""
from django.db import models
from django.utils import timezone


class MessageManager(models.Manager):
    def visible(self):
        return self.filter(is_deleted=False, is_destroyed=False)

    def expiring_soon(self, within_seconds=300):
        cutoff = timezone.now() + timezone.timedelta(seconds=within_seconds)
        return self.filter(destroy_at__lte=cutoff, is_destroyed=False)

    def for_channel(self, channel_id):
        return self.visible().filter(channel_id=channel_id).order_by("created_at")
