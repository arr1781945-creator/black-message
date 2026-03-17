"""
apps/messaging/serializers.py
"""
from rest_framework import serializers
from .models import Message, Thread, Reaction, Attachment, Mention, MessageBookmark


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ["id", "original_filename", "content_type", "size_bytes",
                  "storage_backend", "ipfs_cid", "checksum_sha256", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]


class ReactionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Reaction
        fields = ["id", "emoji_code", "user", "username", "created_at"]
        read_only_fields = ["id", "created_at"]


class MessageSerializer(serializers.ModelSerializer):
    reactions = ReactionSerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    sender_avatar = serializers.CharField(source="sender.avatar_ipfs_cid", read_only=True)
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id", "channel", "sender", "sender_username", "sender_avatar",
            "ciphertext_b64", "nonce_b64", "auth_tag_b64",
            "kyber_ciphertext_b64", "dilithium_signature_b64",
            "message_type", "is_edited", "is_deleted",
            "ttl_seconds", "destroy_at", "thread", "reply_count",
            "reactions", "attachments", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "sender", "is_edited", "is_deleted", "created_at", "updated_at"]

    def get_reply_count(self, obj):
        if hasattr(obj, "thread_root"):
            return obj.thread_root.reply_count
        return 0


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["channel", "ciphertext_b64", "nonce_b64", "auth_tag_b64",
                  "kyber_ciphertext_b64", "dilithium_signature_b64",
                  "message_type", "thread", "ttl_seconds"]

    def create(self, validated_data):
        validated_data["sender"] = self.context["request"].user
        return super().create(validated_data)


class ThreadSerializer(serializers.ModelSerializer):
    root_message = MessageSerializer(read_only=True)

    class Meta:
        model = Thread
        fields = ["id", "channel", "root_message", "reply_count", "last_reply_at", "participant_count", "created_at"]


class MentionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mention
        fields = ["id", "message", "mentioned_user", "is_read", "created_at"]


class BookmarkSerializer(serializers.ModelSerializer):
    message = MessageSerializer(read_only=True)

    class Meta:
        model = MessageBookmark
        fields = ["id", "message", "note", "created_at"]
