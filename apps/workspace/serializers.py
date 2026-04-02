"""
apps/workspace/serializers.py
"""
from rest_framework import serializers
from .models import Workspace, WorkspaceMember, Channel, ChannelMember, UserPresence, WorkspaceSettings


class WorkspaceSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ["id", "name", "slug", "description", "icon_ipfs_cid", "compliance_region",
                  "retention_days", "is_e2ee_enforced", "is_active", "created_at", "member_count"]
        read_only_fields = ["id", "created_at"]

    def get_member_count(self, obj):
        return obj.members.filter(status="active").count()


class ChannelSerializer(serializers.ModelSerializer):
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = ["id", "workspace", "name", "slug", "description", "channel_type",
                  "is_archived", "is_read_only", "topic", "purpose", "created_at", "last_activity", "unread_count"]
        read_only_fields = ["id", "created_at", "last_activity"]

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request:
            return 0
        try:
            membership = obj.memberships.get(user=request.user)
            if membership.last_read_at:
                return obj.messages.filter(created_at__gt=membership.last_read_at).count()
        except Exception:
            pass
        return 0


class ChannelMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    display_name = serializers.SerializerMethodField()

    def get_display_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    class Meta:
        model = ChannelMember
        fields = ["id", "user", "username", "display_name", "joined_at", "is_admin", "is_muted"]


class UserPresenceSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = UserPresence
        fields = ["user", "username", "status", "status_text", "status_emoji", "last_seen", "dnd_until"]
        read_only_fields = ["last_seen"]


class WorkspaceSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkspaceSettings
        fields = "__all__"
        read_only_fields = ["workspace"]
