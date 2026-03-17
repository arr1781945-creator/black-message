"""
apps/compliance/views_reporting.py — 10 compliance endpoints.
"""
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AuditLog, SecurityEvent, ComplianceReport, ExportRequest
from .serializers import (AuditLogSerializer, SecurityEventSerializer,
                          ComplianceReportSerializer, ExportRequestSerializer)
from apps.users.permissions import IsMFAVerified


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsMFAVerified]

    def get_queryset(self):
        # Only compliance officers and above can view audit logs
        user = self.request.user
        if not user.role_assignments.filter(
            role__name__in=["super_admin", "compliance_officer", "auditor"], is_active=True
        ).exists():
            return AuditLog.objects.none()
        qs = AuditLog.objects.all()
        # Filters
        event_type = self.request.query_params.get("event_type")
        severity = self.request.query_params.get("severity")
        from_date = self.request.query_params.get("from")
        to_date = self.request.query_params.get("to")
        if event_type:
            qs = qs.filter(event_type=event_type)
        if severity:
            qs = qs.filter(severity=severity)
        if from_date:
            qs = qs.filter(created_at__gte=from_date)
        if to_date:
            qs = qs.filter(created_at__lte=to_date)
        return qs.order_by("-created_at")


class SecurityEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SecurityEventSerializer
    permission_classes = [IsAuthenticated, IsMFAVerified]

    def get_queryset(self):
        return SecurityEvent.objects.filter(is_suspicious=True).order_by("-created_at")

    @action(detail=False, methods=["get"])
    def my_events(self, request):
        events = SecurityEvent.objects.filter(user=request.user).order_by("-created_at")[:50]
        return Response(SecurityEventSerializer(events, many=True).data)


class ComplianceReportViewSet(viewsets.ModelViewSet):
    serializer_class = ComplianceReportSerializer
    permission_classes = [IsAuthenticated, IsMFAVerified]
    http_method_names = ["get", "post"]

    def get_queryset(self):
        return ComplianceReport.objects.filter(
            requested_by=self.request.user
        ).order_by("-created_at")

    def perform_create(self, serializer):
        report = serializer.save(requested_by=self.request.user)
        from .tasks_audit import generate_compliance_report
        generate_compliance_report.delay(str(report.id))


class ExportRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ExportRequestSerializer
    permission_classes = [IsAuthenticated, IsMFAVerified]

    def get_queryset(self):
        return ExportRequest.objects.filter(requested_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        req = self.get_object()
        if not request.user.role_assignments.filter(
            role__name__in=["super_admin", "compliance_officer"], is_active=True
        ).exists():
            return Response({"detail": "Permission denied."}, status=403)
        req.status = "approved"
        req.approved_by = request.user
        req.approved_at = timezone.now()
        req.save(update_fields=["status", "approved_by", "approved_at"])
        return Response({"detail": "Export request approved."})
