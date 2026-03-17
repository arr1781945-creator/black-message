/**
 * frontend/components/UserPresence.js
 * Real-time presence indicator component.
 */

export const UserPresence = {
  STATUS_COLORS: {
    active:  { dot: '#22c55e', label: 'Active' },
    away:    { dot: '#f59e0b', label: 'Away' },
    dnd:     { dot: '#ef4444', label: 'Do Not Disturb' },
    offline: { dot: '#4b5563', label: 'Offline' },
  },

  render(userId, status, username) {
    const cfg = this.STATUS_COLORS[status] || this.STATUS_COLORS.offline;
    return `
    <div class="flex items-center gap-2" data-user-id="${userId}">
      <div class="relative">
        <div class="w-8 h-8 rounded-lg bg-bank-700 flex items-center justify-center text-white text-xs font-semibold">
          ${(username || '?').slice(0, 2).toUpperCase()}
        </div>
        <span class="status-dot absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bank-900"
              style="background:${cfg.dot}"></span>
      </div>
      <div class="flex flex-col">
        <span class="text-white text-[13px] font-medium">${username}</span>
        <span class="text-bank-500 text-[11px]">${cfg.label}</span>
      </div>
    </div>`;
  },

  updateDot(userId, status) {
    const el = document.querySelector(`[data-user-id="${userId}"] .status-dot`);
    if (!el) return;
    const cfg = this.STATUS_COLORS[status] || this.STATUS_COLORS.offline;
    el.style.background = cfg.dot;
  },
};
