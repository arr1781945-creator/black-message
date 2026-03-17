import { Sidebar } from './components/Sidebar.js';
import { ChatArea } from './components/ChatArea.js';
import { ThreadPanel } from './components/ThreadPanel.js';
import { VaultModal } from './components/VaultModal.js';
import { WebSocketManager } from './utils/websocket_manager.js';
import { E2EEClient } from './utils/e2ee_client.js';

const STATE = {
  user: null, accessToken: null, currentWorkspace: null,
  currentChannel: null, activeThread: null, channels: [],
  messages: {}, presences: {}, typingUsers: {},
  wsManager: null, e2ee: null,
};

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${STATE.accessToken}`, ...(options.headers||{}) },
  });
  if (res.status === 401) { showLogin(); return; }
  if (!res.ok) throw await res.json();
  return res.json();
}

async function init() {
  const token = sessionStorage.getItem('sb_access_token');
  if (!token) { showLogin(); return; }
  STATE.accessToken = token;
  STATE.e2ee = new E2EEClient();
  await STATE.e2ee.init();
  try {
    STATE.user = await apiFetch('/api/v1/auth/me/profile/');
    const ws = await apiFetch('/api/v1/workspaces/');
    if (ws.results?.length) {
      STATE.currentWorkspace = ws.results[0];
      const ch = await apiFetch(`/api/v1/workspaces/${STATE.currentWorkspace.slug}/channels/`);
      STATE.channels = ch.results || [];
      if (STATE.channels.length) STATE.currentChannel = STATE.channels[0];
    }
    renderApp();
  } catch(e) { showLogin(); }
  hideBoot();
}

function renderApp() {
  const app = document.getElementById('app');
  app.style.cssText = 'display:flex;height:100vh;background:#1a1d21;font-family:Slack-Lato,appleLogo,sans-serif;';
  app.innerHTML = `
  <!-- Workspace Rail -->
  <div style="width:68px;background:#1a1d21;border-right:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;align-items:center;padding:8px 0;gap:8px;flex-shrink:0;">
    <div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#611f69,#1264a3);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.3);">
      ${(STATE.currentWorkspace?.name||'BM').slice(0,2).toUpperCase()}
    </div>
    <div style="width:28px;height:1px;background:rgba(255,255,255,0.1);"></div>
    <div style="flex:1;"></div>
    <button onclick="window._openVault()" title="Secure Vault" style="width:36px;height:36px;border-radius:8px;background:rgba(235,176,0,0.15);border:1px solid rgba(235,176,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#ebb400;">
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
    </button>
    <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#611f69,#1264a3);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;border:2px solid #ebb400;cursor:pointer;">
      ${(STATE.user?.username||'?').slice(0,2).toUpperCase()}
    </div>
  </div>

  <!-- Sidebar -->
  <div id="sidebar" style="width:260px;background:#1a1d21;border-right:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden;"></div>

  <!-- Main -->
  <div style="display:flex;flex:1;min-width:0;overflow:hidden;">
    <div id="chat" style="display:flex;flex-direction:column;flex:1;min-width:0;background:#1a1d21;"></div>
    <div id="thread" style="display:none;width:360px;flex-shrink:0;border-left:1px solid rgba(255,255,255,0.1);background:#1a1d21;"></div>
  </div>
  <div id="vault"></div>`;

  Sidebar.mount('#sidebar', {
    state: STATE,
    onChannelSelect: selectChannel,
    onVaultOpen: () => VaultModal.mount('#vault', { user: STATE.user, accessToken: STATE.accessToken, onClose: () => document.getElementById('vault').innerHTML = '' })
  });

  if (STATE.currentChannel) {
    ChatArea.mount('#chat', { state: STATE, onSend: sendMessage, onThreadOpen: openThread, onReact: addReaction });
    connectWS(STATE.currentChannel.id);
  }

  window._openVault = () => VaultModal.mount('#vault', { user: STATE.user, accessToken: STATE.accessToken, onClose: () => document.getElementById('vault').innerHTML = '' });
}

function connectWS(channelId) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  STATE.wsManager = new WebSocketManager(`${proto}://${location.host}/ws/channel/${channelId}/`, STATE.accessToken, {
    onMessage: async (data) => {
      let plaintext = 'Encrypted';
      try { plaintext = await STATE.e2ee.decrypt(data.ciphertext_b64, data.nonce_b64, data.auth_tag_b64); } catch(_) {}
      const msg = { ...data, plaintext };
      if (!STATE.messages[channelId]) STATE.messages[channelId] = [];
      STATE.messages[channelId].push(msg);
      ChatArea.appendMessage(msg);
    },
    onTyping: (d) => ChatArea.updateTypingIndicator(d.typing ? [d.username] : []),
    onPresence: (d) => { STATE.presences[d.user_id] = d.status; },
    onReaction: (d) => ChatArea.updateReaction(d.message_id, d.emoji_code, d.username, d.action),
  });
  STATE.wsManager.connect();
}

