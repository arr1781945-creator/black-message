/**
 * frontend/utils/anti_screenshot.js
 * Anti-screenshot, anti-print, clipboard protection.
 * Loaded via <script> tag (not module) for early execution.
 */

(function () {
  'use strict';

  // ─── 1. Disable right-click context menu ───────────────────────
  document.addEventListener('contextmenu', e => {
    if (e.target.closest('#app')) e.preventDefault();
  });

  // ─── 2. Disable common screenshot keyboard shortcuts ───────────
  document.addEventListener('keydown', e => {
    const forbidden = [
      // Print Screen
      e.key === 'PrintScreen',
      // Ctrl/Cmd + P (print)
      (e.ctrlKey || e.metaKey) && e.key === 'p',
      // Ctrl/Cmd + Shift + S (save as)
      (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's',
      // Ctrl/Cmd + S
      (e.ctrlKey || e.metaKey) && e.key === 's',
      // F12 (DevTools) — only in production-like context
      e.key === 'F12',
    ];
    if (forbidden.some(Boolean)) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityToast('Screenshot and printing disabled for confidential content.');
      logSecurityAttempt('SCREENSHOT_ATTEMPT');
    }
  });

  // ─── 3. Clipboard write protection ─────────────────────────────
  document.addEventListener('copy', e => {
    if (e.target.closest('.no-copy')) {
      e.preventDefault();
      showSecurityToast('Copying is disabled for this content.');
      logSecurityAttempt('COPY_ATTEMPT');
    }
  });

  // ─── 4. Visibility change detection (tab switch / screenshare) ─
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Blur sensitive content when tab loses focus
      document.querySelectorAll('.sensitive-blur').forEach(el => {
        el.style.filter = 'blur(8px)';
        el.style.transition = 'filter 100ms ease';
      });
    } else {
      document.querySelectorAll('.sensitive-blur').forEach(el => {
        el.style.filter = 'none';
      });
    }
  });

  // ─── 5. DevTools detection (heuristic) ─────────────────────────
  let devtoolsOpen = false;
  const devToolsDetect = () => {
    const threshold = 160;
    if (
      window.outerHeight - window.innerHeight > threshold ||
      window.outerWidth - window.innerWidth > threshold
    ) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        logSecurityAttempt('DEVTOOLS_OPEN');
        // In production: could clear sensitive data from memory
      }
    } else {
      devtoolsOpen = false;
    }
  };
  setInterval(devToolsDetect, 3000);

  // ─── 6. CSS-based screenshot protection layer ──────────────────
  // Inserts a transparent overlay that appears in screenshots
  // via CSS mix-blend-mode tricks (effectiveness varies by OS/browser)
  const shield = document.getElementById('screenshot-shield');
  if (shield) {
    shield.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      pointer-events: none;
      mix-blend-mode: difference;
      background: transparent;
    `;
    shield.classList.remove('hidden');
  }

  // ─── 7. Watermark overlay for screenshots ──────────────────────
  function injectWatermark() {
    const user = window.STATE?.user?.username || 'CONFIDENTIAL';
    const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const wm = document.createElement('div');
    wm.id = 'watermark-overlay';
    wm.setAttribute('aria-hidden', 'true');
    wm.style.cssText = `
      position: fixed; inset: 0; z-index: 9998; pointer-events: none;
      display: flex; align-items: center; justify-content: center;
    `;
    wm.innerHTML = `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="wm" x="0" y="0" width="300" height="200" patternUnits="userSpaceOnUse"
                 patternTransform="rotate(-30)">
          <text x="10" y="80" font-family="monospace" font-size="11" fill="rgba(255,255,255,0.025)"
                font-weight="bold">${user} · ${ts} · CONFIDENTIAL</text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wm)"/>
    </svg>`;
    document.body.appendChild(wm);
  }

  // Inject watermark after STATE is populated
  window.addEventListener('load', () => setTimeout(injectWatermark, 2000));

  // ─── Helpers ───────────────────────────────────────────────────
  function showSecurityToast(msg) {
    let toast = document.getElementById('security-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'security-toast';
      toast.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
        background: rgba(220,38,38,0.9); backdrop-filter: blur(8px);
        color: white; padding: 10px 20px; border-radius: 8px;
        font-size: 13px; font-weight: 500; z-index: 10000;
        border: 1px solid rgba(255,100,100,0.3);
        transition: opacity 200ms ease;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = '🔒 ' + msg;
    toast.style.opacity = '1';
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  }

  function logSecurityAttempt(type) {
    const token = sessionStorage.getItem('sb_access_token');
    if (!token) return;
    fetch('/api/v1/compliance/security-events/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ event_type: type, detail: { ua: navigator.userAgent } }),
    }).catch(() => {}); // Fire-and-forget
  }
})();
