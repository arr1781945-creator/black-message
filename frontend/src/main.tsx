import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const savedTheme = localStorage.getItem('bm_theme') || 'dark'
const root = document.documentElement
if (savedTheme === 'light') root.classList.add('light')

window.onerror = function(msg, src, line, col, err) {
  document.body.innerHTML = `<div style="color:white;background:#1a1a1a;padding:20px;font-family:monospace;">
    <h2 style="color:red">ERROR: ${msg}</h2>
    <p>Line: ${line}</p>
    <p>${err?.stack || ''}</p>
    <button onclick="localStorage.clear();location.reload()" style="margin-top:16px;padding:10px 20px;background:#4A154B;color:white;border:none;border-radius:8px;cursor:pointer">Reset & Reload</button>
  </div>`
  return true
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
