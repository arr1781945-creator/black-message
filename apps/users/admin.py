"""
apps/users/admin.py — Hardened admin registration
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import BankUser, UserProfile, UserRole, UserRoleAssignment, MFADevice, LoginSession


@admin.register(BankUser)
class BankUserAdmin(UserAdmin):
    list_display = ["username", "employee_id", "department", "clearance_level", "is_mfa_verified", "is_locked", "last_active"]
    list_filter = ["clearance_level", "is_mfa_verified", "is_locked", "department"]
    search_fields = ["username", "email", "employee_id"]
    readonly_fields = ["last_active", "last_ip", "pqc_public_key_kyber", "pqc_public_key_dilithium"]
    fieldsets = UserAdmin.fieldsets + (
        ("Banking Fields", {
            "fields": ("employee_id", "department", "clearance_level", "is_mfa_enforced",
                       "is_mfa_verified", "is_locked", "last_ip", "last_active")
        }),
        ("PQC Keys (Read-Only)", {
            "fields": ("pqc_public_key_kyber", "pqc_public_key_dilithium"),
            "classes": ("collapse",),
        }),
    )


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ["name", "display_name", "max_clearance", "can_access_vault", "can_export_messages"]


@admin.register(LoginSession)
class LoginSessionAdmin(admin.ModelAdmin):
    list_display = ["user", "ip_address", "created_at", "last_seen", "is_revoked"]
    list_filter = ["is_revoked"]
    search_fields = ["user__username", "ip_address"]
    readonly_fields = ["user", "ip_address", "user_agent", "refresh_jti", "created_at"]
