"""apps/vault/admin.py"""
from django.contrib import admin
from .models import UserKYCVault, CorporateIDVault, HardwareKeyRegistry, EncryptedBlobStore, AccessSession


@admin.register(HardwareKeyRegistry)
class HardwareKeyAdmin(admin.ModelAdmin):
    list_display = ["user", "slot", "key_type", "label", "is_active", "sign_count", "registered_at", "last_used"]
    list_filter = ["key_type", "slot", "is_active"]
    search_fields = ["user__username", "label", "aaguid"]
    readonly_fields = ["sign_count", "registered_at", "last_used", "credential_id_enc", "public_key_enc"]


@admin.register(AccessSession)
class AccessSessionAdmin(admin.ModelAdmin):
    list_display = ["user", "hardware_key", "opened_at", "expires_at", "is_active", "ip_address"]
    list_filter = ["is_active"]
    readonly_fields = ["user", "session_token_hash", "ip_address", "opened_at", "fido2_challenge_b64"]


@admin.register(UserKYCVault)
class KYCVaultAdmin(admin.ModelAdmin):
    list_display = ["user", "id_type", "kyc_status", "verified_at"]
    list_filter = ["kyc_status", "id_type"]
    readonly_fields = ["user", "full_name_enc", "date_of_birth_enc", "id_number_enc"]


@admin.register(EncryptedBlobStore)
class BlobStoreAdmin(admin.ModelAdmin):
    list_display = ["owner", "blob_type", "label", "size_bytes", "is_destroyed", "created_at"]
    list_filter = ["blob_type", "is_destroyed"]
