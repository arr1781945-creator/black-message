export default async function handler(req, res) {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'No code' })

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.VITE_GITHUB_CLIENT_ID,
        client_secret: process.env.VITE_GITHUB_CLIENT_SECRET,
        code
      })
    })
    const { access_token } = await tokenRes.json()

    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    })
    const userData = await userRes.json()

    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    })
    const emails = await emailRes.json()
    const email = emails.find((e) => e.primary)?.email || userData.email || `${userData.login}@github.com`

    res.redirect(`/?name=${encodeURIComponent(userData.name||userData.login)}&email=${encodeURIComponent(email)}&avatar=${userData.login[0].toUpperCase()}&provider=github`)
  } catch(e) {
    res.redirect('/?error=github_failed')
  }
}
