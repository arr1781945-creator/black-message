"""
apps/messaging/ipfs_handler.py
IPFS file upload/download with encryption.
Files encrypted with AES-256-GCM before upload to IPFS.
"""
import logging
import base64
import os
from .crypto_e2ee import aes_gcm_encrypt, aes_gcm_decrypt
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_ipfs_client():
    """Get IPFS client — fallback to local storage if unavailable."""
    try:
        import ipfshttpclient
        return ipfshttpclient.connect('/ip4/127.0.0.1/tcp/5001')
    except Exception as e:
        logger.warning("IPFS unavailable: %s — using local fallback", e)
        return None


def upload_encrypted_file(file_bytes: bytes, filename: str, channel_id: str) -> dict:
    """
    Encrypt file with AES-256-GCM then upload to IPFS.
    Returns dict with cid, nonce, auth_tag.
    """
    # Derive file encryption key from master key + channel
    from .crypto_e2ee import derive_message_key
    file_key = derive_message_key(
        settings.AES_MASTER_KEY,
        channel_id,
        f"file:{filename}"
    )

    # Encrypt
    ct_b64, nonce_b64, tag_b64 = aes_gcm_encrypt(
        file_key, file_bytes, aad=channel_id.encode()
    )
    encrypted_bytes = base64.b64decode(ct_b64)

    client = _get_ipfs_client()
    if client:
        try:
            cid = client.add_bytes(encrypted_bytes)
            logger.info("IPFS upload: %s -> %s", filename, cid)
            return {
                "cid": cid,
                "nonce_b64": nonce_b64,
                "auth_tag_b64": tag_b64,
                "storage": "ipfs",
                "filename": filename,
                "size": len(file_bytes),
            }
        except Exception as e:
            logger.error("IPFS upload failed: %s", e)

    # Fallback: save to media/
    fallback_path = os.path.join(settings.MEDIA_ROOT, 'attachments', channel_id)
    os.makedirs(fallback_path, exist_ok=True)
    safe_name = base64.urlsafe_b64encode(filename.encode()).decode()[:50]
    filepath = os.path.join(fallback_path, safe_name)
    with open(filepath, 'wb') as f:
        f.write(encrypted_bytes)

    return {
        "cid": f"local:{safe_name}",
        "nonce_b64": nonce_b64,
        "auth_tag_b64": tag_b64,
        "storage": "local",
        "filename": filename,
        "size": len(file_bytes),
    }


def download_encrypted_file(cid: str, nonce_b64: str, auth_tag_b64: str, channel_id: str, filename: str) -> bytes:
    """Download and decrypt file from IPFS or local storage."""
    from .crypto_e2ee import derive_message_key
    file_key = derive_message_key(
        settings.AES_MASTER_KEY,
        channel_id,
        f"file:{filename}"
    )

    if cid.startswith('local:'):
        # Local fallback
        safe_name = cid[6:]
        filepath = os.path.join(settings.MEDIA_ROOT, 'attachments', channel_id, safe_name)
        with open(filepath, 'rb') as f:
            encrypted_bytes = f.read()
    else:
        client = _get_ipfs_client()
        if not client:
            raise FileNotFoundError("IPFS unavailable and no local fallback")
        encrypted_bytes = client.cat(cid)

    ct_b64 = base64.b64encode(encrypted_bytes).decode()
    return aes_gcm_decrypt(file_key, ct_b64, nonce_b64, auth_tag_b64, aad=channel_id.encode())


def pin_to_ipfs(cid: str) -> bool:
    """Pin CID to prevent garbage collection."""
    client = _get_ipfs_client()
    if not client:
        return False
    try:
        client.pin.add(cid)
        return True
    except Exception as e:
        logger.error("IPFS pin failed: %s", e)
        return False
