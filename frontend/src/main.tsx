import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const savedTheme = localStorage.getItem('bm_theme') || 'dark'
const root = document.documentElement
if (savedTheme === 'light') root.classList.add('light')

window.onerror = function(msg, src, line, col, err) {
  document.body.innerHTML = `<div style="color:white;background:#1a1a1a;padding:20px;font-family:monospace;min-height:100vh">
    <h2 style="color:red">ERROR: ${msg}</h2>
    <p>${err?.stack||''}</p>

  </div>`
  return true
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
)
