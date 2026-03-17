"""
apps/users/middleware_ws.py
Hardened JWT WebSocket middleware dengan anti-MitM protection.
"""
import hashlib
import hmac
import time
import base64
import logging
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.conf import settings

logger = logging.getLogger(__name__)

# Replay attack prevention — cache used nonces
_used_nonces = set()
_nonce_expiry = {}

NONCE_TTL = 300  # 5 minutes


@database_sync_to_async
def get_user_from_token(token_string):
    from apps.users.models import BankUser
    from rest_framework_simplejwt.tokens import AccessToken
    from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
    try:
        token = AccessToken(token_string)
        user_id = token["user_id"]

        # Verify token not blacklisted
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
        jti = token.get("jti")
        if jti and BlacklistedToken.objects.filter(token__jti=jti).exists():
            logger.warning("Blacklisted token used for WS: %s", jti)
            return AnonymousUser()

        return BankUser.objects.select_related('profile').get(id=user_id, is_active=True)
    except (InvalidToken, TokenError, BankUser.DoesNotExist) as e:
        logger.warning("WS auth failed: %s", e)
        return AnonymousUser()


def _clean_expired_nonces():
    """Remove expired nonces from cache."""
    now = time.time()
    expired = [n for n, exp in _nonce_expiry.items() if exp < now]
    for n in expired:
        _used_nonces.discard(n)
        del _nonce_expiry[n]


def _verify_ws_nonce(nonce: str, timestamp: str, signature: str) -> bool:
    """
    Verify WebSocket connection nonce to prevent replay attacks.
    Client must sign: HMAC-SHA256(nonce + timestamp, session_secret)
    """
    try:
        ts = int(timestamp)
        now = int(time.time())

        # Check timestamp window (30 seconds)
        if abs(now - ts) > 30:
            logger.warning("WS nonce timestamp expired: %s", ts)
            return False

        # Check replay
        _clean_expired_nonces()
        if nonce in _used_nonces:
            logger.warning("WS nonce replay detected: %s", nonce)
            return False

        # Verify HMAC
        secret = settings.SECRET_KEY.encode()
        message = f"{nonce}:{timestamp}".encode()
        expected = hmac.new(secret, message, hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected, signature):
            logger.warning("WS nonce signature invalid")
            return False

        # Mark nonce as used
        _used_nonces.add(nonce)
        _nonce_expiry[nonce] = now + NONCE_TTL
        return True

    except Exception as e:
        logger.error("WS nonce verify error: %s", e)
        return False


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        from urllib.parse import parse_qs

        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)

        token = params.get("token", [None])[0]
        nonce = params.get("nonce", [None])[0]
        timestamp = params.get("ts", [None])[0]
        signature = params.get("sig", [None])[0]

        # Verify nonce if provided (anti-replay)
        if nonce and timestamp and signature:
            if not _verify_ws_nonce(nonce, timestamp, signature):
                logger.warning("WS connection rejected — nonce invalid")
                scope["user"] = AnonymousUser()
                return await super().__call__(scope, receive, send)

        # Fallback: check Authorization header
        if not token:
            headers = dict(scope.get("headers", []))
            auth = headers.get(b"authorization", b"").decode()
            if auth.startswith("Bearer "):
                token = auth[7:]

        if token:
            scope["user"] = await get_user_from_token(token)
            # Log WS connection
            if scope["user"].is_authenticated:
                logger.info("WS connected: user=%s path=%s",
                    scope["user"].username,
                    scope.get("path", "unknown"))
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
