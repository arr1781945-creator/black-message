"""apps/vault/permissions.py"""
import hashlib
from rest_framework.permissions import BasePermission
from .models import AccessSession
from django.utils import timezone


class RequiresVaultSession(BasePermission):
    message = "Valid vault session token required. Open a vault session first."

    def has_permission(self, request, view):
        token_raw = request.headers.get("X-Vault-Token", "")
        if not token_raw:
            return False
        token_hash = hashlib.sha512(token_raw.encode()).hexdigest()
        return AccessSession.objects.filter(
            user=request.user,
            session_token_hash=token_hash,
            is_active=True,
            expires_at__gt=timezone.now(),
        ).exists()
