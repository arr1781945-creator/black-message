const BACKEND = 'https://black-message-production.up.railway.app'

export function loginWithGitHub() {
  window.location.href = `${BACKEND}/oauth/login/github/`
}

export function handleGitHubCallback(onSuccess: (user: any, token: string) => void) {
  const params = new URLSearchParams(window.location.search)
  const access = params.get('access')
  const refresh = params.get('refresh')

  if (access) {
    localStorage.setItem('bm_token', access)
    localStorage.setItem('bm_refresh', refresh || '')

    // Ambil workspace_id
    fetch(`${BACKEND}/api/v1/auth/me/profile/`, {
      headers: { 'Authorization': `Bearer ${access}` }
    })
    .then(r => r.json())
    .then(data => {
      const user = {
        name: data.username || 'User',
        email: data.email || '',
        avatar: (data.username || 'U')[0].toUpperCase(),
        username: data.username || ''
      }
      onSuccess(user, access)
      // Bersihkan URL
      window.history.replaceState({}, '', '/')
    })
    .catch(() => onSuccess({ name: 'User', email: '', avatar: 'U', username: '' }, access))
  }
}
