"""
apps/users/settings_views.py
Semua endpoint untuk halaman Settings:
  - Profil & avatar
  - Notifikasi
  - Tema
  - Keamanan (password, sesi, 2FA)
  - Privacy
  - API Keys
"""
import json
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import BankUser, UserProfile, LoginSession, MFADevice, APIKey
import secrets
import hashlib


# ─── GET/UPDATE semua settings sekaligus ─────────────────────────────────────

class SettingsView(APIView):
    """GET semua settings user, PATCH update."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)

        return Response({
            'profile': {
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'department': user.department,
                'employee_id': user.employee_id,
                'clearance_level': user.clearance_level,
                'avatar_ipfs_cid': user.avatar_ipfs_cid,
                'title': profile.title,
                'timezone': profile.timezone,
                'locale': profile.locale,
            },
            'appearance': {
                'theme': profile.theme,
            },
            'notifications': profile.notification_prefs or {
                'email_mentions': True,
                'email_invites': True,
                'email_security': True,
                'push_messages': True,
                'push_mentions': True,
                'push_calls': True,
                'digest_daily': False,
                'digest_weekly': True,
            },
            'security': {
                'is_mfa_enforced': user.is_mfa_enforced,
                'is_mfa_verified': user.is_mfa_verified,
                'mfa_devices': [
                    {
                        'id': str(d.id),
                        'name': d.name,
                        'type': d.device_type,
                        'is_primary': d.is_primary,
                        'last_used': d.last_used.isoformat() if d.last_used else None,
                    }
                    for d in user.mfa_devices.filter(is_confirmed=True)
                ],
                'active_sessions_count': LoginSession.objects.filter(
                    user=user, is_revoked=False
                ).count(),
            },
        })

    def patch(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        data = request.data

        # Update BankUser fields
        user_fields = {}
        for field in ['first_name', 'last_name', 'department', 'avatar_ipfs_cid']:
            if field in data:
                user_fields[field] = data[field]
        if user_fields:
            for k, v in user_fields.items():
                setattr(user, k, v)
            user.save(update_fields=list(user_fields.keys()))

        # Update profile fields
        profile_fields = {}
        for field in ['title', 'timezone', 'locale', 'theme', 'notification_prefs']:
            if field in data:
                profile_fields[field] = data[field]
        if profile_fields:
            for k, v in profile_fields.items():
                setattr(profile, k, v)
            profile.save(update_fields=list(profile_fields.keys()))

        return Response({'detail': 'Settings berhasil disimpan!'})


# ─── Notifikasi ───────────────────────────────────────────────────────────────

class NotificationSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response(profile.notification_prefs or {})

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        prefs = profile.notification_prefs or {}
        prefs.update(request.data)
        profile.notification_prefs = prefs
        profile.save(update_fields=['notification_prefs'])
        return Response({'detail': 'Preferensi notifikasi disimpan!'})


# ─── Tema / Appearance ────────────────────────────────────────────────────────

class AppearanceSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        theme = request.data.get('theme')
        if theme not in ['dark', 'light']:
            return Response({'detail': 'Tema harus "dark" atau "light".'}, status=400)

        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.theme = theme
        profile.save(update_fields=['theme'])
        return Response({'detail': f'Tema diubah ke {theme}!'})


# ─── Keamanan ─────────────────────────────────────────────────────────────────

class SecuritySettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        sessions = LoginSession.objects.filter(user=user, is_revoked=False).order_by('-created_at')
        devices = user.mfa_devices.filter(is_confirmed=True)

        return Response({
            'mfa_devices': [
                {
                    'id': str(d.id),
                    'name': d.name,
                    'type': d.device_type,
                    'is_primary': d.is_primary,
                    'last_used': d.last_used.isoformat() if d.last_used else None,
                    'created_at': d.created_at.isoformat(),
                }
                for d in devices
            ],
            'active_sessions': [
                {
                    'id': str(s.id),
                    'ip': s.ip_address,
                    'device': s.user_agent[:80] if s.user_agent else 'Unknown',
                    'created_at': s.created_at.isoformat(),
                    'last_seen': s.last_seen.isoformat() if hasattr(s, 'last_seen') and s.last_seen else None,
                }
                for s in sessions[:10]
            ],
        })


class RevokeSessionView(APIView):
    """Revoke sesi tertentu atau semua sesi."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get('session_id')
        revoke_all = request.data.get('revoke_all', False)

        if revoke_all:
            count = LoginSession.objects.filter(
                user=request.user, is_revoked=False
            ).update(is_revoked=True)
            return Response({'detail': f'{count} sesi berhasil dinonaktifkan.'})

        if session_id:
            try:
                session = LoginSession.objects.get(id=session_id, user=request.user)
                session.is_revoked = True
                session.save(update_fields=['is_revoked'])
                return Response({'detail': 'Sesi berhasil dinonaktifkan.'})
            except LoginSession.DoesNotExist:
                return Response({'detail': 'Sesi tidak ditemukan.'}, status=404)

        return Response({'detail': 'session_id atau revoke_all diperlukan.'}, status=400)


