"""
apps/messaging/hybrid_kem.py
Hybrid Key Exchange: X25519 + ML-KEM-1024
Rekomendasi BSI TR-02102 dan ANSSI untuk masa transisi post-quantum.

Konsep:
- Layer 1: X25519 (classical) — aman dari attacker sekarang
- Layer 2: ML-KEM-1024 (PQC) — aman dari komputer kuantum
- Final key: HKDF(X25519_secret || ML-KEM_secret)
- Kalau salah satu dibobol, sistem tetap aman

Digunakan untuk:
- E2EE session key setup antar user BlackMess
- Channel key distribution
- File/blob encryption key wrapping
"""

import os
import base64
import hashlib
import logging
from typing import Tuple

from cryptography.hazmat.primitives.asymmetric.x25519 import (
    X25519PrivateKey, X25519PublicKey
)
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import (
    Encoding, PublicFormat, PrivateFormat, NoEncryption
)
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

logger = logging.getLogger(__name__)

try:
    import oqs
    OQS_AVAILABLE = True
except ImportError:
    OQS_AVAILABLE = False
    logger.warning("liboqs not available — Hybrid KEM will use X25519 only")

HKDF_INFO = b"blackmess-hybrid-kem-v2"


# ─────────────────────────────────────────────
# KEYPAIR GENERATION
# ─────────────────────────────────────────────
def generate_hybrid_keypair() -> dict:
    """
    Generate hybrid keypair: X25519 + ML-KEM-1024.
    Returns dict dengan semua key dalam format base64.
    Private key harus disimpan aman di client — tidak boleh ke server.
    """
    # X25519
    x25519_priv = X25519PrivateKey.generate()
    x25519_pub = x25519_priv.public_key()
    x25519_priv_b64 = base64.b64encode(
        x25519_priv.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
    ).decode()
    x25519_pub_b64 = base64.b64encode(
        x25519_pub.public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).decode()

    result = {
        "x25519_public_b64": x25519_pub_b64,
        "x25519_private_b64": x25519_priv_b64,
        "mlkem_public_b64": None,
        "mlkem_private_b64": None,
        "hybrid": OQS_AVAILABLE,
    }

    # ML-KEM-1024
    if OQS_AVAILABLE:
        kem = oqs.KeyEncapsulation("ML-KEM-1024")
        mlkem_pub = kem.generate_keypair()
        mlkem_priv = kem.export_secret_key()
        result["mlkem_public_b64"] = base64.b64encode(mlkem_pub).decode()
        result["mlkem_private_b64"] = base64.b64encode(mlkem_priv).decode()

    return result


# ─────────────────────────────────────────────
# ENCAPSULATE (Alice → Bob)
# ─────────────────────────────────────────────
def hybrid_encapsulate(
    peer_x25519_pub_b64: str,
    peer_mlkem_pub_b64: str = None,
    context: str = "blackmess-e2ee",
) -> Tuple[bytes, dict]:
    """
    Encapsulate shared secret menggunakan public key peer.
    Returns (shared_secret_bytes, ciphertext_dict).
    ciphertext_dict dikirim ke peer untuk decapsulate.
    """
    secrets = []
    ciphertext = {"context": context, "hybrid": False}

    # Layer 1: X25519
    peer_x25519_pub_bytes = base64.b64decode(peer_x25519_pub_b64)
    peer_x25519_pub = X25519PublicKey.from_public_bytes(peer_x25519_pub_bytes)

    eph_priv = X25519PrivateKey.generate()
    eph_pub = eph_priv.public_key()
    x25519_secret = eph_priv.exchange(peer_x25519_pub)
    secrets.append(x25519_secret)

    ciphertext["x25519_eph_pub_b64"] = base64.b64encode(
        eph_pub.public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).decode()

    # Layer 2: ML-KEM-1024 (jika tersedia)
    if OQS_AVAILABLE and peer_mlkem_pub_b64:
        try:
            peer_mlkem_pub = base64.b64decode(peer_mlkem_pub_b64)
            kem = oqs.KeyEncapsulation("ML-KEM-1024")
            mlkem_ct, mlkem_secret = kem.encap_secret(peer_mlkem_pub)
            secrets.append(mlkem_secret)
            ciphertext["mlkem_ct_b64"] = base64.b64encode(mlkem_ct).decode()
            ciphertext["hybrid"] = True
        except Exception as e:
            logger.warning("ML-KEM encap failed, fallback to X25519 only: %s", e)

    # Combine secrets via HKDF
    combined_input = b"".join(secrets)
    shared_secret = HKDF(
        algorithm=hashes.SHA512(),
        length=32,
        salt=None,
        info=HKDF_INFO + context.encode(),
    ).derive(combined_input)

    return shared_secret, ciphertext


