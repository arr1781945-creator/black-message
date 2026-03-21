import uuid
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import BankUser, LoginSession, UserPublicKey
from .serializers import BankUserSerializer as UserSerializer, UserPublicKeySerializer as PublicKeySerializer
import logging

logger = logging.getLogger(__name__)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)
        if not user:
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({'detail': 'Account disabled'}, status=status.HTTP_403_FORBIDDEN)
        refresh = RefreshToken.for_user(user)
        refresh['employee_id'] = str(user.employee_id or '')
        refresh['clearance'] = user.clearance_level
        refresh['mfa_verified'] = False
        LoginSession.objects.create(
            user=user,
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'mfa_required': user.mfa_devices.filter(is_confirmed=True).exists(),
        })


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data.get('refresh'))
            token.blacklist()
        except Exception:
            pass
        return Response({'detail': 'Logged out'})


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


class MeProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not user.check_password(old_password):
            return Response({'detail': 'Wrong password'}, status=400)
        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Password changed'})


class SessionListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sessions = LoginSession.objects.filter(user=request.user).order_by('-created_at')[:10]
        return Response([{
            'id': str(s.id),
            'ip': s.ip_address,
            'ua': s.user_agent,
            'created': s.created_at,
        } for s in sessions])


class PublicKeyView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PublicKeySerializer

    def get_queryset(self):
        return UserPublicKey.objects.filter(user=self.request.user, is_active=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MFASetupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .utils_mfa import generate_totp_secret, get_totp_uri
        secret = generate_totp_secret()
        uri = get_totp_uri(secret, request.user.username)
        return Response({'secret': secret, 'uri': uri})


class MFAVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .utils_mfa import verify_totp
        code = request.data.get('code')
        device_id = request.data.get('device_id')
        if verify_totp(request.user, code):
            return Response({'detail': 'MFA verified'})
        return Response({'detail': 'Invalid code'}, status=400)
