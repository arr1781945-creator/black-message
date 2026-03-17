import { useState } from 'react'

export default function Register({ onBack, onSuccess }: { onBack: () => void, onSuccess: () => void }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', employee_id: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!form.username || !form.email || !form.password) { setError('Semua field wajib diisi!'); return }
    if (form.password !== form.confirm) { setError('Password tidak cocok!'); return }
    if (form.password.length < 8) { setError('Password minimal 8 karakter!'); return }

    setLoading(true); setError('')
    try {
      const res = await fetch('http://localhost:8002/api/v1/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          employee_id: form.employee_id || `EMP-${Date.now()}`,
        })
      })
      const data = await res.json()
      if (res.ok) { alert('Akun berhasil dibuat! Silakan login.'); onSuccess() }
      else setError(data.detail || JSON.stringify(data))
    } catch { setError('Server tidak bisa dihubungi') }
    setLoading(false)
  }

  const inputStyle: any = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit'
  }

  const labelStyle: any = {
    display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 600,
    letterSpacing: 1, textTransform: 'none', marginBottom: 6
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif', padding: 16
    }}>
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }}/>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(255,255,255,0.15)' }}>
            <svg width="26" height="26" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
            </svg>
          </div>
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Buat Akun</h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Bergabung dengan BlackMess</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Username</label>
              <input type="text" placeholder="username-kamu" value={form.username}
                onChange={e => setForm({...form, username: e.target.value})}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor='#6366f1'}
                onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" placeholder="email@perusahaan.com" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor='#6366f1'}
                onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
            </div>

            <div>
              <label style={labelStyle}>Employee ID (opsional)</label>
              <input type="text" placeholder="EMP-001" value={form.employee_id}
                onChange={e => setForm({...form, employee_id: e.target.value})}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor='#6366f1'}
                onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" placeholder="Min. 8 karakter" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor='#6366f1'}
                onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
            </div>

            <div>
              <label style={labelStyle}>Konfirmasi Password</label>
              <input type="password" placeholder="Ulangi password" value={form.confirm}
                onChange={e => setForm({...form, confirm: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor='#6366f1'}
                onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
            </div>

            <button onClick={handleRegister} disabled={loading} style={{
              width: '100%', padding: 13, borderRadius: 10, border: 'none',
              background: loading ? 'rgba(0,0,0,0.5)' : '#000000',
              color: 'white', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4
            }}>
              {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
            </button>

            <p style={{ textAlign: 'center', color: '#475569', fontSize: 13, margin: 0 }}>
              Sudah punya akun?{' '}
              <span onClick={onBack} style={{ color: '#818cf8', cursor: 'pointer', fontWeight: 600 }}>
                Masuk di sini
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
