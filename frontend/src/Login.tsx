import { useState } from 'react'

const API_URL = 'https://black-message-production.up.railway.app/api/v1'

export default function Login() {
  const [tab, setTab] = useState<'masuk' | 'daftar'>('masuk')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [nama, setNama] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleMasuk = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || JSON.stringify(data))
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      window.location.href = '/chat'
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDaftar = async () => {
    setError('')
    if (password !== konfirmasi) { setError('Password tidak sama'); return }
    setLoading(true)
    try {
      // Auto-generate username dari email
      const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_') + '_' + Math.random().toString(36).slice(2,6)
      const res = await fetch(`${API_URL}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          first_name: nama,
          password,
          password_confirm: konfirmasi,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || JSON.stringify(data))
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      window.location.href = '/chat'
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGithub = () => {
    window.location.href = `${API_URL.replace('/api/v1','')}/oauth/login/github/`
  }

  const handleGoogle = () => {
    window.location.href = `${API_URL.replace('/api/v1','')}/oauth/login/google-oauth2/`
  }

  const btn: React.CSSProperties = {
    width: '100%', padding: '12px', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, fontFamily: 'inherit', border: 'none',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', fontSize: 14, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, Arial, sans-serif', padding: '20px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 56, height: 56, background: '#1a1a2e',
          borderRadius: 16, margin: '0 auto 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="6" r="3.5" fill="#c4b5fd"/>
            <circle cx="24" cy="42" r="3.5" fill="#c4b5fd"/>
            <circle cx="6" cy="24" r="3.5" fill="#c4b5fd"/>
            <circle cx="42" cy="24" r="3.5" fill="#c4b5fd"/>
            <circle cx="24" cy="24" r="5" fill="#7c3aed" opacity="0.8"/>
          </svg>
        </div>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>BlackMess</div>
        <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Platform komunikasi enterprise</div>
      </div>

      {/* Card */}
      <div style={{
        background: '#111118', borderRadius: 20,
        border: '1px solid #1e1e2e', padding: '28px 24px',
        width: '100%', maxWidth: 400,
      }}>
        {/* Tab */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          background: '#0a0a0f', borderRadius: 10,
          padding: 4, marginBottom: 24,
        }}>
          {(['masuk', 'daftar'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }} style={{
              ...btn, padding: '10px',
              background: tab === t ? '#7c3aed' : 'transparent',
              color: tab === t ? '#fff' : '#6b7280',
              borderRadius: 8,
            }}>
              {t === 'masuk' ? 'Masuk' : 'Daftar'}
            </button>
          ))}
        </div>

        {/* OAuth buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {/* GitHub */}
          <button onClick={handleGithub} style={{
            ...btn,
            background: '#24292e', color: '#fff',
            border: '1px solid #444',
          }}
            onMouseOver={e => (e.currentTarget.style.background = '#2f363d')}
            onMouseOut={e => (e.currentTarget.style.background = '#24292e')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </button>

          {/* Google */}
          <button onClick={handleGoogle} style={{
            ...btn,
            background: '#fff', color: '#3c4043',
            border: '1px solid #dadce0',
          }}
            onMouseOver={e => (e.currentTarget.style.background = '#f8f9fa')}
            onMouseOut={e => (e.currentTarget.style.background = '#fff')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }}/>
          <span style={{ color: '#4b5563', fontSize: 12 }}>atau dengan email</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }}/>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            color: '#f87171', fontSize: 13,
          }}>{error}</div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tab === 'daftar' && (
            <input
              style={inputStyle} placeholder="Nama lengkap"
              value={nama} onChange={e => setNama(e.target.value)}
            />
          )}

          <input
            style={inputStyle} placeholder="Email" type="email"
            value={email} onChange={e => setEmail(e.target.value)}
          />

          <input
            style={inputStyle} placeholder="Password" type="password"
            value={password} onChange={e => setPassword(e.target.value)}
          />

          {tab === 'daftar' && (
            <input
              style={inputStyle} placeholder="Konfirmasi Password" type="password"
              value={konfirmasi} onChange={e => setKonfirmasi(e.target.value)}
            />
          )}

          <button
            onClick={tab === 'masuk' ? handleMasuk : handleDaftar}
            disabled={loading}
            style={{
              ...btn,
              background: loading ? '#4c1d95' : 'linear-gradient(135deg,#5b21b6,#7c3aed)',
              color: '#fff', marginTop: 4,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Memproses...' : tab === 'masuk' ? 'Masuk' : 'Daftar'}
          </button>
        </div>
      </div>
    </div>
  )
}
