/**
 * frontend/components/MessageInput.js
 * Standalone message input component — rich text, emoji, attachments.
 * Exported for reuse in both main chat and thread panels.
 */

export class MessageInput {
  constructor(container, opts = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.opts = opts;
    this.typingTimer = null;
    this._render();
    this._bind();
  }

  _render() {
    this.container.innerHTML = `
    <div class="message-input-wrapper rounded-xl border border-white/10 bg-bank-800/50 backdrop-blur-sm overflow-hidden focus-within:border-vault-500/50 transition-colors">
      <div class="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-white/5">
        <button data-fmt="bold"   class="fmt-btn w-6 h-6 rounded text-bank-500 hover:text-white hover:bg-white/10 text-xs font-bold flex items-center justify-center">B</button>
        <button data-fmt="italic" class="fmt-btn w-6 h-6 rounded text-bank-500 hover:text-white hover:bg-white/10 text-xs italic flex items-center justify-center">I</button>
        <button data-fmt="code"   class="fmt-btn w-6 h-6 rounded text-bank-500 hover:text-white hover:bg-white/10 text-xs font-mono flex items-center justify-center">&lt;/&gt;</button>
      </div>
      <div
        id="mi-input-${this._uid()}"
        contenteditable="true"
        class="mi-input min-h-[44px] max-h-[180px] overflow-y-auto outline-none text-bank-100 text-[14px] leading-relaxed px-3 py-2
               empty:before:content-[attr(data-placeholder)] empty:before:text-bank-500"
        data-placeholder="${this.opts.placeholder || 'Message…'}"
      ></div>
      <div class="flex items-center justify-between px-3 pb-2">
        <div class="flex gap-1">
          <button class="emoji-btn w-7 h-7 rounded text-bank-500 hover:text-bank-200 hover:bg-white/5 text-[14px] flex items-center justify-center" title="Emoji">😊</button>
          <button class="attach-btn w-7 h-7 rounded text-bank-500 hover:text-bank-200 hover:bg-white/5 text-[14px] flex items-center justify-center" title="Attach file">📎</button>
          <button class="mention-btn w-7 h-7 rounded text-bank-500 hover:text-bank-200 hover:bg-white/5 font-bold text-sm flex items-center justify-center" title="Mention">@</button>
        </div>
        <button class="send-btn w-8 h-8 rounded-lg bg-vault-600 hover:bg-vault-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all" disabled>
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </button>
      </div>
    </div>`;
  }

  _bind() {
    const input = this.container.querySelector('.mi-input');
    const sendBtn = this.container.querySelector('.send-btn');

    const send = () => {
      const text = input.innerText.trim();
      if (!text) return;
      this.opts.onSend?.({ plaintext: text });
      input.innerText = '';
      sendBtn.disabled = true;
    };

    input.addEventListener('input', () => {
      sendBtn.disabled = !input.innerText.trim();
      clearTimeout(this.typingTimer);
      this.opts.onTypingStart?.();
      this.typingTimer = setTimeout(() => this.opts.onTypingStop?.(), 2000);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });

    sendBtn.addEventListener('click', send);

    // Format buttons
    this.container.querySelectorAll('.fmt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fmt = btn.dataset.fmt;
        if (fmt === 'bold') document.execCommand('bold');
        else if (fmt === 'italic') document.execCommand('italic');
        else if (fmt === 'code') {
          const sel = window.getSelection();
          if (sel.rangeCount) {
            const text = sel.toString();
            document.execCommand('insertText', false, `\`${text}\``);
          }
        }
        input.focus();
      });
    });
  }

  focus() { this.container.querySelector('.mi-input')?.focus(); }
  clear() { const i = this.container.querySelector('.mi-input'); if (i) i.innerText = ''; }
  _uid() { return Math.random().toString(36).slice(2, 8); }
}
