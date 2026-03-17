export const ThreadPanel = {
  mount(selector, opts) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.innerHTML = this._render(opts);
    this._bindEvents(el, opts);
  },

  _render({ message }) {
    const time = new Date(message.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const initials = (message.sender?.username || '?').slice(0,2).toUpperCase();
    return `
    <div class="flex flex-col h-full">

      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-bank-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <h3 class="text-white font-semibold text-[14px]">Thread</h3>
        </div>
        <button id="close-thread" class="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center text-bank-400 hover:text-white transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto py-4 scrollbar-thin">

        <!-- Root message -->
        <div class="px-4 pb-4 border-b border-white/5 mb-2">
          <div class="flex gap-3">
            <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-vault-700 to-blue-800 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              ${initials}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2">
                <span class="text-white text-[14px] font-semibold">${message.sender?.username || 'Unknown'}</span>
                <span class="text-bank-500 text-[11px]">${time}</span>
              </div>
              <p class="text-bank-100 text-[14px] leading-relaxed mt-0.5">${message.plaintext || 'Encrypted'}</p>
            </div>
          </div>
          <div class="mt-2 pl-12">
            <span class="text-bank-500 text-[12px] flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              ${message.reply_count || 0} replies
            </span>
          </div>
        </div>

        <!-- Replies -->
        <div id="thread-replies" class="space-y-1 px-4">
          <p class="text-bank-500 text-[12px] text-center py-4">No replies yet.</p>
        </div>
      </div>

      <!-- Reply input -->
      <div class="px-4 pb-4 pt-3 border-t border-white/5 shrink-0">
        <div class="rounded-xl border border-white/10 bg-bank-800/50 focus-within:border-vault-600/50 transition-colors overflow-hidden">
          <div id="thread-input" contenteditable="true" role="textbox"
            class="min-h-[44px] max-h-[120px] overflow-y-auto outline-none text-bank-100 text-[14px] px-3 py-3
                   empty:before:content-[attr(data-placeholder)] empty:before:text-bank-500"
            data-placeholder="Reply..."></div>
          <div class="flex items-center justify-between px-3 pb-2.5">
            <div class="flex items-center gap-1 text-bank-600 text-[11px]">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
              </svg>
              E2EE
            </div>
            <button id="thread-send"
              class="w-8 h-8 rounded-lg bg-vault-600 hover:bg-vault-500 disabled:opacity-30 flex items-center justify-center transition-all">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>`;
  },

  _bindEvents(el, opts) {
    el.querySelector('#close-thread')?.addEventListener('click', opts.onClose);
    const input = el.querySelector('#thread-input');
    const sendBtn = el.querySelector('#thread-send');
    const doSend = () => {
      const text = input.innerText.trim();
      if (!text) return;
      opts.onSendReply(text);
      input.innerText = '';
    };
    input?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }});
    sendBtn?.addEventListener('click', doSend);
  },

  appendReply(reply) {
    const list = document.getElementById('thread-replies');
    if (!list) return;
    list.querySelector('.text-center')?.remove();
    const time = new Date(reply.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const div = document.createElement('div');
    div.className = 'flex gap-2.5 py-1.5 hover:bg-white/[0.03] rounded-lg px-2 -mx-2 transition-colors';
    div.innerHTML = `
      <div class="w-7 h-7 rounded-md bg-gradient-to-br from-vault-700 to-blue-800 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
        ${(reply.sender?.username || '?').slice(0,2).toUpperCase()}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline gap-1.5">
          <span class="text-white text-[13px] font-semibold">${reply.sender?.username || 'Unknown'}</span>
          <span class="text-bank-500 text-[10px]">${time}</span>
        </div>
        <p class="text-bank-100 text-[13px] leading-relaxed">${reply.plaintext || 'Encrypted'}</p>
      </div>`;
    list.appendChild(div);
  },
};
