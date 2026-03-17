"""
core/celery.py — Celery app for async tasks (TTL self-destruct, audit jobs)
"""

import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

app = Celery("securebank_slack")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Beat schedule — anti-forensics wipe pass
from django.conf import settings  # noqa: E402
from celery.schedules import crontab  # noqa: E402

app.conf.beat_schedule = {
    "ttl-message-wipe": {
        "task": "apps.messaging.tasks_ttl.wipe_expired_messages",
        "schedule": crontab(minute="*/5"),           # Every 5 min
    },
    "session-cleanup": {
        "task": "apps.vault.tasks.cleanup_expired_sessions",
        "schedule": crontab(minute="*/10"),
    },
    "audit-report-daily": {
        "task": "apps.compliance.tasks_audit.generate_daily_report",
        "schedule": crontab(hour=3, minute=0),       # 3am UTC
    },
}
