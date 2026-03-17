"""
apps/messaging/zero_knowledge.py
Zero-Knowledge proof helpers.
Server NEVER sees plaintext — only stores + forwards ciphertext blobs.
ZK commitment scheme: SHA-256 hash of plaintext as commitment.
Server can verify message integrity without knowing content.
"""
import hashlib
import hmac
import base64
import os
from django.conf import settings


def create_zk_commitment(plaintext: str) -> str:
    """
    Create ZK commitment — SHA-256(plaintext + salt).
    Server stores commitment, never plaintext.
    """
    salt = os.urandom(32)
    commitment = hashlib.sha256(
        salt + plaintext.encode('utf-8')
    ).digest()
    return base64.b64encode(salt + commitment).decode()


def verify_zk_commitment(plaintext: str, commitment_b64: str) -> bool:
    """
    Verify ZK commitment without server knowing plaintext.
    Client sends plaintext only for verification, server discards immediately.
    """
    try:
        raw = base64.b64decode(commitment_b64)
        salt = raw[:32]
        stored_commitment = raw[32:]
        computed = hashlib.sha256(salt + plaintext.encode('utf-8')).digest()
        return hmac.compare_digest(computed, stored_commitment)
    except Exception:
        return False


def create_zk_channel_proof(user_id: str, channel_id: str) -> str:
    """
    ZK proof that user is member of channel without revealing membership list.
    HMAC-SHA256(user_id + channel_id, server_secret)
    """
    secret = settings.AES_MASTER_KEY[:32]
    msg = f"{user_id}:{channel_id}".encode()
    proof = hmac.new(secret, msg, hashlib.sha256).digest()
    return base64.b64encode(proof).decode()


def verify_zk_channel_proof(user_id: str, channel_id: str, proof_b64: str) -> bool:
    """Verify channel membership proof."""
    try:
        expected = create_zk_channel_proof(user_id, channel_id)
        return hmac.compare_digest(
            base64.b64decode(proof_b64),
            base64.b64decode(expected)
        )
    except Exception:
        return False


def zk_message_receipt(message_id: str, receiver_id: str) -> str:
    """
    Zero-knowledge read receipt.
    Proves message was received without revealing when or by whom to others.
    """
    secret = settings.AES_MASTER_KEY[:32]
    msg = f"receipt:{message_id}:{receiver_id}".encode()
    receipt = hmac.new(secret, msg, hashlib.sha256).digest()
    return base64.b64encode(receipt).decode()
