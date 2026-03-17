"""apps/compliance/admin.py"""
from django.contrib import admin
from .models import AuditLog, SecurityEvent, ComplianceReport, ExportRequest


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["event_type", "severity", "actor", "actor_ip", "target_type", "created_at"]
    list_filter = ["severity", "event_type"]
    search_fields = ["actor__username", "description", "actor_ip"]
    readonly_fields = [f.name for f in AuditLog._meta.fields]  # All readonly


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    list_display = ["event_type", "user", "ip_address", "is_suspicious", "created_at"]
    list_filter = ["event_type", "is_suspicious"]
    readonly_fields = ["event_type", "user", "ip_address", "detail", "created_at"]
