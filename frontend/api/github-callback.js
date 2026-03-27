export default async function handler(req, res) {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'No code' })

  try {
    // Tukar code jadi access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.VITE_GITHUB_CLIENT_ID,
        client_secret: process.env.VITE_GITHUB_CLIENT_SECRET,
        code
      })
    })
    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    // Ambil user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    const userData = await userRes.json()

    // Ambil email
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    const emails = await emailRes.json()
    const primaryEmail = emails.find((e: any) => e.primary)?.email || userData.email

    // Redirect ke frontend dengan user data
    const params = new URLSearchParams({
      name: userData.name || userData.login,
      email: primaryEmail || `${userData.login}@github.com`,
      avatar: userData.login[0].toUpperCase(),
      login: userData.login
    })

    res.redirect(`/?${params.toString()}`)
  } catch(e) {
    res.redirect('/?error=github_failed')
  }
}
