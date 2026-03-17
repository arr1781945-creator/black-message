"""
core/wsgi.py — Standard WSGI fallback (used by gunicorn for HTTP-only workers)
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")
application = get_wsgi_application()
