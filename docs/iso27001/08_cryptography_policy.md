# Cryptography Policy
**Organization:** BlackMess Research
**Version:** 1.0
**Date:** April 2026

## 1. Approved Algorithms

| Use Case | Algorithm | Standard |
|----------|-----------|----------|
| Key Exchange | ML-KEM-1024 + X25519 (Hybrid) | FIPS 203 + BSI TR-02102-1 |
| Digital Signature | ML-DSA-65 | FIPS 204 |
| Symmetric Encryption | AES-256-GCM | FIPS 197 |
| Hashing | SHA-256/SHA-512 | FIPS 180-4 |
| Key Derivation | HKDF-SHA512 | RFC 5869 |
| MFA | ML-DSA-65 (WebAuthn replacement) | FIPS 204 |

## 2. Prohibited Algorithms
- RSA < 3072 bits
- ECDSA (vulnerable to quantum)
- MD5, SHA-1
- DES, 3DES
- RC4

## 3. Key Management
- Private keys never written to disk
- Key rotation: ML-DSA-65 < 1ms overhead
- Compromise response: immediate revocation + JWT blacklist
- Audit trail for all key operations

## 4. Key Rotation Without E2EE Message Loss
Key rotation in BlackMess follows a forward-secrecy model:
1. New ML-DSA-65 + ML-KEM-1024 keypair generated for new sessions
2. Old keypairs retained in encrypted vault (ML-KEM-1024) for decryption of historical messages
3. New messages encrypted with new session keys only
4. Key rotation overhead: < 5ms (automated via key_rotation_protocol.py)
5. Users notified to re-establish E2EE sessions post-rotation
6. JWT tokens invalidated immediately upon rotation
7. Rotation schedule: Triggered by compromise report or every 90 days
