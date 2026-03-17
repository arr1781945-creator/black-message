export const Sidebar = {
  _opts: null,

  mount(selector, opts) {
    this._opts = opts;
    const el = document.querySelector(selector);
    if (!el) return;
    el.innerHTML = this._render(opts.state);
    this._bindEvents(el, opts);
  },

  _render({ currentWorkspace, channels, user, presences }) {
    const publicChannels = channels.filter(c => c.channel_type !== 'dm');
    const dmChannels = channels.filter(c => c.channel_type === 'dm');

    return `
    <div class="flex flex-col h-full">

      <!-- Workspace Header -->
      <button class="flex items-center gap-2 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors group">
        <span class="text-white font-bold text-[15px] flex-1 truncate text-left">${currentWorkspace?.name || 'BlackMess'}</span>
        <svg class="w-4 h-4 text-bank-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      <!-- Scrollable -->
      <div class="flex-1 overflow-y-auto py-2 space-y-0.5">

        <!-- Search -->
        <div class="px-3 mb-1">
          <button class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-bank-400 hover:text-bank-200 hover:bg-white/5 text-[13px] transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            Jump to...
            <kbd class="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-bank-500">⌘K</kbd>
          </button>
        </div>

        <!-- Nav items -->
        ${this._navItem('Threads', `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>`)}
        ${this._navItem('Mentions', `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/></svg>`)}
        ${this._navItem('Drafts', `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`)}

        <div class="h-px bg-white/5 mx-3 my-2"></div>

        <!-- Channels -->
        <div class="px-3 py-1 flex items-center gap-1 text-bank-400 hover:text-bank-200 cursor-pointer text-[11px] font-semibold uppercase tracking-wider">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
          Channels
        </div>
        ${publicChannels.map(c => this._channelItem(c)).join('')}
        <button class="flex items-center gap-2 w-full px-5 py-1 text-bank-500 hover:text-bank-300 text-[13px] transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Add channels
        </button>

        <div class="h-px bg-white/5 mx-3 my-2"></div>

        <!-- DMs -->
        <div class="px-3 py-1 flex items-center gap-1 text-bank-400 text-[11px] font-semibold uppercase tracking-wider">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
          Direct Messages
        </div>
        ${dmChannels.map(c => this._dmItem(c, presences)).join('')}

        <div class="h-px bg-white/5 mx-3 my-2"></div>

        <!-- Vault -->
        <button id="vault-btn" class="flex items-center gap-2.5 w-full px-5 py-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-[13px] transition-colors rounded-md">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          Secure Vault
          <span class="ml-auto text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-400">L3+</span>
        </button>

      </div>

      <!-- User Footer -->
      <div class="border-t border-white/5 px-3 py-3 shrink-0">
        <button class="flex items-center gap-2.5 w-full p-1.5 rounded-md hover:bg-white/5 transition-colors">
          <div class="relative shrink-0">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-vault-600 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
              ${(user?.username || '?').slice(0,2).toUpperCase()}
            </div>
            <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bank-900 bg-emerald-500"></span>
          </div>
          <div class="flex flex-col items-start flex-1 min-w-0">
            <span class="text-white text-[13px] font-medium truncate">${user?.username || 'User'}</span>
            <span class="text-bank-500 text-[11px]">Active</span>
          </div>
          <svg class="w-4 h-4 text-bank-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </button>
      </div>
    </div>`;
  },

  _navItem(label, icon) {
    return `
    <button class="flex items-center gap-2.5 w-full px-5 py-1.5 text-bank-300 hover:text-white hover:bg-white/5 text-[13px] transition-colors">
      ${icon}
      ${label}
    </button>`;
  },

  _channelItem(channel) {
    return `
    <button data-ch="${channel.id}" class="ch-item flex items-center gap-2 w-full px-5 py-[5px] text-bank-400 hover:text-bank-200 hover:bg-white/5 text-[13px] transition-colors rounded-md">
      ${channel.channel_type === 'private'
        ? `<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`
        : `<span class="text-bank-400 font-bold text-base leading-none">#</span>`
      }
      <span class="truncate">${channel.name}</span>
      ${channel.unread_count > 0 ? `<span class="ml-auto text-[10px] bg-vault-600 text-white px-1.5 py-0.5 rounded-full font-bold">${channel.unread_count}</span>` : ''}
    </button>`;
  },

  _dmItem(channel, presences) {
    const status = presences[channel.id] || 'offline';
    const colors = { active: 'bg-emerald-500', away: 'bg-amber-500', dnd: 'bg-red-500', offline: 'bg-bank-600' };
    return `
    <button data-ch="${channel.id}" class="ch-item flex items-center gap-2.5 w-full px-3 py-[5px] text-bank-300 hover:text-bank-100 hover:bg-white/5 text-[13px] transition-colors rounded-md">
      <div class="relative shrink-0">
        <div class="w-5 h-5 rounded bg-bank-700 flex items-center justify-center text-[9px] font-bold">
          ${channel.name.slice(0,2).toUpperCase()}
        </div>
        <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-bank-900 ${colors[status]}"></span>
      </div>
      <span class="truncate">${channel.name}</span>
    </button>`;
  },

  _bindEvents(el, opts) {
    el.addEventListener('click', e => {
      const ch = e.target.closest('.ch-item');
      if (ch) {
        const channel = opts.state.channels.find(c => c.id === ch.dataset.ch);
        if (channel) opts.onChannelSelect(channel);
      }
      if (e.target.closest('#vault-btn')) opts.onVaultOpen();
    });
  },

  updatePresence(userId, status) {
    const dot = document.querySelector(`[data-user-id="${userId}"] .status-dot`);
    if (!dot) return;
    const colors = { active: 'bg-emerald-500', away: 'bg-amber-500', dnd: 'bg-red-500', offline: 'bg-bank-600' };
    dot.className = `status-dot absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bank-900 ${colors[status]}`;
  },
};
