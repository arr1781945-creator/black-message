"""apps/messaging/permissions.py"""
from rest_framework.permissions import BasePermission
from apps.workspace.models import ChannelMember


class IsChannelMember(BasePermission):
    def has_permission(self, request, view):
        channel_id = view.kwargs.get("channel_id") or request.query_params.get("channel_id")
        if not channel_id:
            return True
        return ChannelMember.objects.filter(channel_id=channel_id, user=request.user).exists()

    def has_object_permission(self, request, view, obj):
        return ChannelMember.objects.filter(channel=obj.channel, user=request.user).exists()
