// ─── API & WebSocket config ───────────────────────────────────────────────────
export const API_URL = 'https://black-message-production.up.railway.app/api/v1'
export const WS_URL = 'wss://black-message-production.up.railway.app/ws/chat'

export const getToken = () => localStorage.getItem('access_token') || ''
export const getRefresh = () => localStorage.getItem('refresh_token') || ''

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

export const clearTokens = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login = async (username: string, password: string) => {
  const r = await fetch(`${API_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await r.json()
  if (r.ok) setTokens(data.access, data.refresh)
  return { ok: r.ok, data }
}

export const register = async (payload: Record<string, string>) => {
  const r = await fetch(`${API_URL}/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await r.json()
  if (r.ok) setTokens(data.access, data.refresh)
  return { ok: r.ok, data }
}

export const logout = async () => {
  await fetch(`${API_URL}/auth/logout/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ refresh: getRefresh() }),
  })
  clearTokens()
}

// ─── API helper ───────────────────────────────────────────────────────────────
export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const r = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...options.headers,
    },
  })
  const data = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, data }
}

// ─── Messages ─────────────────────────────────────────────────────────────────
export const fetchMessages = async (channelId: string) => {
  const { ok, data } = await apiFetch(`/msg/${channelId}/messages/`)
  return ok ? data : []
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export const fetchSettings = () => apiFetch('/auth/settings/')
export const updateSettings = (payload: Record<string, any>) =>
  apiFetch('/auth/settings/', { method: 'PATCH', body: JSON.stringify(payload) })
export const fetchSecuritySettings = () => apiFetch('/auth/settings/security/')
export const revokeSession = (session_id?: string, revoke_all = false) =>
  apiFetch('/auth/settings/security/revoke/', {
    method: 'POST',
    body: JSON.stringify(session_id ? { session_id } : { revoke_all: true }),
  })

// ─── Workspace ────────────────────────────────────────────────────────────────
export const createWorkspace = (name: string, slug: string) =>
  apiFetch('/workspaces/create/', {
    method: 'POST',
    body: JSON.stringify({ name, slug }),
  })
export const checkSlug = (slug: string) =>
  apiFetch(`/workspaces/create/?slug=${slug}`)

// ─── OTP ──────────────────────────────────────────────────────────────────────
export const sendOTP = (email: string, name?: string) =>
  apiFetch('/auth/otp/send/', {
    method: 'POST',
    body: JSON.stringify({ email, name }),
  })
export const verifyOTP = (email: string, code: string) =>
  apiFetch('/auth/otp/verify/', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })

// ─── Invite ───────────────────────────────────────────────────────────────────
export const sendInvite = (workspace_id: string, to_email: string, role = 'member') =>
  apiFetch('/auth/invite/send/', {
    method: 'POST',
    body: JSON.stringify({ workspace_id, to_email, role }),
  })

// ─── WebSocket ────────────────────────────────────────────────────────────────
export const createWebSocket = (channelName: string): WebSocket => {
  const token = getToken()
  return new WebSocket(`${WS_URL}/${channelName}/?token=${token}`)
}
