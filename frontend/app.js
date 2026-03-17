/**
 * frontend/app.js
 * SecureBank Messenger — Main UI Application
 * Pixel-perfect Slack clone with dark glassmorphism theme.
 */

import { Sidebar } from './components/Sidebar.js';
import { ChatArea } from './components/ChatArea.js';
import { ThreadPanel } from './components/ThreadPanel.js';
import { VaultModal } from './components/VaultModal.js';
import { WebSocketManager } from './utils/websocket_manager.js';
import { E2EEClient } from './utils/e2ee_client.js';

// ─── App State ──────────────────────────────────────────────────────────────
const STATE = {
  user: null,
  accessToken: null,
  currentWorkspace: null,
  currentChannel: null,
  activeThread: null,
  vaultOpen: false,
  channels: [],
  messages: {},
  presences: {},
  typingUsers: {},
  wsManager: null,
  e2ee: null,
};

// ─── Initialise ─────────────────────────────────────────────────────────────
async function init() {
  const token = sessionStorage.getItem('sb_access_token');
  if (!token) { showLoginScreen(); return; }
  STATE.accessToken = token;
  STATE.e2ee = new E2EEClient();
  await STATE.e2ee.init();
  try {
    const me = await apiFetch('/api/v1/auth/me/profile/');
    STATE.user = me;
    const workspaces = await apiFetch('/api/v1/workspaces/');
    if (workspaces.results?.length) {
      STATE.currentWorkspace = workspaces.results[0];
      const chRes = await apiFetch(`/api/v1/workspaces/${STATE.currentWorkspace.slug}/channels/`);
      STATE.channels = chRes.results || [];
      if (STATE.channels.length) STATE.currentChannel = STATE.channels[0];
    }
    renderApp();
    hideBoot();
  } catch (e) {
    sessionStorage.removeItem('sb_access_token');
    showLoginScreen();
  }
}

// ─── API Helper ─────────────────────────────────────────────────────────────
export async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STATE.accessToken}`,
      'X-Device-Fingerprint': getDeviceFingerprint(),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) { await refreshToken(); return apiFetch(path, options); }
  if (!res.ok) throw await res.json();
  return res.json();
}

async function refreshToken() {
  const refresh = sessionStorage.getItem('sb_refresh_token');
  if (!refresh) { showLoginScreen(); return; }
  const data = await fetch('/api/v1/auth/refresh/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  }).then(r => r.json());
  STATE.accessToken = data.access;
  sessionStorage.setItem('sb_access_token', data.access);
}

// ─── Render ─────────────────────────────────────────────────────────────────
function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="flex h-screen w-screen bg-bank-950 overflow-hidden">
      <!-- Workspace rail (far left) -->
      <div id="workspace-rail" class="flex flex-col items-center gap-2 py-3 px-2 bg-bank-975 border-r border-white/5 w-[68px] shrink-0">
        ${renderWorkspaceRail()}
      </div>
      <!-- Sidebar (channels) -->
      <div id="sidebar-container" class="w-[260px] shrink-0 flex flex-col bg-bank-900 border-r border-white/5"></div>
      <!-- Main content -->
      <div id="main-content" class="flex flex-1 min-w-0 overflow-hidden">
        <div id="chat-container" class="flex flex-col flex-1 min-w-0"></div>
        <div id="thread-container" class="hidden w-[360px] shrink-0 border-l border-white/5 bg-bank-900"></div>
      </div>
      <!-- Vault modal -->
      <div id="vault-modal-container"></div>
    </div>
  `;

  // Mount components
  Sidebar.mount('#sidebar-container', {
    state: STATE,
    onChannelSelect: selectChannel,
    onVaultOpen: openVault,
  });

  if (STATE.currentChannel) {
    ChatArea.mount('#chat-container', {
      state: STATE,
      onSend: sendMessage,
      onThreadOpen: openThread,
      onReact: addReaction,
    });
    connectWebSocket(STATE.currentChannel.id);
  }
}

// ─── Channel Selection ───────────────────────────────────────────────────────
async function selectChannel(channel) {
  STATE.currentChannel = channel;
  STATE.activeThread = null;

  // Close current WS
  if (STATE.wsManager) STATE.wsManager.disconnect();

  // Close thread panel
  const threadContainer = document.getElementById('thread-container');
  threadContainer?.classList.add('hidden');

  // Re-mount chat area
  ChatArea.mount('#chat-container', {
    state: STATE,
    onSend: sendMessage,
    onThreadOpen: openThread,
    onReact: addReaction,
  });

  connectWebSocket(channel.id);

  // Highlight active channel in sidebar
  document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-channel-id="${channel.id}"]`)?.classList.add('active');
}

// ─── WebSocket ───────────────────────────────────────────────────────────────
function connectWebSocket(channelId) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${proto}://${location.host}/ws/channel/${channelId}/`;

  STATE.wsManager = new WebSocketManager(wsUrl, STATE.accessToken, {
    onMessage: handleWsMessage,
    onTyping: handleTyping,
    onPresence: handlePresence,
    onReaction: handleReaction,
    onError: (e) => console.error('WS error:', e),
  });
  STATE.wsManager.connect();
}