# ─────────────────────────────────────────────
# DECAPSULATE (Bob)
# ─────────────────────────────────────────────
def hybrid_decapsulate(
    x25519_priv_b64: str,
    mlkem_priv_b64: str = None,
    ciphertext: dict = None,
) -> bytes:
    """
    Recover shared secret dari ciphertext menggunakan private key.
    """
    if not ciphertext:
        raise ValueError("ciphertext diperlukan")

    secrets = []
    context = ciphertext.get("context", "blackmess-e2ee")

    # Layer 1: X25519
    x25519_priv_bytes = base64.b64decode(x25519_priv_b64)
    x25519_priv = X25519PrivateKey.from_private_bytes(x25519_priv_bytes)
    eph_pub_bytes = base64.b64decode(ciphertext["x25519_eph_pub_b64"])
    eph_pub = X25519PublicKey.from_public_bytes(eph_pub_bytes)
    x25519_secret = x25519_priv.exchange(eph_pub)
    secrets.append(x25519_secret)

    # Layer 2: ML-KEM-1024
    if OQS_AVAILABLE and mlkem_priv_b64 and ciphertext.get("mlkem_ct_b64"):
        try:
            mlkem_priv = base64.b64decode(mlkem_priv_b64)
            mlkem_ct = base64.b64decode(ciphertext["mlkem_ct_b64"])
            kem = oqs.KeyEncapsulation("ML-KEM-1024", mlkem_priv)
            mlkem_secret = kem.decap_secret(mlkem_ct)
            secrets.append(mlkem_secret)
        except Exception as e:
            logger.warning("ML-KEM decap failed: %s", e)

    # Combine via HKDF
    combined_input = b"".join(secrets)
    shared_secret = HKDF(
        algorithm=hashes.SHA512(),
        length=32,
        salt=None,
        info=HKDF_INFO + context.encode(),
    ).derive(combined_input)

    return shared_secret


# ─────────────────────────────────────────────
# ENCRYPT MESSAGE dengan shared secret
# ─────────────────────────────────────────────
def encrypt_message(
    shared_secret: bytes,
    plaintext: bytes,
    channel_id: str,
    message_id: str,
) -> dict:
    """
    Enkripsi pesan dengan AES-256-GCM menggunakan derived message key.
    Key di-derive per-pesan dari shared secret + channel_id + message_id.
    """
    # Derive per-message key
    msg_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=f"blackmess-msg:{channel_id}:{message_id}".encode(),
    ).derive(shared_secret)

    nonce = os.urandom(12)
    aad = f"{channel_id}:{message_id}".encode()
    aesgcm = AESGCM(msg_key)
    ct_with_tag = aesgcm.encrypt(nonce, plaintext, aad)

    return {
        "ciphertext_b64": base64.b64encode(ct_with_tag[:-16]).decode(),
        "nonce_b64": base64.b64encode(nonce).decode(),
        "tag_b64": base64.b64encode(ct_with_tag[-16:]).decode(),
        "channel_id": channel_id,
        "message_id": message_id,
        "algorithm": "AES-256-GCM",
        "kem": "X25519+ML-KEM-1024" if OQS_AVAILABLE else "X25519",
    }


def decrypt_message(
    shared_secret: bytes,
    encrypted: dict,
) -> bytes:
    """Decrypt pesan yang dienkripsi dengan encrypt_message()."""
    channel_id = encrypted["channel_id"]
    message_id = encrypted["message_id"]

    msg_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=f"blackmess-msg:{channel_id}:{message_id}".encode(),
    ).derive(shared_secret)

    nonce = base64.b64decode(encrypted["nonce_b64"])
    ciphertext = base64.b64decode(encrypted["ciphertext_b64"])
    tag = base64.b64decode(encrypted["tag_b64"])
    aad = f"{channel_id}:{message_id}".encode()

    aesgcm = AESGCM(msg_key)
    return aesgcm.decrypt(nonce, ciphertext + tag, aad)


# ─────────────────────────────────────────────
# FINGERPRINT
# ─────────────────────────────────────────────
def compute_hybrid_fingerprint(x25519_pub_b64: str, mlkem_pub_b64: str = None) -> str:
    """
    Fingerprint dari hybrid public key untuk verifikasi out-of-band.
    Format: SHA-256(x25519_pub || mlkem_pub)[:16] hex
    """
    data = base64.b64decode(x25519_pub_b64)
    if mlkem_pub_b64:
        data += base64.b64decode(mlkem_pub_b64)
    return hashlib.sha256(data).hexdigest()[:32]
