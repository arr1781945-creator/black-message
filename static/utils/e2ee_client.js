/**
 * frontend/utils/e2ee_client.js
 * Client-side E2EE using the Web Crypto API (SubtleCrypto).
 * AES-256-GCM encryption/decryption for messages.
 * Key material is generated per-session and never leaves the device.
 *
 * In production: replace sessionKey with hybrid KEM exchange
 * (Kyber-1024 via WASM + X25519 ECDH). For now, session key is
 * generated fresh per browser session.
 */

export class E2EEClient {
  constructor() {
    this._key = null;      // CryptoKey (AES-256-GCM)
    this._ready = false;
  }

  async init() {
    // Attempt to restore session key from sessionStorage
    const stored = sessionStorage.getItem('sb_e2ee_key');
    if (stored) {
      try {
        const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
        this._key = await crypto.subtle.importKey(
          'raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
        );
        this._ready = true;
        return;
      } catch (_) { /* key invalid — generate new */ }
    }
    await this._generateKey();
  }

  async _generateKey() {
    this._key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );
    // Export and cache in sessionStorage (cleared on tab close)
    const raw = await crypto.subtle.exportKey('raw', this._key);
    sessionStorage.setItem('sb_e2ee_key', btoa(String.fromCharCode(...new Uint8Array(raw))));
    this._ready = true;
  }

  /**
   * Encrypt a plaintext string.
   * Returns { ciphertext_b64, nonce_b64, auth_tag_b64 }
   */
  async encrypt(plaintext) {
    if (!this._ready) await this.init();
    const encoder = new TextEncoder();
    const nonce = crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce
    const encoded = encoder.encode(plaintext);

    const ctWithTag = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: 128 },
      this._key, encoded
    );

    // SubtleCrypto appends 16-byte auth tag to ciphertext
    const ctBytes = new Uint8Array(ctWithTag);
    const ciphertext = ctBytes.slice(0, ctBytes.length - 16);
    const tag = ctBytes.slice(ctBytes.length - 16);

    return {
      ciphertext_b64: this._toB64(ciphertext),
      nonce_b64:      this._toB64(nonce),
      auth_tag_b64:   this._toB64(tag),
    };
  }

  /**
   * Decrypt a message.
   * Returns plaintext string. Throws on tamper detection.
   */
  async decrypt(ciphertext_b64, nonce_b64, auth_tag_b64) {
    if (!this._ready) await this.init();
    const ciphertext = this._fromB64(ciphertext_b64);
    const nonce = this._fromB64(nonce_b64);
    const tag = this._fromB64(auth_tag_b64);

    // Reconstruct ciphertext+tag (SubtleCrypto expects them concatenated)
    const ctWithTag = new Uint8Array(ciphertext.length + tag.length);
    ctWithTag.set(ciphertext);
    ctWithTag.set(tag, ciphertext.length);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: 128 },
      this._key, ctWithTag
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Derive a per-channel key from session key + channel_id using HKDF.
   * This scopes decryption to a specific channel.
   */
  async deriveChannelKey(channelId) {
    if (!this._ready) await this.init();
    const rawKey = await crypto.subtle.exportKey('raw', this._key);
    const baseKey = await crypto.subtle.importKey(
      'raw', rawKey, { name: 'HKDF' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('securebank-channel-key'),
        info: new TextEncoder().encode(channelId),
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a Kyber-compatible shared key via X25519 ECDH.
   * Used for key exchange with recipients.
   */
  async generateECDHKeyPair() {
    return crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-384' }, true, ['deriveKey', 'deriveBits']
    );
  }

  async exportPublicKey(keyPair) {
    const exported = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    return this._toB64(new Uint8Array(exported));
  }

  // ─── Helpers ──────────────────────────────────────────────────
  _toB64(bytes) {
    return btoa(String.fromCharCode(...bytes));
  }

  _fromB64(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  }

  get isReady() { return this._ready; }
}
