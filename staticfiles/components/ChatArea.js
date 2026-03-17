export const ChatArea = {
  _opts: null,
  _listEl: null,

  mount(selector, opts) {
    this._opts = opts;
    const el = document.querySelector(selector);
    if (!el) return;
    el.innerHTML = this._render(opts.state);
    this._listEl = el.querySelector('#msg-list');
    this._bindEvents(el, opts);
    this._loadMessages(opts.state.currentChannel);
  },

  _render({ currentChannel }) {
    return `
    <div class="flex flex-col h-full min-h-0 flex-1">

      <!-- Header -->
      <div class="flex items-center gap-3 px-5 py-3 border-b border-white/5 shrink-0 bg-bank-900/50">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          ${currentChannel?.channel_type === 'private'
            ? `<svg class="w-5 h-5 text-bank-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`
            : `<span class="text-bank-300 font-bold text-xl leading-none">#</span>`
          }
          <h2 class="text-white font-semibold text-[15px] truncate">${currentChannel?.name || 'general'}</h2>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <!-- E2EE Badge -->
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <svg class="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
            </svg>
            <span class="text-emerald-400 text-[11px] font-medium">E2EE</span>
          </div>
          <!-- Members -->
          <button class="p-1.5 rounded hover:bg-white/5 text-bank-400 hover:text-bank-200 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/>
            </svg>
          </button>
          <!-- Search -->
          <button class="p-1.5 rounded hover:bg-white/5 text-bank-400 hover:text-bank-200 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div id="msg-list" class="flex-1 overflow-y-auto py-4 scrollbar-thin">
        ${this._skeletons(5)}
      </div>

      <!-- Typing -->
      <div class="px-5 h-5 shrink-0 flex items-center">
        <span id="typing-txt" class="text-bank-500 text-[12px] italic hidden"></span>
      </div>

      <!-- Input -->
      <div class="px-4 pb-4 shrink-0">
        <div class="rounded-xl border border-white/10 bg-bank-800/50 focus-within:border-vault-600/50 transition-colors overflow-hidden">
          <!-- Format toolbar -->
          <div class="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-white/5">
            <button class="w-6 h-6 rounded text-bank-500 hover:text-white hover:bg-white/10 text-xs font-bold flex items-center justify-center transition-colors">B</button>
            <button class="w-6 h-6 rounded text-bank-500 hover:text-white hover:bg-white/10 text-xs italic flex items-center justify-center transition-colors">I</button>
            <button class="w-6 h-6 rounded text-bank-500 hover:text-white hover:bg-white/10 text-xs font-mono flex items-center justify-center transition-colors">&lt;/&gt;</button>
            <div class="w-px h-4 bg-white/10 mx-0.5"></div>
            <button class="w-6 h-6 rounded text-bank-500 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
            </button>
          </div>
          <!-- Text input -->
          <div id="msg-input" contenteditable="true" role="textbox"
            class="min-h-[44px] max-h-[180px] overflow-y-auto outline-none text-bank-100 text-[14px] px-3 py-2.5 leading-relaxed
                   empty:before:content-[attr(data-placeholder)] empty:before:text-bank-500"
            data-placeholder="Message #${currentChannel?.name || 'general'}"></div>
          <!-- Bottom bar -->
          <div class="flex items-center justify-between px-3 pb-2.5">
            <div class="flex items-center gap-1">
              <!-- Attach -->
              <button class="w-7 h-7 rounded text-bank-500 hover:text-bank-200 hover:bg-white/5 flex items-center justify-center transition-colors" title="Attach file">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
              </button>
              <!-- Mention -->
              <button class="w-7 h-7 rounded text-bank-500 hover:text-bank-200 hover:bg-white/5 flex items-center justify-center transition-colors font-bold text-sm" title="Mention">@</button>
              <!-- TTL -->
              <select id="ttl-sel" class="text-[11px] bg-transparent text-bank-500 hover:text-bank-300 border-0 outline-none cursor-pointer">
                <option value="">No TTL</option>
                <option value="300">5 min</option>
                <option value="3600">1 hour</option>
                <option value="86400">24 hours</option>
              </select>
            </div>
            <!-- Send -->
            <button id="send-btn" disabled
              class="w-8 h-8 rounded-lg bg-vault-600 hover:bg-vault-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>`;
  },

  _skeletons(n) {
    return Array.from({length: n}, (_, i) => `
    <div class="flex gap-3 px-5 py-1.5 animate-pulse" style="animation-delay:${i*80}ms">
      <div class="w-9 h-9 rounded-lg bg-bank-700 shrink-0"></div>
      <div class="flex flex-col gap-2 flex-1">
        <div class="flex gap-2">
          <div class="h-3 w-20 bg-bank-700 rounded"></div>
          <div class="h-2 w-12 bg-bank-800 rounded"></div>
        </div>
        <div class="h-3 bg-bank-800 rounded" style="width:${55+(i*11%35)}%"></div>
      </div>
    </div>`).join('');
  },

  _msgHtml(msg) {
    const time = new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const initials = (msg.sender?.username || '?').slice(0,2).toUpperCase();
    return `
    <div class="msg-item group relative flex gap-3 px-5 py-1.5 hover:bg-white/[0.03] transition-colors" data-msg-id="${msg.id}">
      <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-vault-700 to-blue-800 flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5">${initials}</div>
      <div class="flex flex-col flex-1 min-w-0">
        <div class="flex items-baseline gap-2">
          <span class="text-white text-[14px] font-semibold">${msg.sender?.username || 'Unknown'}</span>
          <span class="text-bank-500 text-[11px]">${time}</span>
          ${msg.destroy_at ? `<span class="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">Self-destructs</span>` : ''}
        </div>
        <p class="text-bank-100 text-[14px] leading-relaxed mt-0.5 break-words">${this._escape(msg.plaintext || 'Encrypted')}</p>
        ${(msg.reactions||[]).length ? `
        <div class="flex flex-wrap gap-1 mt-1">
          ${Object.entries((msg.reactions||[]).reduce((a,r) => { a[r.emoji_code]=(a[r.emoji_code]||0)+1; return a; }, {}))
            .map(([e,c]) => `<button class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 hover:bg-vault-500/20 border border-white/10 text-[12px]" data-msg-id="${msg.id}" data-emoji="${e}"><span>${e}</span><span class="text-bank-300">${c}</span></button>`).join('')}
        </div>` : ''}
        ${msg.reply_count > 0 ? `
        <button class="open-thread mt-1 text-vault-400 hover:text-vault-300 text-[12px] font-medium transition-colors" data-msg-id="${msg.id}">
          ${msg.reply_count} ${msg.reply_count===1?'reply':'replies'}
        </button>` : ''}
      </div>
      <!-- Hover actions -->
      <div class="action-bar absolute top-0 right-4 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-bank-850 border border-white/10 rounded-lg p-0.5 shadow-xl z-10">
        ${[
          ['Reply', `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>`, 'thread'],
          ['React', `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`, 'react'],
          ['Save', `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>`, 'save'],
        ].map(([title, icon, action]) => `
          <button class="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center text-bank-400 hover:text-bank-200 transition-colors" title="${title}" data-action="${action}" data-msg-id="${msg.id}">${icon}</button>
        `).join('')}
      </div>
    </div>`;
  },

  async _loadMessages(channel) {
    if (!channel) return;
    await new Promise(r => setTimeout(r, 500));
    const list = this._listEl;
    if (!list) return;
    const cached = this._opts.state.messages[channel.id] || [];
    if (cached.length === 0) {
      list.innerHTML = `
      <div class="px-5 pb-6 border-b border-white/5 mb-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-vault-600 to-blue-700 flex items-center justify-center text-white text-lg font-bold mb-3">#</div>
        <h2 class="text-white text-xl font-bold">Welcome to #${channel.name}</h2>
        <p class="text-bank-400 text-[13px] mt-1">Start of the #${channel.name} channel.</p>
        <div class="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
          <span class="text-emerald-400 text-[12px]">All messages encrypted — AES-256-GCM + PQC Kyber-1024</span>
        </div>
      </div>`;
    } else {
      list.innerHTML = cached.map(m => this._msgHtml(m)).join('');
      this._scrollBottom();
    }
  },

  appendMessage(msg) {
    const list = this._listEl;
    if (!list) return;
    list.querySelectorAll('.animate-pulse').forEach(e => e.remove());
    const div = document.createElement('div');
    div.innerHTML = this._msgHtml(msg);
    const node = div.firstElementChild;
    node.style.cssText = 'opacity:0;transform:translateY(6px)';
    list.appendChild(node);
    requestAnimationFrame(() => {
      node.style.transition = 'opacity 200ms ease, transform 200ms ease';
      node.style.opacity = '1';
      node.style.transform = 'translateY(0)';
    });
    this._scrollBottom();
  },

  updateTypingIndicator(users) {
    const el = document.getElementById('typing-txt');
    if (!el) return;
    if (!users.length) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.textContent = users.length === 1 ? `${users[0]} is typing...` : `${users.join(', ')} are typing...`;
  },

  updateReaction(msgId, emoji, username, action) {
    const msg = document.querySelector(`[data-msg-id="${msgId}"]`);
    if (!msg) return;
    const pill = msg.querySelector(`[data-emoji="${emoji}"]`);
    if (action === 'added' && pill) {
      const cnt = pill.querySelector('span:last-child');
      if (cnt) cnt.textContent = parseInt(cnt.textContent) + 1;
    } else if (action === 'removed' && pill) {
      const cnt = pill.querySelector('span:last-child');
      const n = parseInt(cnt.textContent) - 1;
      if (n <= 0) pill.remove(); else cnt.textContent = n;
    }
  },

  _bindEvents(el, opts) {
    const input = el.querySelector('#msg-input');
    const sendBtn = el.querySelector('#send-btn');
    let typingTimer = null;

    const doSend = () => {
      const text = input.innerText.trim();
      if (!text) return;
      const ttl = el.querySelector('#ttl-sel')?.value;
      opts.onSend({ plaintext: text, ttlSeconds: ttl ? parseInt(ttl) : null });
      input.innerText = '';
      sendBtn.disabled = true;
    };

    input.addEventListener('input', () => {
      sendBtn.disabled = !input.innerText.trim();
      opts.state.wsManager?.send({ type: 'typing_start' });
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => opts.state.wsManager?.send({ type: 'typing_stop' }), 2000);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });

    sendBtn?.addEventListener('click', doSend);

    el.querySelector('#msg-list')?.addEventListener('click', e => {
      const action = e.target.closest('[data-action]');
      if (action) {
        const msgId = action.dataset.msgId;
        const msg = opts.state.messages[opts.state.currentChannel?.id]?.find(m => m.id === msgId);
        if (action.dataset.action === 'thread' && msg) opts.onThreadOpen(msg);
        if (action.dataset.action === 'react') opts.onReact(msgId, '👍');
      }
      const thread = e.target.closest('.open-thread');
      if (thread) {
        const msg = opts.state.messages[opts.state.currentChannel?.id]?.find(m => m.id === thread.dataset.msgId);
        if (msg) opts.onThreadOpen(msg);
      }
    });
  },

  _scrollBottom() { if (this._listEl) this._listEl.scrollTop = this._listEl.scrollHeight; },
  _escape(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/`(.*?)`/g,'<code class="bg-white/10 px-1 rounded text-[13px] font-mono">$1</code>');
  },
};
