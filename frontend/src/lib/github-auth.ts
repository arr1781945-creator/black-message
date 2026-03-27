const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID

export function loginWithGitHub() {
  const redirectUri = encodeURIComponent(`${window.location.origin}/api/github-callback`)
  const scope = encodeURIComponent('user:email')
  window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}`
}
