"""apps/messaging/signals.py"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Message


@receiver(post_save, sender=Message)
def schedule_ttl_if_set(sender, instance, created, **kwargs):
    if created and instance.destroy_at:
        # Re-queue wipe task with ETA at destroy_at
        from .tasks_ttl import wipe_expired_messages
        wipe_expired_messages.apply_async(eta=instance.destroy_at)


@receiver(post_save, sender=Message)
def update_channel_last_activity(sender, instance, created, **kwargs):
    if created:
        from apps.workspace.models import Channel
        Channel.objects.filter(pk=instance.channel_id).update(last_activity=instance.created_at)
