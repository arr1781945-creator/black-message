import { API_URL, getToken } from './api'

// ─── TOTP ────────────────────────────────────────────────────────────────────
export const generateTOTP = async () => {
  const r = await fetch(`${API_URL}/auth/totp/generate/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
  })
  return r.json()
}

export const verifyTOTPSetup = async (code: string, device_name = 'Google Authenticator') => {
  const r = await fetch(`${API_URL}/auth/totp/verify-setup/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ code, device_name }),
  })
  return { ok: r.ok, data: await r.json() }
}

export const verifyOTPCode = async (email: string, code: string) => {
  const r = await fetch(`${API_URL}/auth/otp/verify/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  return { ok: r.ok, data: await r.json() }
}

// ─── WebAuthn / FIDO2 ────────────────────────────────────────────────────────
export const beginWebAuthnRegister = async () => {
  const r = await fetch(`${API_URL}/auth/webauthn/register/begin/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
  })
  return r.json()
}

export const completeWebAuthnRegister = async (credential: any, device_name: string) => {
  const r = await fetch(`${API_URL}/auth/webauthn/register/complete/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ ...credential, device_name }),
  })
  return { ok: r.ok, data: await r.json() }
}

export const beginWebAuthnAuth = async (username: string) => {
  const r = await fetch(`${API_URL}/auth/webauthn/auth/begin/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
  return r.json()
}

export const completeWebAuthnAuth = async (assertion: any) => {
  const r = await fetch(`${API_URL}/auth/webauthn/auth/complete/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assertion),
  })
  return { ok: r.ok, data: await r.json() }
}

// ─── Register biometric (Face ID / Fingerprint) ───────────────────────────────
export const registerBiometric = async (device_name: string): Promise<{ok: boolean, message: string}> => {
  try {
    // 1. Minta challenge dari backend
    const options = await beginWebAuthnRegister()
    if (options.detail) return { ok: false, message: options.detail }

    // 2. Convert challenge ke ArrayBuffer
    const challenge = Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0))
    const userId = Uint8Array.from(atob(options.user?.id || ''), c => c.charCodeAt(0))

    // 3. Buat credential via browser WebAuthn API
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'BlackMess', id: window.location.hostname },
        user: {
          id: userId,
          name: options.user?.name || 'user',
          displayName: options.user?.displayName || 'User',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Face ID / Fingerprint
          userVerification: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      }
    }) as PublicKeyCredential

    if (!credential) return { ok: false, message: 'Registrasi dibatalkan.' }

    // 4. Kirim ke backend
    const response = credential.response as AuthenticatorAttestationResponse
    const credentialData = {
      id: credential.id,
      rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      type: credential.type,
      response: {
        attestationObject: btoa(String.fromCharCode(...new Uint8Array(response.attestationObject))),
        clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON))),
      },
      device_name,
    }

    const result = await completeWebAuthnRegister(credentialData, device_name)
    return { ok: result.ok, message: result.data.detail || 'Berhasil!' }

  } catch (e: any) {
    if (e.name === 'NotAllowedError') return { ok: false, message: 'Dibatalkan atau tidak diizinkan.' }
    if (e.name === 'NotSupportedError') return { ok: false, message: 'Perangkat tidak mendukung biometrik.' }
    return { ok: false, message: `Error: ${e.message}` }
  }
}

// ─── Verify biometric saat login ─────────────────────────────────────────────
export const verifyBiometric = async (username: string): Promise<{ok: boolean, data: any}> => {
  try {
    // 1. Minta challenge
    const options = await beginWebAuthnAuth(username)
    if (options.detail) return { ok: false, data: options }

    const challenge = Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0))
    const allowCredentials = (options.allowCredentials || []).map((c: any) => ({
      id: Uint8Array.from(atob(c.id), x => x.charCodeAt(0)),
      type: 'public-key',
    }))

    // 2. Verifikasi via browser
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials,
        userVerification: 'preferred',
        timeout: 60000,
      }
    }) as PublicKeyCredential

    if (!assertion) return { ok: false, data: { detail: 'Dibatalkan.' } }

    // 3. Kirim ke backend
    const response = assertion.response as AuthenticatorAssertionResponse
    const assertionData = {
      id: assertion.id,
      rawId: btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))),
      type: assertion.type,
      response: {
        authenticatorData: btoa(String.fromCharCode(...new Uint8Array(response.authenticatorData))),
        clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON))),
        signature: btoa(String.fromCharCode(...new Uint8Array(response.signature))),
        userHandle: response.userHandle
          ? btoa(String.fromCharCode(...new Uint8Array(response.userHandle)))
          : null,
      },
    }

    return await completeWebAuthnAuth(assertionData)

  } catch (e: any) {
    if (e.name === 'NotAllowedError') return { ok: false, data: { detail: 'Dibatalkan.' } }
    return { ok: false, data: { detail: e.message } }
  }
}
