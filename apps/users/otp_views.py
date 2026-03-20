import random
import string
import hashlib
import time
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .email_service import send_otp_email, send_invite_email

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def hash_otp(otp: str, email: str) -> str:
    return hashlib.sha256(f"{otp}{email}".encode()).hexdigest()

@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    email = request.data.get('email')
    name = request.data.get('name', '')
    if not email:
        return Response({'error': 'Email required'}, status=400)

    # Rate limiting — max 3x per 10 menit
    rate_key = f'otp_rate_{email}'
    attempts = cache.get(rate_key, 0)
    if attempts >= 3:
        return Response({'error': 'Terlalu banyak permintaan. Coba lagi 10 menit lagi.'}, status=429)

    otp = generate_otp()
    
    # Simpan OTP dalam bentuk hash
    otp_hash = hash_otp(otp, email)
    cache.set(f'otp_hash_{email}', otp_hash, timeout=300)  # 5 menit
    cache.set(f'otp_time_{email}', time.time(), timeout=300)
    
    # Increment rate limit
    cache.set(rate_key, attempts + 1, timeout=600)  # 10 menit

    sent = send_otp_email(email, otp, name)
    if sent:
        return Response({'message': 'OTP sent successfully'})
    return Response({'error': 'Failed to send email'}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    email = request.data.get('email')
    otp = request.data.get('otp')
    if not email or not otp:
        return Response({'error': 'Email and OTP required'}, status=400)

    # Cek apakah OTP sudah expired
    otp_time = cache.get(f'otp_time_{email}')
    if not otp_time:
        return Response({'error': 'OTP expired. Minta kode baru.'}, status=400)

    # Verifikasi hash
    stored_hash = cache.get(f'otp_hash_{email}')
    if not stored_hash:
        return Response({'error': 'OTP expired. Minta kode baru.'}, status=400)

    input_hash = hash_otp(otp, email)
    if input_hash != stored_hash:
        return Response({'error': 'Kode OTP salah!'}, status=400)

    # Hapus OTP setelah dipakai — one time use!
    cache.delete(f'otp_hash_{email}')
    cache.delete(f'otp_time_{email}')
    cache.delete(f'otp_rate_{email}')

    return Response({'message': 'OTP verified successfully'})

@api_view(['POST'])
@permission_classes([AllowAny])
def send_invite(request):
    to_email = request.data.get('to_email')
    from_name = request.data.get('from_name')
    from_email = request.data.get('from_email', '')
    invite_link = request.data.get('invite_link')
    workspace = request.data.get('workspace', 'BlackMess')

    if not all([to_email, from_name, invite_link]):
        return Response({'error': 'Missing fields'}, status=400)

    # Validasi email perusahaan
    personal = ['gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com']
    domain = to_email.split('@')[-1]
    if domain in personal:
        return Response({'error': 'Hanya email perusahaan yang diizinkan'}, status=400)

    # Rate limit invite — max 10 per jam
    rate_key = f'invite_rate_{from_email}'
    attempts = cache.get(rate_key, 0)
    if attempts >= 10:
        return Response({'error': 'Terlalu banyak undangan. Coba lagi 1 jam lagi.'}, status=429)
    cache.set(rate_key, attempts + 1, timeout=3600)

    sent = send_invite_email(to_email, from_name, invite_link, workspace)
    if sent:
        return Response({'message': 'Invite sent successfully'})
    return Response({'error': 'Failed to send email'}, status=500)
