/**
 * e2ee.ts — AES-256-GCM E2EE untuk BlackMess
 * Menggunakan Web Crypto API (built-in browser, no library needed)
 */

export async function generateSessionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(raw)))
}

export async function encryptMessage(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext_b64: string; nonce_b64: string; auth_tag_b64: string }> {
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    key,
    encoded
  )

  const encBytes = new Uint8Array(encrypted)
  const ciphertext = encBytes.slice(0, -16)
  const authTag = encBytes.slice(-16)

  return {
    ciphertext_b64: btoa(String.fromCharCode(...ciphertext)),
    nonce_b64: btoa(String.fromCharCode(...nonce)),
    auth_tag_b64: btoa(String.fromCharCode(...authTag)),
  }
}

export async function decryptMessage(
  ciphertext_b64: string,
  nonce_b64: string,
  auth_tag_b64: string,
  key: CryptoKey
): Promise<string> {
  try {
    const ciphertext = Uint8Array.from(atob(ciphertext_b64), c => c.charCodeAt(0))
    const nonce = Uint8Array.from(atob(nonce_b64), c => c.charCodeAt(0))
    const authTag = Uint8Array.from(atob(auth_tag_b64), c => c.charCodeAt(0))

    const combined = new Uint8Array(ciphertext.length + authTag.length)
    combined.set(ciphertext)
    combined.set(authTag, ciphertext.length)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: 128 },
      key,
      combined
    )

    return new TextDecoder().decode(decrypted)
  } catch {
    return '[ENCRYPTED — KEY MISMATCH]'
  }
}

const sessionKeys = new Map<string, CryptoKey>()

export async function getOrCreateSessionKey(channelId: string): Promise<CryptoKey> {
  if (!sessionKeys.has(channelId)) {
    const key = await generateSessionKey()
    sessionKeys.set(channelId, key)
  }
  return sessionKeys.get(channelId)!
}