async function selectChannel(channel) {
  STATE.currentChannel = channel;
  STATE.activeThread = null;
  STATE.wsManager?.disconnect();
  document.getElementById('thread').style.display = 'none';
  ChatArea.mount('#chat', { state: STATE, onSend: sendMessage, onThreadOpen: openThread, onReact: addReaction });
  connectWS(channel.id);
  document.querySelectorAll('.ch-item').forEach(e => { e.style.background='transparent'; e.style.color='#d1d2d3'; });
  const active = document.querySelector(`[data-ch="${channel.id}"]`);
  if (active) { active.style.background='rgba(255,255,255,0.1)'; active.style.color='white'; }
}

async function sendMessage({ plaintext, ttlSeconds }) {
  if (!plaintext.trim()) return;
  let ct = { ciphertext_b64: btoa(plaintext), nonce_b64: '', auth_tag_b64: '' };
  try { ct = await STATE.e2ee.encrypt(plaintext); } catch(_) {}
  STATE.wsManager?.send({ type: 'send_message', ...ct, ...(ttlSeconds ? { ttl_seconds: ttlSeconds } : {}) });
}

function openThread(msg) {
  STATE.activeThread = msg;
  const t = document.getElementById('thread');
  t.style.display = 'block';
  ThreadPanel.mount('#thread', { message: msg, state: STATE, onSendReply: (text) => sendMessage({ plaintext: text }), onClose: () => { STATE.activeThread = null; t.style.display = 'none'; } });
}

function addReaction(msgId, emoji) { STATE.wsManager?.send({ type: 'add_reaction', message_id: msgId, emoji_code: emoji }); }

