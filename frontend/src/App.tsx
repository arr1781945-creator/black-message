import { useState } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [token, setToken] = useState('bypass-token')
  const [page, setPage] = useState<'login'|'register'>('login')

  if (token) return <Dashboard token={token} onLogout={() => { sessionStorage.clear(); setToken(null) }} />
  if (page === 'register') return <Register onBack={() => setPage('login')} onSuccess={() => setPage('login')} />
  return <Login onLogin={(t) => { sessionStorage.setItem('access_token', t); setToken(t) }} onRegister={() => setPage('register')} />
}
