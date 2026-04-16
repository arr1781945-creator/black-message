"""
core/asgi.py
ASGI entry-point — Django Channels WebSocket routing + HTTP.
Supports E2EE WebSocket connections for messaging consumers.
"""

import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings_full")
django.setup()

# Import AFTER django.setup() so apps are ready
from apps.messaging.routing import websocket_urlpatterns          # noqa: E402
from apps.users.middleware_ws import JWTAuthMiddlewareStack       # noqa: E402

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        # HTTP → standard Django
        "http": django_asgi_app,
        # WebSocket → JWT-authenticated Channel consumers
        "websocket": AllowedHostsOriginValidator(
            JWTAuthMiddlewareStack(
                URLRouter(websocket_urlpatterns)
            )
        ),
    }
)
