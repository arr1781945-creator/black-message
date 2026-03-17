/**
 * frontend/components/ChatArea.js
 * Main message area — channel header, message list, message input.
 * Supports: skeleton loading, reactions, threading, E2EE indicator,
 * TTL badges, typing indicators, date separators.
 */

export const ChatArea = {
  _opts: null,
  _messageListEl: null,

  mount(selector, opts) {
    this._opts = opts;
    const el = document.querySelector(selector);
    if (!el) return;
    this._render(el, opts);
    this._messageListEl = el.querySelector('#message-list');
    this._loadMessages(opts.state.currentChannel);
  },

  _render(el, opts) {
    const channel = opts.state.currentChannel;
    const isPrivate = channel?.channel_type === 'private';

    el.innerHTML = `
    <div class="flex flex-col h-full min-h-0">

      <!-- Channel Header -->
      <div class="flex items-center gap-3 px-5 py-3 border-b border-white/5 shrink-0 bg-bank-900/50 backdrop-blur-sm">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          ${isPrivate
            ? `<svg class="w-5 h-5 text-bank-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`
            : `<span class="text-bank-300 font-bold text-xl leading-none">#</span>`}
          <h2 class="text-white font-semibold text-[15px] truncate">${channel?.name || 'general'}</h2>
          ${channel?.topic ? `<span class="text-bank-500 text-[13px] truncate hidden md:inline"> · ${channel.topic}</span>` : ''}
        </div>

        <!-- Header actions -->
        <div class="flex items-center gap-1 shrink-0">
          <!-- E2EE indicator -->
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30" title="End-to-end encrypted">
            <svg class="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
            </svg>
            <span class="text-emerald-400 text-[11px] font-medium">E2EE</span>
          </div>
          <!-- Members count -->
          <button class="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 text-bank-400 hover:text-bank-200 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/>
            </svg>
            <span class="text-[12px]">5</span>
          </button>
          <!-- Search -->
          <button class="p-1.5 rounded hover:bg-white/5 text-bank-400 hover:text-bank-200 transition-colors" title="Search in channel">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>
          <!-- Pin -->
          <button class="p-1.5 rounded hover:bg-white/5 text-bank-400 hover:text-bank-200 transition-colors" title="Pinned messages">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Message List -->
      <div id="message-list" class="flex-1 overflow-y-auto overflow-x-hidden px-0 py-4 space-y-0 scrollbar-thin scroll-smooth">
        <!-- Skeleton loaders -->
        ${this._renderSkeletons(5)}
      </div>

      <!-- Typing indicator -->
      <div id="typing-indicator" class="px-5 h-6 shrink-0 flex items-center">
        <span id="typing-text" class="text-bank-400 text-[12px] italic hidden"></span>
      </div>

      <!-- Message Input -->
      <div class="px-4 pb-4 shrink-0">
        <div class="input-box rounded-xl border border-white/10 bg-bank-800/50 backdrop-blur-sm overflow-hidden">
          <!-- Toolbar -->
          <div class="flex items-center gap-1 px-3 pt-2.5 pb-1">
            ${this._renderInputToolbar()}
          </div>
          <!-- Text area -->
          <div class="relative px-3 pb-2">
            <div id="message-input" contenteditable="true" role="textbox" aria-multiline="true"
              class="min-h-[44px] max-h-[200px] overflow-y-auto outline-none text-bank-100 text-[14px] leading-relaxed
                     empty:before:content-[attr(data-placeholder)] empty:before:text-bank-500"
              data-placeholder="Message #${channel?.name || 'general'}"
            ></div>
          </div>
          <!-- Bottom bar -->
          <div class="flex items-center justify-between px-3 pb-2.5">
            <div class="flex items-center gap-1">
              ${this._renderBottomToolbar()}
            </div>
            <div class="flex items-center gap-2">
              <!-- TTL selector -->
              <select id="ttl-select" class="text-[11px] bg-transparent text-bank-500 hover:text-bank-300 border-0 outline-none cursor-pointer">
                <option value="">No TTL</option>
                <option value="300">5 min</option>
                <option value="3600">1 hour</option>
                <option value="86400">24 hours</option>
                <option value="604800">7 days</option>
              </select>
              <!-- Send button -->
              <button id="send-btn"
                class="w-8 h-8 rounded-lg bg-vault-600 hover:bg-vault-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    this._bindInputEvents(el, opts);
  },

  _renderInputToolbar() {
    const tools = [
      ['B', 'Bold', 'font-bold'],
      ['I', 'Italic', 'italic'],
      ['S̶', 'Strikethrough', 'line-through'],
      ['<>', 'Code', 'font-mono text-xs'],
      ['⋮', 'More', ''],
    ];
    return tools.map(([label, title]) => `
      <button title="${title}" class="w-6 h-6 rounded text-bank-500 hover:text-bank-200 hover:bg-white/5 text-[12px] font-medium flex items-center justify-center transition-colors">${label}</button>
    `).join('<div class="w-px h-4 bg-white/10 mx-0.5"></div>');
  },

  _renderBottomToolbar() {
    const btns = [
      { icon: '😊', title: 'Emoji' },
      { icon: '📎', title: 'Attach file' },
      { icon: '@', title: 'Mention' },
      { icon: '🔒', title: 'Set TTL / Self-destruct' },
    ];
    return btns.map(b => `
      <button title="${b.title}"
        class="w-7 h-7 rounded text-bank-500 hover:text-bank-200 hover:bg-white/5 text-[14px] flex items-center justify-center transition-colors">${b.icon}</button>
    `).join('');
  },

  _renderSkeletons(count) {
    return Array.from({ length: count }, (_, i) => `
    <div class="flex gap-3 px-5 py-1.5 animate-pulse" style="animation-delay:${i * 80}ms">
      <div class="w-9 h-9 rounded-lg bg-bank-700 shrink-0 mt-0.5"></div>
      <div class="flex flex-col gap-2 flex-1">
        <div class="flex gap-2 items-center">
          <div class="h-3 w-24 bg-bank-700 rounded"></div>
          <div class="h-2 w-14 bg-bank-800 rounded"></div>
        </div>
        <div class="h-3 bg-bank-800 rounded" style="width:${60 + (i * 13 % 35)}%"></div>
        ${i % 2 === 0 ? `<div class="h-3 bg-bank-800 rounded" style="width:${40 + (i * 7 % 25)}%"></div>` : ''}
      </div>
    </div>`).join('');
  },

  _renderMessage(msg) {
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const initials = (msg.sender?.username || '?').slice(0, 2).toUpperCase();
    const hasThread = (msg.reply_count || 0) > 0;
    const hasTTL = !!msg.destroy_at;

    const reactionsHtml = (msg.reactions || []).length > 0
      ? `<div class="flex flex-wrap gap-1 mt-1">
          ${Object.entries(
            (msg.reactions || []).reduce((acc, r) => {
              acc[r.emoji_code] = (acc[r.emoji_code] || 0) + 1; return acc;
            }, {})
          ).map(([emoji, count]) => `
            <button class="reaction-pill flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 hover:bg-vault-500/20 border border-white/10 hover:border-vault-500/40 text-[12px] transition-colors"
              data-msg-id="${msg.id}" data-emoji="${emoji}">
              <span>${emoji}</span>
              <span class="text-bank-300">${count}</span>
            </button>`).join('')
          }
          <button class="add-reaction-btn w-6 h-6 rounded-full flex items-center justify-center text-bank-500 hover:text-bank-300 hover:bg-white/5 transition-colors text-[12px]"
            data-msg-id="${msg.id}">+</button>
        </div>`
      : '';

    return `
    <div class="message-item group relative flex gap-3 px-5 py-1.5 hover:bg-white/[0.03] transition-colors"
         data-msg-id="${msg.id}">

      <!-- Avatar -->
      <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-vault-700 to-blue-800 flex items-center justify-center text-white text-[11px] font-semibold shrink-0 mt-0.5">
        ${initials}
      </div>

      <!-- Content -->
      <div class="flex flex-col flex-1 min-w-0">
        <!-- Header -->
        <div class="flex items-baseline gap-2 flex-wrap">
          <span class="text-white text-[14px] font-semibold">${msg.sender?.username || 'Unknown'}</span>
          <span class="text-bank-500 text-[11px] font-mono">${time}</span>
          ${hasTTL ? `<span class="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-mono">⏱ Self-destructs</span>` : ''}
          ${msg.is_edited ? `<span class="text-bank-600 text-[11px] italic">(edited)</span>` : ''}
        </div>

        <!-- Message body -->
        <div class="text-bank-100 text-[14px] leading-relaxed mt-0.5 break-words">
          ${escapeHtml(msg.plaintext || '🔒 Encrypted')}
        </div>

        <!-- Reactions -->
        ${reactionsHtml}

        <!-- Thread button -->
        ${hasThread ? `
        <button class="open-thread-btn mt-1.5 flex items-center gap-2 text-vault-400 hover:text-vault-300 text-[12px] transition-colors group/thread"
          data-msg-id="${msg.id}">
          <div class="flex -space-x-1">
            <div class="w-4 h-4 rounded-full bg-vault-700 border border-bank-900 text-[8px] flex items-center justify-center text-white font-bold">A</div>
          </div>
          <span class="font-medium">${msg.reply_count} ${msg.reply_count === 1 ? 'reply' : 'replies'}</span>
          <span class="text-bank-500 group-hover/thread:text-vault-400 transition-colors">Last reply today</span>
          <svg class="w-3 h-3 ml-auto opacity-0 group-hover/thread:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>` : ''}
      </div>

      <!-- Hover action toolbar -->
      <div class="action-toolbar absolute top-0 right-4 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5
                  bg-bank-850 border border-white/10 rounded-lg p-0.5 shadow-xl z-10">
        ${['😊', '↩️', '🔖', '⋯'].map((icon, i) => `
          <button class="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center text-bank-400 hover:text-bank-200 text-[13px] transition-colors"
            title="${['React', 'Reply in thread', 'Save', 'More actions'][i]}"
            data-action="${['react', 'thread', 'bookmark', 'more'][i]}"
            data-msg-id="${msg.id}">${icon}</button>
        `).join('')}
      </div>
    </div>`;
  },

  async _loadMessages(channel) {
    if (!channel) return;
    const list = this._messageListEl;
    if (!list) return;

    // Small delay to show skeleton
    await sleep(600);

    const cachedMessages = this._opts.state.messages[channel.id] || [];

    if (cachedMessages.length === 0) {
      // Channel welcome message
      list.innerHTML = `
      <div class="px-5 pb-6 border-b border-white/5 mb-4">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-vault-600 to-blue-700 flex items-center justify-center text-white text-xl font-bold mb-3">
          #
        </div>
        <h2 class="text-white text-xl font-bold">Welcome to #${channel.name}!</h2>
        <p class="text-bank-400 text-[13px] mt-1">${channel.purpose || `This is the start of the #${channel.name} channel.`}</p>
        <div class="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
          </svg>
          <span class="text-emerald-400 text-[12px]">All messages in this channel are end-to-end encrypted with AES-256-GCM + Kyber-1024 PQC.</span>
        </div>
      </div>`;
    } else {
      list.innerHTML = cachedMessages.map(m => this._renderMessage(m)).join('');
      this._scrollToBottom();
    }
  },

  appendMessage(msg) {
    const list = this._messageListEl;
    if (!list) return;

    // Remove skeleton if still showing
    list.querySelectorAll('.animate-pulse').forEach(el => el.remove());

    const div = document.createElement('div');
    div.innerHTML = this._renderMessage(msg);
    const node = div.firstElementChild;

    // Entry animation
    node.style.opacity = '0';
    node.style.transform = 'translateY(8px)';
    list.appendChild(node);

    requestAnimationFrame(() => {
      node.style.transition = 'opacity 200ms ease, transform 200ms ease';
      node.style.opacity = '1';
      node.style.transform = 'translateY(0)';
    });

    this._scrollToBottom();
  },

  updateTypingIndicator(users) {
    const text = document.getElementById('typing-text');
    if (!text) return;
    if (users.length === 0) { text.classList.add('hidden'); return; }
    text.classList.remove('hidden');
    if (users.length === 1) text.textContent = `${users[0]} is typing…`;
    else if (users.length === 2) text.textContent = `${users[0]} and ${users[1]} are typing…`;
    else text.textContent = `${users[0]} and ${users.length - 1} others are typing…`;
  },

  updateReaction(messageId, emojiCode, username, action) {
    const msgEl = document.querySelector(`[data-msg-id="${messageId}"]`);
    if (!msgEl) return;
    const pill = msgEl.querySelector(`[data-emoji="${emojiCode}"]`);
    if (action === 'added') {
      if (pill) {
        const countEl = pill.querySelector('span:last-child');
        if (countEl) countEl.textContent = parseInt(countEl.textContent) + 1;
      }
    } else if (action === 'removed' && pill) {
      const countEl = pill.querySelector('span:last-child');
      const newCount = parseInt(countEl.textContent) - 1;
      if (newCount <= 0) pill.remove();
      else countEl.textContent = newCount;
    }
  },

  _bindInputEvents(el, opts) {
    const input = el.querySelector('#message-input');
    const sendBtn = el.querySelector('#send-btn');
    let typingTimeout = null;

    const doSend = () => {
      const text = input.innerText.trim();
      if (!text) return;
      const ttlSelect = el.querySelector('#ttl-select');
      opts.onSend({
        plaintext: text,
        ttlSeconds: ttlSelect?.value ? parseInt(ttlSelect.value) : null,
      });
      input.innerText = '';
      sendBtn.disabled = true;
    };

    input.addEventListener('input', () => {
      const hasText = input.innerText.trim().length > 0;
      sendBtn.disabled = !hasText;
      opts.state.wsManager?.send({ type: 'typing_start' });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => opts.state.wsManager?.send({ type: 'typing_stop' }), 2000);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });

    sendBtn?.addEventListener('click', doSend);
    sendBtn.disabled = true;

    // Message actions (react, thread, bookmark)
    el.querySelector('#message-list')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const msgId = btn.dataset.msgId;
      const action = btn.dataset.action;
      if (action === 'thread') {
        const msg = opts.state.messages[opts.state.currentChannel?.id]?.find(m => m.id === msgId);
        if (msg) opts.onThreadOpen(msg);
      } else if (action === 'react') {
        const emoji = prompt('Enter emoji reaction (e.g. 👍):');
        if (emoji) opts.onReact(msgId, emoji);
      }
      const openThread = e.target.closest('.open-thread-btn');
      if (openThread) {
        const id = openThread.dataset.msgId;
        const msg = opts.state.messages[opts.state.currentChannel?.id]?.find(m => m.id === id);
        if (msg) opts.onThreadOpen(msg);
      }
    });
  },

  _scrollToBottom() {
    if (this._messageListEl) {
      this._messageListEl.scrollTop = this._messageListEl.scrollHeight;
    }
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 rounded text-[13px] font-mono">$1</code>');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