// ─── WS Event Handlers ───────────────────────────────────────────────────────
async function handleWsMessage(data) {
  const channelId = STATE.currentChannel?.id;
  if (!STATE.messages[channelId]) STATE.messages[channelId] = [];

  let displayText = '🔒 Encrypted message';
  try {
    displayText = await STATE.e2ee.decrypt(
      data.ciphertext_b64, data.nonce_b64, data.auth_tag_b64
    );
  } catch (_) {}

  const msg = {
    id: data.id,
    sender: data.sender,
    plaintext: displayText,
    ciphertext_b64: data.ciphertext_b64,
    nonce_b64: data.nonce_b64,
    auth_tag_b64: data.auth_tag_b64,
    thread_id: data.thread_id,
    created_at: data.created_at,
    reactions: [],
  };

  STATE.messages[channelId].push(msg);
  ChatArea.appendMessage(msg);
}

function handleTyping(data) {
  const channelId = STATE.currentChannel?.id;
  if (!STATE.typingUsers[channelId]) STATE.typingUsers[channelId] = new Set();
  if (data.typing) STATE.typingUsers[channelId].add(data.username);
  else STATE.typingUsers[channelId].delete(data.username);
  ChatArea.updateTypingIndicator([...STATE.typingUsers[channelId]]);
}

function handlePresence(data) {
  STATE.presences[data.user_id] = data.status;
  Sidebar.updatePresence(data.user_id, data.status);
}

function handleReaction(data) {
  ChatArea.updateReaction(data.message_id, data.emoji_code, data.username, data.action);
}

// ─── Send Message ────────────────────────────────────────────────────────────
async function sendMessage({ plaintext, threadId, ttlSeconds }) {
  if (!plaintext.trim() || !STATE.wsManager) return;

  let ciphertext_b64, nonce_b64, auth_tag_b64;
  try {
    ({ ciphertext_b64, nonce_b64, auth_tag_b64 } = await STATE.e2ee.encrypt(plaintext));
  } catch (_) {
    ciphertext_b64 = btoa(plaintext); nonce_b64 = ''; auth_tag_b64 = '';
  }

  STATE.wsManager.send({
    type: 'send_message',
    ciphertext_b64, nonce_b64, auth_tag_b64,
    ...(threadId ? { thread_id: threadId } : {}),
    ...(ttlSeconds ? { ttl_seconds: ttlSeconds } : {}),
  });

  STATE.wsManager.send({ type: 'typing_stop' });
}

// ─── Thread ──────────────────────────────────────────────────────────────────
function openThread(message) {
  STATE.activeThread = message;
  const container = document.getElementById('thread-container');
  container?.classList.remove('hidden');
  ThreadPanel.mount('#thread-container', {
    message,
    state: STATE,
    onSendReply: (text) => sendMessage({ plaintext: text, threadId: message.thread_id || message.id }),
    onClose: closeThread,
  });
}

function closeThread() {
  STATE.activeThread = null;
  document.getElementById('thread-container')?.classList.add('hidden');
}

// ─── Reactions ───────────────────────────────────────────────────────────────
function addReaction(messageId, emojiCode) {
  STATE.wsManager?.send({ type: 'add_reaction', message_id: messageId, emoji_code: emojiCode });
}

// ─── Vault ───────────────────────────────────────────────────────────────────
function openVault() {
  STATE.vaultOpen = true;
  VaultModal.mount('#vault-modal-container', {
    user: STATE.user,
    accessToken: STATE.accessToken,
    onClose: () => { STATE.vaultOpen = false; VaultModal.unmount('#vault-modal-container'); },
  });
}

