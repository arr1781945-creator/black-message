"""apps/workspace/signals.py"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Workspace, UserPresence


@receiver(post_save, sender=Workspace)
def create_default_channels(sender, instance, created, **kwargs):
    if created:
        from .models import Channel, ChannelMember
        default_channels = [
            {"name": "general",    "channel_type": "public",       "purpose": "Company-wide announcements"},
            {"name": "random",     "channel_type": "public",       "purpose": "Non-work banter"},
            {"name": "compliance", "channel_type": "compliance",   "purpose": "Regulatory notices (read-only)", "is_read_only": True},
        ]
        for ch_data in default_channels:
            ch = Channel.objects.create(workspace=instance, slug=ch_data["name"], created_by=instance.owner, **ch_data)
            ChannelMember.objects.create(channel=ch, user=instance.owner, is_admin=True)
