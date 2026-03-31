import hashlib
import secrets
import string
import pyotp
import qrcode
import io
import base64
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .models import BankUser, MFADevice, InviteToken, UserRole
from .email_service import send_otp_email, send_invite_email


def generate_otp():
    return ''.join(secrets.choice(string.digits) for _ in range(6))

def hash_otp(otp: str, email: str) -> str:
    return hashlib.sha256(f"{otp}{email}".encode()).hexdigest()


@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    email = request.data.get('email')
    name = request.data.get('name', '')
    if not email:
        return Response({'error': 'Email required'}, status=400)

    rate_key = f'otp_rate_{email}'
    attempts = cache.get(rate_key, 0)
    if attempts >= 3:
        return Response({'error': 'Terlalu banyak permintaan. Coba lagi 10 menit lagi.'}, status=429)

    otp = generate_otp()
    otp_hash = hash_otp(otp, email)
    cache.set(f'otp_hash_{email}', otp_hash, timeout=300)
    cache.set(rate_key, attempts + 1, timeout=600)

    sent = send_otp_email(email, otp, name)
    if sent:
        return Response({'message': 'OTP dikirim ke email kamu.'})
    return Response({'error': 'Gagal kirim email.'}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    email = request.data.get('email')
    code = request.data.get('code', '').strip()

    if not email or not code:
        return Response({'error': 'Email dan kode diperlukan.'}, status=400)

    # ✅ Cek apakah user punya TOTP device aktif
    try:
        user = BankUser.objects.get(email=email)
        totp_device = user.mfa_devices.filter(
            device_type='totp', is_confirmed=True
        ).first()

        if totp_device:
            # Verifikasi TOTP beneran
            import json
            secret = totp_device.secret_encrypted
            try:
                secret = json.loads(secret).get('secret', secret)
            except Exception:
                pass
            totp = pyotp.TOTP(secret)
            if not totp.verify(code, valid_window=1):
                return Response({'error': 'Kode TOTP salah atau expired.'}, status=400)
            user.is_mfa_verified = True
            user.save(update_fields=['is_mfa_verified'])
            return Response({'message': 'Verifikasi berhasil!'})
    except BankUser.DoesNotExist:
        pass

    # Fallback: verifikasi OTP email
    otp_hash = cache.get(f'otp_hash_{email}')
    if not otp_hash:
        return Response({'error': 'Kode expired. Minta OTP baru.'}, status=400)

    if otp_hash != hash_otp(code, email):
        return Response({'error': 'Kode salah.'}, status=400)

    cache.delete(f'otp_hash_{email}')
    return Response({'message': 'Verifikasi berhasil!'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_invite(request):
    """Generate InviteToken di DB + kirim link asli via email."""
    from apps.workspace.models import Workspace

    workspace_id = request.data.get('workspace_id')
    to_email = request.data.get('to_email')
    role_name = request.data.get('role', 'member')

    if not workspace_id or not to_email:
        return Response({'error': 'workspace_id dan to_email diperlukan.'}, status=400)

    try:
        workspace = Workspace.objects.get(id=workspace_id)
    except Workspace.DoesNotExist:
        return Response({'error': 'Workspace tidak ditemukan.'}, status=404)

    try:
        role = UserRole.objects.get(name=role_name)
    except UserRole.DoesNotExist:
        role = UserRole.objects.first()
        if not role:
            return Response({'error': 'Role tidak ditemukan.'}, status=404)

    # Rate limit
    rate_key = f'invite_rate_{request.user.id}'
    attempts = cache.get(rate_key, 0)
    if attempts >= 10:
        return Response({'error': 'Terlalu banyak undangan. Coba lagi 1 jam lagi.'}, status=429)
    cache.set(rate_key, attempts + 1, timeout=3600)

    # Generate token asli
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha512(raw_token.encode()).hexdigest()

    invite = InviteToken.objects.create(
        workspace=workspace,
        created_by=request.user,
        email=to_email,
        role=role,
        token_hash=token_hash,
        expires_at=timezone.now() + timezone.timedelta(days=7),
    )

    # Link asli ke frontend
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://black-message.vercel.app')
    invite_link = f"{frontend_url}/invite/{raw_token}"

    sent = send_invite_email(
        to_email=to_email,
        from_name=request.user.get_full_name() or request.user.username,
        invite_link=invite_link,
        workspace=workspace.name,
    )

    if sent:
        return Response({
            'message': f'Undangan dikirim ke {to_email}',
            'invite_link': invite_link,
            'expires_at': invite.expires_at.isoformat(),
        })
    return Response({'error': 'Gagal kirim email undangan.'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_totp_secret(request):
    """Generate TOTP secret + QR code."""
    user = request.user
    email = user.email

    secret = pyotp.random_base32()
    cache.set(f'totp_setup_{email}', secret, timeout=600)

    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=email,
        issuer_name='BlackMess'
    )

    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_b64 = base64.b64encode(buffer.getvalue()).decode()

    return Response({
        'secret': secret,
        'qr_code': f'data:image/png;base64,{qr_b64}',
        'totp_uri': totp_uri,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_totp_setup(request):
    """Verifikasi TOTP saat setup + simpan ke MFADevice."""
    user = request.user
    email = user.email
    code = request.data.get('code', '').strip()

    if not code:
        return Response({'error': 'Kode diperlukan.'}, status=400)

    secret = cache.get(f'totp_setup_{email}')
    if not secret:
        return Response({'error': 'Setup expired. Generate ulang QR code.'}, status=400)

    totp = pyotp.TOTP(secret)
    if not totp.verify(code, valid_window=1):
        return Response({'error': 'Kode salah!'}, status=400)

    # ✅ Simpan ke MFADevice beneran, bukan cuma cache
    import json
    device_name = request.data.get('device_name', 'Google Authenticator')
    MFADevice.objects.filter(user=user, device_type='totp').update(is_primary=False)
    MFADevice.objects.create(
        user=user,
        device_type='totp',
        name=device_name,
        secret_encrypted=json.dumps({'secret': secret}),
        is_confirmed=True,
        is_primary=True,
    )

    cache.delete(f'totp_setup_{email}')

    # Update user MFA status
    user.is_mfa_verified = True
    user.save(update_fields=['is_mfa_verified'])

    return Response({'message': f'Google Authenticator "{device_name}" berhasil didaftarkan!'})