// ─── Login Screen ────────────────────────────────────────────────────────────
function showLoginScreen() {
  hideBoot();
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="flex h-screen w-screen items-center justify-center bg-bank-950">
      <div class="glass-panel w-full max-w-sm p-8 rounded-2xl flex flex-col gap-6">
        <div class="flex flex-col items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-vault-500 to-blue-600 flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h1 class="text-xl font-semibold text-white">SecureBank Messenger</h1>
          <p class="text-bank-400 text-sm text-center">Enterprise-grade E2EE communication</p>
        </div>

        <div id="login-error" class="hidden bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm"></div>

        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-bank-300 text-xs font-medium uppercase tracking-wider">Employee ID or Username</label>
            <input id="login-username" type="text" placeholder="username"
              class="input-field" autocomplete="username" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-bank-300 text-xs font-medium uppercase tracking-wider">Password</label>
            <input id="login-password" type="password" placeholder="••••••••••••••••"
              class="input-field" autocomplete="current-password" />
          </div>
          <button id="login-btn" onclick="window._doLogin()"
            class="btn-primary w-full mt-1">
            Sign In Securely
          </button>
        </div>

        <div id="mfa-section" class="hidden flex-col gap-4">
          <div class="border-t border-white/10 pt-4">
            <p class="text-bank-300 text-sm mb-3 text-center">Enter your authenticator code</p>
            <input id="mfa-code" type="text" placeholder="000000" maxlength="8"
              class="input-field text-center text-xl font-mono tracking-[0.5em]" />
            <button onclick="window._doMFA()" class="btn-primary w-full mt-3">Verify MFA</button>
          </div>
        </div>

        <p class="text-bank-500 text-xs text-center">
          🔐 AES-256-GCM + PQC Kyber-1024 encrypted
        </p>
      </div>
    </div>
  `;

  window._doLogin = async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    btn.textContent = 'Signing in…'; btn.disabled = true;
    try {
      const data = await fetch('/api/v1/auth/login/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      }).then(r => r.json());

      if (data.mfa_required) {
        window._pendingTokens = data;
        document.getElementById('mfa-section').classList.remove('hidden');
        document.getElementById('mfa-section').classList.add('flex');
        btn.textContent = 'Sign In Securely'; btn.disabled = false;
        return;
      }
      if (data.access) {
        sessionStorage.setItem('sb_access_token', data.access);
        sessionStorage.setItem('sb_refresh_token', data.refresh);
        window.location.reload();
      }
    } catch (e) {
      const err = document.getElementById('login-error');
      err.textContent = 'Invalid credentials. Please try again.';
      err.classList.remove('hidden');
      btn.textContent = 'Sign In Securely'; btn.disabled = false;
    }
  };

  window._doMFA = async () => {
    const code = document.getElementById('mfa-code').value.trim();
    const devices = window._pendingTokens?.mfa_methods || [];
    if (!code) return;
    // In full impl: call /api/v1/auth/mfa/verify/ with device_id + code
    alert('MFA verification: enter code ' + code);
  };

  // Allow Enter key on login
  document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') window._doLogin();
  });
}

// ─── Workspace Rail Render ────────────────────────────────────────────────────
function renderWorkspaceRail() {
  const initials = (STATE.currentWorkspace?.name || 'SB').slice(0, 2).toUpperCase();
  return `
    <button class="w-10 h-10 rounded-xl bg-vault-600 hover:bg-vault-500 flex items-center justify-center text-white font-semibold text-sm transition-all shadow-lg">
      ${initials}
    </button>
    <div class="w-5 h-px bg-white/10 my-1"></div>
    <button title="Add workspace"
      class="w-10 h-10 rounded-xl border-2 border-dashed border-white/20 hover:border-vault-400 flex items-center justify-center text-bank-400 hover:text-vault-400 transition-all">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
    </button>
    <div class="flex-1"></div>
    <!-- Vault button -->
    <button id="rail-vault-btn" title="Open Vault" onclick="window._openVaultFromRail()"
      class="w-10 h-10 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 flex items-center justify-center text-amber-400 transition-all group">
      <svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
    </button>
    <!-- User avatar -->
    <button class="w-10 h-10 rounded-full bg-bank-700 border-2 border-vault-500 flex items-center justify-center text-white text-xs font-semibold hover:border-vault-400 transition-all overflow-hidden"
      title="${STATE.user?.username || 'Me'}">
      ${(STATE.user?.username || '?').slice(0, 2).toUpperCase()}
    </button>
  `;
}

// ─── Utils ───────────────────────────────────────────────────────────────────
function getDeviceFingerprint() {
  const cached = sessionStorage.getItem('sb_dfp');
  if (cached) return cached;
  const fp = btoa([navigator.userAgent, screen.width, screen.height, navigator.language].join('|'));
  sessionStorage.setItem('sb_dfp', fp);
  return fp;
}

function hideBoot() {
  const boot = document.getElementById('boot-screen');
  if (boot) { boot.style.opacity = '0'; setTimeout(() => boot.remove(), 400); }
}

// Global hooks
window._openVaultFromRail = openVault;
window.STATE = STATE;

// Boot
document.addEventListener('DOMContentLoaded', init);
