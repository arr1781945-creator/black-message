"""apps/compliance/serializers.py"""
from rest_framework import serializers
from .models import AuditLog, SecurityEvent, ComplianceReport, ExportRequest


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True, default="system")

    class Meta:
        model = AuditLog
        fields = ["id", "event_type", "severity", "actor_username", "actor_ip",
                  "target_type", "target_id", "description", "metadata", "created_at"]


class SecurityEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityEvent
        fields = ["id", "event_type", "user", "ip_address", "is_suspicious", "detail", "created_at"]


class ComplianceReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceReport
        fields = ["id", "report_type", "title", "workspace", "date_from", "date_to",
                  "status", "report_ipfs_cid", "generated_at", "created_at"]
        read_only_fields = ["id", "status", "report_ipfs_cid", "generated_at", "created_at"]


class ExportRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExportRequest
        fields = ["id", "export_type", "justification", "status", "approved_by",
                  "approved_at", "export_ipfs_cid", "created_at"]
        read_only_fields = ["id", "status", "approved_by", "approved_at", "export_ipfs_cid", "created_at"]
