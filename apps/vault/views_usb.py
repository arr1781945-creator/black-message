import hashlib
import secrets
import base64
import logging
from django.utils import timezone
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import HardwareKeyRegistry, AccessSession
from .serializers import HardwareKeySerializer, AccessSessionSerializer, VaultOpenSerializer
from apps.users.permissions import IsMFAVerified, ClearanceLevelPermission
from apps.compliance.utils import log_security_event

logger = logging.getLogger(__name__)

class HardwareKeyViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsMFAVerified, ClearanceLevelPermission]
    required_clearance = 3

    @action(detail=False, methods=["get"])
    def list_keys(self, request):
        keys = HardwareKeyRegistry.objects.filter(user=request.user)
        return Response(HardwareKeySerializer(keys, many=True).data)

    @action(detail=False, methods=["post"])
    def register(self, request):
        user = request.user
        slot = request.data.get("slot")
        if slot not in [1, 2]:
            return Response({"detail": "Slot must be 1 or 2."}, status=400)
        if HardwareKeyRegistry.objects.filter(user=user, slot=slot, is_active=True).exists():
            return Response({"detail": f"Slot {slot} sudah terpakai."}, status=400)
        from .crypto_engine import encrypt_field
        uid = str(user.id)
        key = HardwareKeyRegistry.objects.create(
            user=user, slot=slot,
            key_type=request.data.get("key_type", "fido2_generic"),
            label=request.data.get("label", f"Hardware Key Slot {slot}"),
            credential_id_enc=encrypt_field(request.data.get("credential_id", ""), uid, "credential_id"),
            public_key_enc=encrypt_field(request.data.get("public_key_cose", ""), uid, "hw_public_key"),
            aaguid=request.data.get("aaguid", ""),
            vendor_id=request.data.get("vendor_id", ""),
            product_id=request.data.get("product_id", ""),
            serial_number_enc=encrypt_field(request.data.get("serial_number", ""), uid, "hw_serial"),
        )
        log_security_event("HW_KEY_REGISTERED", request, user, extra={"slot": slot})
        return Response(HardwareKeySerializer(key).data, status=201)

    @action(detail=False, methods=["post"])
    def challenge(self, request):
        key_id = request.data.get("hardware_key_id")
        try:
            hw_key = HardwareKeyRegistry.objects.get(id=key_id, user=request.user, is_active=True)
        except HardwareKeyRegistry.DoesNotExist:
            return Response({"detail": "Hardware key tidak ditemukan."}, status=404)
        challenge = base64.b64encode(secrets.token_bytes(32)).decode()
        _store_challenge(str(request.user.id), challenge)
        return Response({
            "challenge_b64": challenge,
            "credential_id": hw_key.credential_id_enc,
            "rpId": settings.FIDO2_RP_ID,
        })

    @action(detail=True, methods=["delete"])
    def deactivate(self, request, pk=None):
        try:
            key = HardwareKeyRegistry.objects.get(pk=pk, user=request.user)
        except HardwareKeyRegistry.DoesNotExist:
            return Response(status=404)
        key.is_active = False
        key.deactivated_at = timezone.now()
        key.save(update_fields=["is_active", "deactivated_at"])
        log_security_event("HW_KEY_DEACTIVATED", request, request.user, extra={"slot": key.slot})
        return Response({"detail": "Hardware key dinonaktifkan."})


class VaultSessionViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsMFAVerified, ClearanceLevelPermission]
    required_clearance = 3

    @action(detail=False, methods=["post"])
    def open(self, request):
        user = request.user
        if user.clearance_level < 3:
            log_security_event("VAULT_ACCESS_DENIED_CLEARANCE", request, user)
            return Response({"detail": "Clearance Level 3+ diperlukan."}, status=403)
        serializer = VaultOpenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            hw_key = HardwareKeyRegistry.objects.get(
                id=serializer.validated_data["hardware_key_id"],
                user=user, is_active=True,
            )
        except HardwareKeyRegistry.DoesNotExist:
            return Response({"detail": "Hardware key tidak ditemukan."}, status=404)
        stored_challenge = _get_challenge(str(user.id))
        if not stored_challenge:
            return Response({"detail": "Challenge expired. Minta challenge baru."}, status=400)
        assertion_valid = _verify_fido2_assertion(
            hw_key=hw_key,
            user_id=str(user.id),
            assertion_b64=serializer.validated_data["fido2_assertion_b64"],
            challenge_b64=serializer.validated_data["fido2_challenge_b64"],
            stored_challenge=stored_challenge,
        )
        if not assertion_valid:
            log_security_event("VAULT_FIDO2_FAILED", request, user)
            return Response({"detail": "FIDO2 assertion tidak valid."}, status=403)
        hw_key.sign_count += 1
        hw_key.last_used = timezone.now()
        hw_key.save(update_fields=["sign_count", "last_used"])
        raw_token = secrets.token_hex(48)
        token_hash = hashlib.sha512(raw_token.encode()).hexdigest()
        ttl = getattr(settings, "VAULT_SESSION_TTL_SECONDS", 900)
        session = AccessSession.objects.create(
            user=user, hardware_key=hw_key,
            session_token_hash=token_hash,
            ip_address=request.META.get("REMOTE_ADDR", ""),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:512],
            fido2_challenge_b64=serializer.validated_data["fido2_challenge_b64"],
            fido2_assertion_b64=serializer.validated_data["fido2_assertion_b64"],
            expires_at=timezone.now() + timezone.timedelta(seconds=ttl),
        )
        log_security_event("VAULT_SESSION_OPENED", request, user)
        return Response({
            "vault_session_token": raw_token,
            "expires_at": session.expires_at.isoformat(),
            "session_id": str(session.id),
        }, status=201)

    @action(detail=True, methods=["delete"])
    def close(self, request, pk=None):
        try:
            session = AccessSession.objects.get(pk=pk, user=request.user, is_active=True)
        except AccessSession.DoesNotExist:
            return Response(status=404)
        session.is_active = False
        session.closed_reason = "USER_CLOSED"
        session.save(update_fields=["is_active", "closed_reason"])
        log_security_event("VAULT_SESSION_CLOSED", request, request.user)
        return Response({"detail": "Vault session ditutup."})


def _verify_fido2_assertion(hw_key, user_id, assertion_b64, challenge_b64, stored_challenge):
    if challenge_b64 != stored_challenge:
        logger.warning(f"FIDO2 challenge mismatch user {user_id}")
        return False
    if not assertion_b64 or len(assertion_b64) < 10:
        return False
    return True

def _store_challenge(user_id, challenge, ttl=120):
    import redis
    r = redis.from_url(settings.REDIS_URL)
    r.setex(f"fido2:challenge:{user_id}", ttl, challenge)

def _get_challenge(user_id):
    import redis
    r = redis.from_url(settings.REDIS_URL)
    val = r.getdel(f"fido2:challenge:{user_id}")
    return val.decode() if val else None
