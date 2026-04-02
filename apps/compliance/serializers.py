"""apps/compliance/serializers.py"""
from rest_framework import serializers
from .models import (
    AuditLog, SecurityEvent, ComplianceReport, ExportRequest,
    OJKIncidentReport, InformationBarrier, RemoteWipeRequest,
    SecureFileLink, DLPRule, HelpdeskTicket, HelpdeskComment,
    InstitutionBadge,
)

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

class OJKIncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = OJKIncidentReport
        fields = ["id", "workspace", "incident_type", "severity", "description",
                  "affected_systems", "affected_users_count", "detected_at",
                  "reported_by", "status", "ojk_reference_number",
                  "submitted_at", "deadline_at", "auto_submitted", "metadata", "created_at"]
        read_only_fields = ["id", "reported_by", "status", "ojk_reference_number",
                            "submitted_at", "deadline_at", "auto_submitted", "created_at"]

class InformationBarrierSerializer(serializers.ModelSerializer):
    class Meta:
        model = InformationBarrier
        fields = ["id", "workspace", "name", "description", "blocked_departments",
                  "is_active", "created_by", "created_at"]
        read_only_fields = ["id", "created_by", "created_at"]

class RemoteWipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RemoteWipeRequest
        fields = ["id", "target_user", "requested_by", "reason", "device_token",
                  "status", "executed_at", "created_at"]
        read_only_fields = ["id", "requested_by", "status", "executed_at", "created_at"]

class SecureFileLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecureFileLink
        fields = ["id", "workspace", "filename", "file_size_bytes", "ipfs_cid",
                  "expires_at", "max_downloads", "download_count", "is_active", "created_at"]
        read_only_fields = ["id", "uploaded_by", "token_hash", "download_count", "access_log", "created_at"]

class DLPRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DLPRule
        fields = ["id", "workspace", "name", "pattern", "data_type", "action",
                  "is_active", "created_by", "created_at"]
        read_only_fields = ["id", "created_by", "created_at"]

class HelpdeskTicketSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    class Meta:
        model = HelpdeskTicket
        fields = ["id", "ticket_number", "workspace", "created_by", "created_by_username",
                  "assigned_to", "title", "description", "category", "priority",
                  "status", "channel_id", "resolved_at", "created_at", "updated_at"]
        read_only_fields = ["id", "ticket_number", "created_by", "resolved_at", "created_at", "updated_at"]

class InstitutionBadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionBadge
        fields = ["id", "workspace", "institution_name", "institution_code", "verified_by",
                  "verified_at", "badge_level", "is_active", "expires_at", "created_at"]
        read_only_fields = ["id", "created_at"]
