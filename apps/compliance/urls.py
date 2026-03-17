from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_reporting import (
    AuditLogViewSet, SecurityEventViewSet,
    ComplianceReportViewSet, ExportRequestViewSet,
)

router = DefaultRouter()
router.register(r'audit-logs',      AuditLogViewSet,        basename='audit-logs')
router.register(r'security-events', SecurityEventViewSet,   basename='security-events')
router.register(r'reports',         ComplianceReportViewSet, basename='reports')
router.register(r'export',          ExportRequestViewSet,   basename='export')

urlpatterns = [
    path('', include(router.urls)),
]
