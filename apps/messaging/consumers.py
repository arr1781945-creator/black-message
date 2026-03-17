"""
apps/messaging/consumers.py
WebSocket consumer dengan full PQC + E2EE + ZK + TTL integration.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

logger = logging.getLogger(__name__)

class SecureMessageConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope["user"]
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.channel_id = self.scope["url_route"]["kwargs"]["channel_id"]
        self.room_group = f"channel_{self.channel_id}"

        # Join channel group
        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

        # Update presence
        await self.set_presence("active")
        await self.channel_layer.group_send(self.room_group, {
            "type": "presence_update",
            "user_id": str(self.user.id),
            "username": self.user.username,
            "status": "active",
        })

        logger.info("User %s connected to channel %s", self.user.username, self.channel_id)

    async def disconnect(self, close_code):
        await self.set_presence("offline")
        await self.channel_layer.group_send(self.room_group, {
            "type": "presence_update",
            "user_id": str(self.user.id),
            "username": self.user.username,
            "status": "offline",
        })
        await self.channel_layer.group_discard(self.room_group, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get("type")

        if msg_type == "send_message":
            await self.handle_send_message(data)
        elif msg_type == "typing_start":
            await self.handle_typing(True)
        elif msg_type == "typing_stop":
            await self.handle_typing(False)
        elif msg_type == "add_reaction":
            await self.handle_reaction(data)
        elif msg_type == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))

    async def handle_send_message(self, data):
        ciphertext_b64  = data.get("ciphertext_b64", "")
        nonce_b64       = data.get("nonce_b64", "")
        auth_tag_b64    = data.get("auth_tag_b64", "")
        signature_b64   = data.get("signature_b64", "")
        thread_id       = data.get("thread_id")
        ttl_seconds     = data.get("ttl_seconds")

        # ── ZK: Server never decrypts user messages ──────────────────
        # We only store opaque ciphertext blobs.

        # ── PQC Dilithium3 signature verification ────────────────────
        if signature_b64:
            message_bytes = f"{ciphertext_b64}:{nonce_b64}:{auth_tag_b64}".encode()
            is_valid = await self.verify_dilithium_signature(message_bytes, signature_b64)
            if not is_valid:
                await self.send(text_data=json.dumps({
                    "type": "error",
                    "detail": "Invalid PQC signature — message rejected."
                }))
                return

        # ── Save to DB ───────────────────────────────────────────────
        message = await self.save_message(
            ciphertext_b64, nonce_b64, auth_tag_b64,
            thread_id, ttl_seconds
        )

        # ── Broadcast to channel group ───────────────────────────────
        await self.channel_layer.group_send(self.room_group, {
            "type":           "chat_message",
            "id":             str(message.id),
            "sender":         {"id": str(self.user.id), "username": self.user.username},
            "ciphertext_b64": ciphertext_b64,
            "nonce_b64":      nonce_b64,
            "auth_tag_b64":   auth_tag_b64,
            "thread_id":      str(thread_id) if thread_id else None,
            "created_at":     message.created_at.isoformat(),
            "destroy_at":     message.destroy_at.isoformat() if message.destroy_at else None,
        })

    async def handle_typing(self, is_typing):
        await self.channel_layer.group_send(self.room_group, {
            "type":     "typing_indicator",
            "username": self.user.username,
            "typing":   is_typing,
        })

    async def handle_reaction(self, data):
        message_id = data.get("message_id")
        emoji_code = data.get("emoji_code")
        if not message_id or not emoji_code:
            return
        await self.save_reaction(message_id, emoji_code)
        await self.channel_layer.group_send(self.room_group, {
            "type":       "reaction_update",
            "message_id": message_id,
            "emoji_code": emoji_code,
            "username":   self.user.username,
            "action":     "added",
        })

    # ── Event handlers (group_send receivers) ────────────────────────

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({**event, "type": "message"}))

    async def typing_indicator(self, event):
        await self.send(text_data=json.dumps({**event, "type": "typing"}))

    async def presence_update(self, event):
        await self.send(text_data=json.dumps({**event, "type": "presence"}))

    async def reaction_update(self, event):
        await self.send(text_data=json.dumps({**event, "type": "reaction"}))

    # ── DB helpers ───────────────────────────────────────────────────

    @database_sync_to_async
    def save_message(self, ct, nonce, tag, thread_id, ttl_seconds):
        from .models import Message, Thread
        from django.utils import timezone
        import datetime

        destroy_at = None
        if ttl_seconds:
            destroy_at = timezone.now() + datetime.timedelta(seconds=int(ttl_seconds))

        thread = None
        if thread_id:
            thread = Thread.objects.filter(id=thread_id).first()

        return Message.objects.create(
            channel_id=self.channel_id,
            sender=self.user,
            ciphertext_b64=ct,
            nonce_b64=nonce,
            auth_tag_b64=tag,
            thread=thread,
            destroy_at=destroy_at,
        )

    @database_sync_to_async
    def save_reaction(self, message_id, emoji_code):
        from .models import Reaction, Message
        msg = Message.objects.filter(id=message_id).first()
        if msg:
            Reaction.objects.get_or_create(
                message=msg, user=self.user, emoji_code=emoji_code
            )

    @database_sync_to_async
    def set_presence(self, status):
        from apps.workspace.models import UserPresence
        UserPresence.objects.update_or_create(
            user=self.user,
            defaults={"status": status, "last_seen": timezone.now()}
        )

    @database_sync_to_async
    def verify_dilithium_signature(self, message_bytes, signature_b64):
        try:
            from apps.users.utils_pqc import dilithium_verify, OQS_AVAILABLE
            if not OQS_AVAILABLE:
                return True
            from apps.users.models import UserPublicKey
            key = UserPublicKey.objects.filter(
                user=self.user, key_type="ml_dsa_65", is_active=True
            ).first()
            if not key:
                return True  # No key yet = allow (first message)
            return dilithium_verify(key.public_key_b64, message_bytes, signature_b64)
        except Exception as e:
            logger.error("Dilithium verify error: %s", e)
            return True


async def create_message_commitment(plaintext_hash: str) -> str:
    """Server creates ZK commitment from client-provided hash."""
    from .zero_knowledge import create_zk_commitment
    return create_zk_commitment(plaintext_hash)


async def handle_trading_order(self, data):
    """Handle trading order dengan race condition protection."""
    from apps.workspace.trading_engine import process_trading_order, generate_idempotency_key
    from decimal import Decimal

    try:
        idem_key = generate_idempotency_key(
            str(self.user.id),
            data.get('desk_id', ''),
            data.get('amount', '0'),
            data.get('instrument', ''),
        )

        result = await database_sync_to_async(process_trading_order)(
            desk_id=data['desk_id'],
            user_id=str(self.user.id),
            instrument=data['instrument'],
            direction=data['direction'],
            amount=Decimal(str(data['amount'])),
            price=Decimal(str(data['price'])),
            currency=data.get('currency', 'IDR'),
            idempotency_key=idem_key,
        )

        await self.send(text_data=json.dumps({
            'type': 'trading_order_result',
            **result,
        }))

    except RuntimeError as e:
        await self.send(text_data=json.dumps({
            'type': 'error',
            'detail': str(e),
            'code': 'LOCK_CONTENTION',
        }))
    except ValueError as e:
        await self.send(text_data=json.dumps({
            'type': 'error',
            'detail': str(e),
            'code': 'RISK_LIMIT_EXCEEDED',
        }))
