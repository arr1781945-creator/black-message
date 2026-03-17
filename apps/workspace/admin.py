"""apps/workspace/admin.py"""
from django.contrib import admin
from .models import Workspace, Channel, WorkspaceMember, WorkspaceSettings, WorkspaceAuditLog


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "compliance_region", "is_e2ee_enforced", "is_active", "created_at"]
    search_fields = ["name", "slug"]
    list_filter = ["compliance_region", "is_e2ee_enforced", "is_active"]


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ["name", "workspace", "channel_type", "is_archived", "is_read_only", "last_activity"]
    list_filter = ["channel_type", "is_archived", "workspace"]
    search_fields = ["name", "workspace__name"]


@admin.register(WorkspaceAuditLog)
class WorkspaceAuditLogAdmin(admin.ModelAdmin):
    list_display = ["workspace", "actor", "action", "target_type", "created_at"]
    list_filter = ["action", "workspace"]
    readonly_fields = ["workspace", "actor", "action", "target_type", "target_id", "detail", "ip_address", "created_at"]
