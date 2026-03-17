import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

app = Celery('blackmess')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    # TTL self-destruct every 5 minutes
    'wipe-expired-messages': {
        'task': 'messaging.tasks.wipe_expired_messages',
        'schedule': crontab(minute='*/5'),
    },
    # Vault session cleanup every 10 minutes
    'wipe-expired-sessions': {
        'task': 'messaging.tasks.wipe_expired_sessions',
        'schedule': crontab(minute='*/10'),
    },
    # Daily audit log at 3am
    'daily-audit': {
        'task': 'apps.compliance.tasks_audit.generate_daily_audit',
        'schedule': crontab(hour=3, minute=0),
    },
}

app.conf.task_serializer = 'json'
app.conf.result_serializer = 'json'
app.conf.accept_content = ['json']
app.conf.timezone = 'UTC'
app.conf.enable_utc = True