function showLogin() {
  hideBoot();
  document.getElementById('app').innerHTML = `
  <div style="min-height:100vh;background:#1a1d21;display:flex;align-items:center;justify-content:center;font-family:Slack-Lato,sans-serif;">
    <div style="width:100%;max-width:420px;margin:0 16px;">

      <!-- Logo -->
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:60px;height:60px;border-radius:12px;background:linear-gradient(135deg,#611f69 0%,#1264a3 100%);margin-bottom:16px;box-shadow:0 4px 16px rgba(97,31,105,0.4);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            <path d="M8 10h8M8 14h5"/>
          </svg>
        </div>
        <h1 style="color:white;font-size:24px;font-weight:700;margin:0 0 6px;letter-spacing:-0.5px;">BlackMess</h1>
        <p style="color:#868686;font-size:14px;margin:0;">Sign in to your workspace</p>
      </div>

      <!-- Card -->
      <div style="background:#222529;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:32px;box-shadow:0 8px 32px rgba(0,0,0,0.4);">

        <div id="login-err" style="display:none;background:rgba(224,30,90,0.1);border:1px solid rgba(224,30,90,0.3);border-radius:8px;padding:12px 16px;color:#e01e5a;font-size:13px;margin-bottom:20px;"></div>

        <div style="display:flex;flex-direction:column;gap:16px;">
          <div>
            <label style="display:block;color:#ababad;font-size:13px;font-weight:600;margin-bottom:6px;">Username</label>
            <input id="u" type="text" placeholder="your-username" autocomplete="username" style="width:100%;padding:11px 14px;border-radius:6px;background:#1a1d21;border:1px solid rgba(255,255,255,0.15);color:white;font-size:15px;outline:none;box-sizing:border-box;transition:border-color 0.15s;" onfocus="this.style.borderColor='#1264a3';this.style.boxShadow='0 0 0 3px rgba(18,100,163,0.2)'" onblur="this.style.borderColor='rgba(255,255,255,0.15)';this.style.boxShadow='none'"/>
          </div>
          <div>
            <label style="display:block;color:#ababad;font-size:13px;font-weight:600;margin-bottom:6px;">Password</label>
            <input id="p" type="password" placeholder="••••••••••••" style="width:100%;padding:11px 14px;border-radius:6px;background:#1a1d21;border:1px solid rgba(255,255,255,0.15);color:white;font-size:15px;outline:none;box-sizing:border-box;transition:border-color 0.15s;" onfocus="this.style.borderColor='#1264a3';this.style.boxShadow='0 0 0 3px rgba(18,100,163,0.2)'" onblur="this.style.borderColor='rgba(255,255,255,0.15)';this.style.boxShadow='none'"/>
          </div>

          <button id="login-btn" onclick="doLogin()" style="width:100%;padding:12px;border-radius:6px;background:#1264a3;border:none;color:white;font-size:15px;font-weight:700;cursor:pointer;transition:background 0.15s;letter-spacing:0.2px;" onmouseover="this.style.background='#0b4f8a'" onmouseout="this.style.background='#1264a3'">
            Sign In
          </button>
        </div>

        <div style="text-align:center;margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);">
          <p style="color:#868686;font-size:13px;margin:0;">
            Don't have an account?
            <a href="#" onclick="showRegister()" style="color:#1d9bd1;text-decoration:none;font-weight:600;"> Sign up</a>
          </p>
        </div>
      </div>

      <!-- Security badges -->
      <div style="display:flex;gap:8px;justify-content:center;margin-top:20px;flex-wrap:wrap;">
        <span style="display:flex;align-items:center;gap:4px;color:#565856;font-size:11px;">
          <svg width="10" height="10" fill="#2bac76" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
          AES-256-GCM
        </span>
        <span style="color:#3d3d3d;">·</span>
        <span style="color:#565856;font-size:11px;">Kyber-1024 PQC</span>
        <span style="color:#3d3d3d;">·</span>
        <span style="color:#565856;font-size:11px;">Zero Knowledge</span>
      </div>
    </div>
  </div>`;

  window.doLogin = async () => {
    const btn = document.getElementById('login-btn');
    btn.textContent = 'Signing in...'; btn.disabled = true; btn.style.opacity = '0.7';
    try {
      const data = await fetch('/api/v1/auth/login/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: document.getElementById('u').value, password: document.getElementById('p').value })
      }).then(r => r.json());
      if (data.access) {
        sessionStorage.setItem('sb_access_token', data.access);
        sessionStorage.setItem('sb_refresh_token', data.refresh);
        window.location.reload();
      } else {
        const err = document.getElementById('login-err');
        err.textContent = data.detail || 'Invalid credentials. Please try again.';
        err.style.display = 'block';
        btn.textContent = 'Sign In'; btn.disabled = false; btn.style.opacity = '1';
      }
    } catch(e) { btn.textContent = 'Sign In'; btn.disabled = false; btn.style.opacity = '1'; }
  };

  window.showRegister = () => alert('Registration coming soon! Contact your admin.');
  document.getElementById('p')?.addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
}

function hideBoot() {
  const b = document.getElementById('boot-screen');
  if (b) { b.style.opacity = '0'; setTimeout(() => b.remove(), 300); }
}

window.STATE = STATE;
document.addEventListener('DOMContentLoaded', init);
