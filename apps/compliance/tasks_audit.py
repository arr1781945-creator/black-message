"""apps/compliance/tasks_audit.py"""
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(name="apps.compliance.tasks_audit.generate_daily_report")
def generate_daily_report():
    from .models import AuditLog, SecurityEvent
    from django.utils import timezone
    from datetime import timedelta
    yesterday = timezone.now() - timedelta(days=1)
    count = AuditLog.objects.filter(created_at__gte=yesterday).count()
    suspicious = SecurityEvent.objects.filter(is_suspicious=True, created_at__gte=yesterday).count()
    logger.info("Daily compliance report: %d audit events, %d suspicious events", count, suspicious)
    return {"audit_events": count, "suspicious_events": suspicious}


@shared_task(name="apps.compliance.tasks_audit.generate_compliance_report")
def generate_compliance_report(report_id: str):
    from .models import ComplianceReport
    from django.utils import timezone
    try:
        report = ComplianceReport.objects.get(id=report_id)
        report.status = "generating"
        report.save(update_fields=["status"])
        # TODO: Generate PDF report and upload to IPFS
        report.status = "ready"
        report.generated_at = timezone.now()
        report.save(update_fields=["status", "generated_at"])
    except Exception as e:
        logger.error("Report generation failed for %s: %s", report_id, e)
        ComplianceReport.objects.filter(id=report_id).update(status="failed")


@shared_task(name="apps.vault.tasks.cleanup_expired_sessions")
def cleanup_expired_sessions():
    from apps.vault.models import AccessSession
    from django.utils import timezone
    count, _ = AccessSession.objects.filter(
        is_active=True, expires_at__lte=timezone.now()
    ).update(is_active=False, closed_reason="EXPIRED")
    logger.info("Closed %d expired vault sessions", count)
    return {"closed": count}

@shared_task(name="apps.compliance.tasks_audit.generate_daily_audit")
def generate_daily_audit():
    """Generate daily audit report at 3am UTC."""
    from django.utils import timezone
    from .models import AuditLog, ComplianceReport
    import logging
    logger = logging.getLogger(__name__)
    today = timezone.now().date()
    logs = AuditLog.objects.filter(timestamp__date=today).count()
    ComplianceReport.objects.create(
        report_type="daily_audit",
        period_start=timezone.now().replace(hour=0, minute=0, second=0),
        period_end=timezone.now(),
        total_events=logs,
        generated_by=None,
    )
    logger.info("Daily audit generated: %d events", logs)
    return logs