class RemoveMFADeviceView(APIView):
    """Hapus MFA device."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, device_id):
        try:
            device = MFADevice.objects.get(id=device_id, user=request.user)
            device.delete()
            return Response({'detail': f'Perangkat "{device.name}" dihapus.'})
        except MFADevice.DoesNotExist:
            return Response({'detail': 'Perangkat tidak ditemukan.'}, status=404)


# ─── API Keys ─────────────────────────────────────────────────────────────────

class APIKeySettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        keys = APIKey.objects.filter(user=request.user, is_active=True)
        return Response([
            {
                'id': str(k.id),
                'name': k.name,
                'prefix': k.key_prefix,
                'scopes': k.scopes,
                'created_at': k.created_at.isoformat(),
                'expires_at': k.expires_at.isoformat() if k.expires_at else None,
                'last_used': k.last_used.isoformat() if k.last_used else None,
            }
            for k in keys
        ])

    def post(self, request):
        name = request.data.get('name', '').strip()
        scopes = request.data.get('scopes', [])

        if not name:
            return Response({'detail': 'Nama API key diperlukan.'}, status=400)

        # Generate key
        raw_key = f"bm_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha512(raw_key.encode()).hexdigest()
        key_prefix = raw_key[:12]

        api_key = APIKey.objects.create(
            user=request.user,
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            scopes=scopes,
        )

        return Response({
            'id': str(api_key.id),
            'name': api_key.name,
            'key': raw_key,  # Ditampilkan sekali saja!
            'prefix': key_prefix,
            'scopes': scopes,
            'detail': 'Simpan API key ini sekarang! Tidak akan ditampilkan lagi.',
        }, status=201)

    def delete(self, request):
        key_id = request.data.get('id')
        try:
            key = APIKey.objects.get(id=key_id, user=request.user)
            key.is_active = False
            key.save(update_fields=['is_active'])
            return Response({'detail': 'API key dinonaktifkan.'})
        except APIKey.DoesNotExist:
            return Response({'detail': 'API key tidak ditemukan.'}, status=404)


# ─── Privacy ──────────────────────────────────────────────────────────────────

class PrivacySettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.compliance.models import UserConsent
        consents = UserConsent.objects.filter(user=request.user)
        return Response({
            'consents': [
                {
                    'type': c.consent_type,
                    'version': c.version,
                    'consented': c.consented,
                    'consented_at': c.consented_at.isoformat() if c.consented_at else None,
                }
                for c in consents
            ]
        })

    def patch(self, request):
        from apps.compliance.models import UserConsent
        consent_type = request.data.get('consent_type')
        consented = request.data.get('consented', False)
        version = request.data.get('version', 'v1.0')

        if not consent_type:
            return Response({'detail': 'consent_type diperlukan.'}, status=400)

        consent, _ = UserConsent.objects.get_or_create(
            user=request.user,
            consent_type=consent_type,
            version=version,
        )
        consent.consented = consented
        consent.consented_at = timezone.now() if consented else None
        consent.ip_address = request.META.get('REMOTE_ADDR')
        consent.save(update_fields=['consented', 'consented_at', 'ip_address'])

        return Response({'detail': 'Preferensi privasi disimpan!'})
