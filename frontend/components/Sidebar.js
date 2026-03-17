/**
 * frontend/components/Sidebar.js
 * Slack-identical sidebar: workspace header, channels list,
 * DMs list, user status footer. Full keyboard navigation.
 */

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
    const publicChannels  = channels.filter(c => c.channel_type === 'public');
    const privateChannels = channels.filter(c => c.channel_type === 'private');
    const dmChannels      = channels.filter(c => ['dm', 'group_dm'].includes(c.channel_type));

    return `
    <div class="flex flex-col h-full overflow-hidden select-none">

      <!-- Workspace Header -->
      <button class="flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 group shrink-0">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <span class="text-white font-bold text-[15px] truncate">
            ${currentWorkspace?.name || 'SecureBank'}
          </span>
          <svg class="w-4 h-4 text-bank-400 group-hover:text-white transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        <!-- Edit / Compose button -->
        <div class="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0" title="New message">
          <svg class="w-4 h-4 text-bank-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          </svg>
        </div>
      </button>

      <!-- Scrollable nav -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5 scrollbar-thin">

        <!-- Jump to -->
        <div class="px-3 mb-1">
          <button class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-bank-400 hover:text-bank-200 hover:bg-white/5 text-sm transition-colors group">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <span class="text-[13px]">Jump to…</span>
            <kbd class="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono text-bank-500">⌘K</kbd>
          </button>
        </div>

        <!-- Threads / DMs shortcuts -->
        ${this._renderNavItem('🧵', 'Threads', 'nav-threads')}
        ${this._renderNavItem('💬', 'Direct messages', 'nav-dms')}
        ${this._renderNavItem('📌', 'Mentions & reactions', 'nav-mentions')}

        <div class="h-px bg-white/5 mx-3 my-2"></div>

        <!-- Channels Section -->
        <div class="channel-section">
          <button class="flex items-center gap-1.5 w-full px-3 py-1 text-bank-400 hover:text-bank-200 text-[11px] font-semibold uppercase tracking-wider transition-colors group"
                  data-toggle="channels-list">
            <svg class="w-3 h-3 transition-transform group-[.collapsed]:rotate-[-90deg]" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4 6l4 4 4-4"/>
            </svg>
            Channels
          </button>
          <div id="channels-list" class="space-y-0.5 mt-0.5">
            ${publicChannels.map(c => this._renderChannelItem(c)).join('')}
            ${privateChannels.map(c => this._renderChannelItem(c, true)).join('')}
          </div>
          <button class="flex items-center gap-2 w-full px-5 py-1 text-bank-500 hover:text-bank-300 text-[13px] transition-colors mt-0.5 group">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add channels
          </button>
        </div>

        <div class="h-px bg-white/5 mx-3 my-2"></div>

        <!-- DMs Section -->
        <div class="dm-section">
          <button class="flex items-center gap-1.5 w-full px-3 py-1 text-bank-400 hover:text-bank-200 text-[11px] font-semibold uppercase tracking-wider transition-colors">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4"/></svg>
            Direct Messages
          </button>
          <div class="space-y-0.5 mt-0.5">
            ${dmChannels.map(c => this._renderDMItem(c, presences)).join('')}
          </div>
          <button class="flex items-center gap-2 w-full px-5 py-1 text-bank-500 hover:text-bank-300 text-[13px] transition-colors mt-0.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            New direct message
          </button>
        </div>

        <div class="h-px bg-white/5 mx-3 my-2"></div>

        <!-- Vault shortcut -->
        <button id="vault-sidebar-btn"
          class="flex items-center gap-2 w-full px-5 py-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-[13px] transition-colors rounded-md mx-0 group">
          <svg class="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          Secure Vault
          <span class="ml-auto text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono">L3+</span>
        </button>

      </div>

      <!-- User status footer -->
      <div class="border-t border-white/5 px-3 py-3 shrink-0">
        <button class="flex items-center gap-2.5 w-full rounded-md p-1.5 hover:bg-white/5 transition-colors group">
          <div class="relative shrink-0">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-vault-600 to-blue-700 flex items-center justify-center text-white text-xs font-semibold">
              ${(user?.username || '?').slice(0, 2).toUpperCase()}
            </div>
            <span class="status-dot absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bank-900 bg-emerald-500" id="my-status-dot"></span>
          </div>
          <div class="flex flex-col items-start flex-1 min-w-0">
            <span class="text-white text-[13px] font-medium truncate w-full">${user?.username || 'User'}</span>
            <span class="text-bank-400 text-[11px] truncate w-full">${user?.department || 'SecureBank'}</span>
          </div>
          <svg class="w-4 h-4 text-bank-500 group-hover:text-bank-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </button>
      </div>
    </div>`;
  },

  _renderNavItem(icon, label, id) {
    return `
    <button id="${id}" class="flex items-center gap-2.5 w-full px-5 py-1.5 text-bank-300 hover:text-white hover:bg-white/5 text-[13px] transition-colors rounded-md mx-0">
      <span>${icon}</span>
      <span>${label}</span>
    </button>`;
  },

  _renderChannelItem(channel, isPrivate = false) {
    const icon = isPrivate
      ? `<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`
      : `<span class="text-bank-400 font-semibold text-base leading-none">#</span>`;

    const hasUnread = (channel.unread_count || 0) > 0;
    return `
    <button data-channel-id="${channel.id}"
      class="channel-item flex items-center gap-2 w-full px-5 py-[5px] hover:bg-white/5 text-[13px] transition-colors rounded-md text-left
             ${hasUnread ? 'text-white font-semibold' : 'text-bank-400 hover:text-bank-200'}">
      ${icon}
      <span class="truncate flex-1">${channel.name}</span>
      ${hasUnread ? `<span class="text-[10px] bg-vault-500 text-white px-1.5 py-0.5 rounded-full font-bold ml-auto">${channel.unread_count}</span>` : ''}
    </button>`;
  },

  _renderDMItem(channel, presences) {
    const statusColor = { active: 'bg-emerald-500', away: 'bg-amber-500', dnd: 'bg-red-500', offline: 'bg-bank-600' };
    const initials = channel.name.slice(0, 2).toUpperCase();
    const statusKey = presences[channel.id] || 'offline';
    return `
    <button data-channel-id="${channel.id}"
      class="channel-item flex items-center gap-2.5 w-full px-3 py-[5px] hover:bg-white/5 text-[13px] transition-colors rounded-md text-left text-bank-300 hover:text-bank-100">
      <div class="relative shrink-0">
        <div class="w-5 h-5 rounded bg-bank-700 flex items-center justify-center text-[9px] font-semibold text-bank-300">${initials}</div>
        <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-bank-900 ${statusColor[statusKey]}"></span>
      </div>
      <span class="truncate">${channel.name}</span>
    </button>`;
  },

  _bindEvents(el, opts) {
    // Channel clicks
    el.addEventListener('click', e => {
      const channelBtn = e.target.closest('.channel-item');
      if (channelBtn) {
        const channelId = channelBtn.dataset.channelId;
        const channel = opts.state.channels.find(c => c.id === channelId);
        if (channel) opts.onChannelSelect(channel);
      }
      // Vault button
      if (e.target.closest('#vault-sidebar-btn')) opts.onVaultOpen();
    });

    // Collapse toggles
    el.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = el.querySelector(`#${btn.dataset.toggle}`);
        target?.classList.toggle('hidden');
        btn.classList.toggle('collapsed');
      });
    });
  },

  updatePresence(userId, status) {
    const dot = document.querySelector(`[data-user-id="${userId}"] .status-dot`);
    if (!dot) return;
    const colors = { active: 'bg-emerald-500', away: 'bg-amber-500', dnd: 'bg-red-500', offline: 'bg-bank-600' };
    dot.className = dot.className.replace(/bg-\w+-\d+/, colors[status] || 'bg-bank-600');
  },
};
