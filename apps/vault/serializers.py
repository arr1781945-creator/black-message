"""apps/vault/serializers.py"""
from rest_framework import serializers
from .models import UserKYCVault, CorporateIDVault, HardwareKeyRegistry, EncryptedBlobStore, AccessSession


class AccessSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessSession
        fields = ["id", "opened_at", "expires_at", "is_active", "ip_address", "hardware_key"]
        read_only_fields = ["id", "opened_at", "ip_address"]


class HardwareKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = HardwareKeyRegistry
        fields = ["id", "slot", "key_type", "label", "aaguid", "vendor_id", "product_id",
                  "sign_count", "is_active", "registered_at", "last_used"]
        read_only_fields = ["id", "sign_count", "registered_at", "last_used"]


class EncryptedBlobSerializer(serializers.ModelSerializer):
    class Meta:
        model = EncryptedBlobStore
        fields = ["id", "blob_type", "label", "content_type", "size_bytes",
                  "ipfs_cid", "min_clearance", "destroy_at", "created_at"]
        read_only_fields = ["id", "ipfs_cid", "created_at"]


class KYCVaultReadSerializer(serializers.ModelSerializer):
    """Read-only — returns encrypted fields as-is for client-side decryption."""
    class Meta:
        model = UserKYCVault
        fields = ["id", "id_type", "kyc_status", "verified_at", "key_version",
                  "full_name_enc", "date_of_birth_enc", "id_number_enc", "id_expiry_enc"]
        read_only_fields = fields


class VaultOpenSerializer(serializers.Serializer):
    """Request body for opening a vault session."""
    hardware_key_id = serializers.UUIDField()
    fido2_assertion_b64 = serializers.CharField()
    fido2_challenge_b64 = serializers.CharField()
