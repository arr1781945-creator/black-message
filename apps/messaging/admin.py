"""apps/messaging/admin.py"""
from django.contrib import admin
from .models import Message, Thread, Reaction, TTLPolicy


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["id", "channel", "sender", "message_type", "is_deleted", "is_destroyed", "destroy_at", "created_at"]
    list_filter = ["message_type", "is_deleted", "is_destroyed"]
    readonly_fields = ["id", "ciphertext_b64", "nonce_b64", "auth_tag_b64", "created_at"]
    search_fields = ["sender__username", "channel__name"]


@admin.register(TTLPolicy)
class TTLPolicyAdmin(admin.ModelAdmin):
    list_display = ["scope", "scope_id", "ttl_seconds", "applies_to_type", "created_at"]
