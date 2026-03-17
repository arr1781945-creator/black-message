from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KYCVaultViewSet, BlobStoreViewSet
from .views_usb import HardwareKeyViewSet, VaultSessionViewSet

router = DefaultRouter()
router.register(r'kyc', KYCVaultViewSet, basename='vault-kyc')
router.register(r'blobs', BlobStoreViewSet, basename='vault-blobs')
router.register(r'hardware-keys', HardwareKeyViewSet, basename='hardware-keys')
router.register(r'session', VaultSessionViewSet, basename='vault-session')

urlpatterns = [
    path('', include(router.urls)),
]
