const API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8002';

// ─── Auth ─────────────────────────────────────────────────────────────────

export async function djangoLogin(username: string, password: string) {
  const res = await fetch(`${API_URL}/api/v1/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function djangoRefresh(refresh: string) {
  const res = await fetch(`${API_URL}/api/v1/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

// ─── API Fetch ─────────────────────────────────────────────────────────────

export async function djangoFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    // Try refresh
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      const data = await djangoRefresh(refresh);
      localStorage.setItem('access_token', data.access);
      return djangoFetch(path, options);
    }
    window.location.href = '/login';
    return;
  }
  if (!res.ok) throw await res.json();
  return res.json();
}

// ─── Workspaces ────────────────────────────────────────────────────────────

export const getWorkspaces = () => djangoFetch('/api/v1/workspaces/');
export const getChannels = (slug: string) => djangoFetch(`/api/v1/workspaces/${slug}/channels/`);
export const getMe = () => djangoFetch('/api/v1/auth/me/profile/');

// ─── Vault ─────────────────────────────────────────────────────────────────

export const getKYC = () => djangoFetch('/api/v1/vault/kyc/');
export const getBlobs = () => djangoFetch('/api/v1/vault/blobs/');

// ─── Compliance ────────────────────────────────────────────────────────────

export const getAuditLogs = () => djangoFetch('/api/v1/compliance/audit-logs/');
export const getSecurityEvents = () => djangoFetch('/api/v1/compliance/security-events/');
