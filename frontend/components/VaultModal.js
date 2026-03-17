/**
 * frontend/components/VaultModal.js
 * Secure Vault access modal — hardware key challenge, KYC viewer, blob store.
 * Requires Clearance Level 3+ and vault session token.
 */

export const VaultModal = {
  _sessionToken: null,

  mount(selector, opts) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.innerHTML = this._renderModal(opts);
    this._bind(el, opts);

    // Entrance animation
    requestAnimationFrame(() => {
      el.querySelector('.vault-backdrop')?.classList.remove('opacity-0');
      el.querySelector('.vault-panel')?.classList.remove('opacity-0', 'translate-y-4');
    });
  },

  unmount(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    const backdrop = el.querySelector('.vault-backdrop');
    const panel = el.querySelector('.vault-panel');
    if (backdrop) backdrop.classList.add('opacity-0');
    if (panel) { panel.classList.add('opacity-0', 'translate-y-4'); }
    setTimeout(() => { if (el) el.innerHTML = ''; }, 300);
  },

  _renderModal(opts) {
    return `
    <div class="vault-backdrop fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 opacity-0 transition-opacity duration-200">
      <div class="vault-panel glass-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl opacity-0 translate-y-4 transition-all duration-200 border border-amber-500/20">

        <!-- Header -->
        <div class="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-amber-500/5">
          <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <div>
            <h2 class="text-white font-semibold text-[16px]">Secure Vault</h2>
            <p class="text-amber-400/70 text-[12px]">Hardware key authentication required · Clearance Level 3+</p>
          </div>
          <button id="vault-close" class="ml-auto w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-bank-400 hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-white/10 px-6" id="vault-tabs">
          ${['🔐 Authenticate', '📋 KYC Records', '🗂 Blob Store', '🔑 Hardware Keys'].map((tab, i) => `
            <button data-tab="${i}"
              class="vault-tab px-4 py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors
                     ${i === 0 ? 'border-amber-400 text-amber-400' : 'border-transparent text-bank-400 hover:text-bank-200'}">
              ${tab}
            </button>`).join('')}
        </div>

        <!-- Tab content -->
        <div id="vault-content" class="p-6 min-h-[320px]">
          ${this._renderAuthTab(opts)}
        </div>

      </div>
    </div>`;
  },

  _renderAuthTab(opts) {
    return `
    <div id="tab-auth" class="flex flex-col gap-5">
      <div class="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <div>
            <p class="text-amber-300 text-[13px] font-medium">Hardware Key Required</p>
            <p class="text-amber-400/70 text-[12px] mt-1">Connect your registered USB security key to open a vault session. Session lasts 1 hour.</p>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-bank-300 text-xs font-semibold uppercase tracking-wider">Select Hardware Key</label>
        <select id="vault-key-select" class="input-field">
          <option value="">— Select your registered key —</option>
          <option value="slot1">Slot 1: Primary Key (YubiKey 5C)</option>
          <option value="slot2">Slot 2: Backup Key</option>
        </select>
      </div>

      <div id="vault-challenge-section" class="hidden flex-col gap-3">
        <label class="text-bank-300 text-xs font-semibold uppercase tracking-wider">FIDO2 Challenge</label>
        <div class="bg-bank-800 rounded-lg p-3 font-mono text-[11px] text-bank-300 break-all" id="vault-challenge-display">
          —
        </div>
        <p class="text-bank-400 text-[12px]">Touch your hardware key when it blinks to produce the assertion response.</p>
        <button id="vault-sign-btn" class="btn-primary">
          🔑 Sign Challenge with Hardware Key
        </button>
      </div>

      <button id="vault-get-challenge-btn" class="btn-secondary flex items-center gap-2 justify-center">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
        </svg>
        Request FIDO2 Challenge
      </button>

      <div id="vault-auth-status" class="hidden p-3 rounded-lg text-sm font-medium"></div>
    </div>`;
  },

  _renderKYCTab() {
    return `
    <div id="tab-kyc" class="flex flex-col gap-4">
      <div class="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
        <svg class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        <span class="text-emerald-400 text-[12px]">All fields are AES-256-GCM encrypted. Decrypted in-browser only.</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        ${['Full Name', 'Date of Birth', 'ID Type', 'ID Number', 'ID Expiry', 'KYC Status'].map(f => `
        <div class="flex flex-col gap-1">
          <label class="text-bank-400 text-[11px] uppercase tracking-wider">${f}</label>
          <div class="bg-bank-800 rounded-lg px-3 py-2 text-bank-100 text-[13px] font-mono skeleton-loading">
            <div class="h-3 bg-bank-700 rounded animate-pulse w-3/4"></div>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
  },

  _renderBlobTab() {
    return `
    <div id="tab-blob" class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h3 class="text-bank-200 text-[14px] font-medium">Encrypted Documents</h3>
        <button class="btn-secondary text-[12px] py-1.5 px-3">+ Upload Document</button>
      </div>
      <div class="space-y-2">
        ${['Q3 Compliance Report.pdf', 'Board Resolution 2024.pdf', 'KYC Evidence Pack.zip'].map(name => `
        <div class="flex items-center gap-3 p-3 rounded-xl bg-bank-800/50 border border-white/5 hover:border-white/10 group transition-colors">
          <div class="w-8 h-8 rounded-lg bg-bank-700 flex items-center justify-center text-bank-300 text-[11px] font-mono shrink-0">PDF</div>
          <div class="flex-1 min-w-0">
            <p class="text-bank-100 text-[13px] truncate">${name}</p>
            <p class="text-bank-500 text-[11px]">Encrypted · IPFS · 1.2 MB</p>
          </div>
          <button class="opacity-0 group-hover:opacity-100 transition-opacity text-bank-400 hover:text-white text-[12px]">
            Download
          </button>
        </div>`).join('')}
      </div>
    </div>`;
  },

  _renderHWKeysTab() {
    return `
    <div id="tab-hwkeys" class="flex flex-col gap-4">
      <div class="grid grid-cols-2 gap-4">
        ${[1, 2].map(slot => `
        <div class="p-4 rounded-xl border border-white/10 bg-bank-800/30 flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
            </div>
            <span class="text-white text-[13px] font-medium">Slot ${slot} — ${slot === 1 ? 'Primary' : 'Backup'}</span>
          </div>
          <div class="text-bank-400 text-[12px] space-y-1">
            <div class="flex justify-between"><span>Type:</span><span class="text-bank-200">YubiKey 5C NFC</span></div>
            <div class="flex justify-between"><span>Sign count:</span><span class="text-bank-200 font-mono">42</span></div>
            <div class="flex justify-between"><span>Last used:</span><span class="text-bank-200">Today</span></div>
          </div>
          <span class="inline-flex items-center gap-1 text-[11px] text-emerald-400">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span> Active
          </span>
        </div>`).join('')}
      </div>
      <button class="btn-secondary text-[12px]">+ Register New Hardware Key</button>
    </div>`;
  },

  _bind(el, opts) {
    el.querySelector('#vault-close')?.addEventListener('click', opts.onClose);

    // Tab switching
    el.querySelectorAll('.vault-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.vault-tab').forEach(t => {
          t.classList.remove('border-amber-400', 'text-amber-400');
          t.classList.add('border-transparent', 'text-bank-400');
        });
        btn.classList.add('border-amber-400', 'text-amber-400');
        btn.classList.remove('border-transparent', 'text-bank-400');

        const content = el.querySelector('#vault-content');
        const tab = parseInt(btn.dataset.tab);
        if (!this._sessionToken && tab > 0) {
          content.innerHTML = `<div class="flex flex-col items-center gap-3 py-8 text-bank-400">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <p class="text-[13px]">Authenticate with your hardware key first to access vault contents.</p>
          </div>`;
          return;
        }
        const renders = [
          () => this._renderAuthTab(opts),
          () => this._renderKYCTab(),
          () => this._renderBlobTab(),
          () => this._renderHWKeysTab(),
        ];
        content.innerHTML = renders[tab]?.() || '';
        if (tab === 0) this._bindAuthEvents(el, opts);
      });
    });

    this._bindAuthEvents(el, opts);
    el.querySelector('.vault-backdrop')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) opts.onClose();
    });
  },

  _bindAuthEvents(el, opts) {
    el.querySelector('#vault-get-challenge-btn')?.addEventListener('click', async () => {
      const keySelect = el.querySelector('#vault-key-select');
      if (!keySelect?.value) { alert('Please select a hardware key first.'); return; }
      const status = el.querySelector('#vault-auth-status');
      status.className = 'p-3 rounded-lg text-sm font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400';
      status.textContent = 'Requesting FIDO2 challenge…';
      status.classList.remove('hidden');
      // Simulate challenge
      await sleep(800);
      const challenge = btoa(Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => String.fromCharCode(b)).join(''));
      el.querySelector('#vault-challenge-display').textContent = challenge;
      el.querySelector('#vault-challenge-section')?.classList.remove('hidden');
      el.querySelector('#vault-challenge-section')?.classList.add('flex');
      status.className = 'p-3 rounded-lg text-sm font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400';
      status.textContent = 'Challenge ready. Touch your hardware key when it blinks.';
    });

    el.querySelector('#vault-sign-btn')?.addEventListener('click', async () => {
      const status = el.querySelector('#vault-auth-status');
      status.className = 'p-3 rounded-lg text-sm font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400';
      status.textContent = 'Waiting for hardware key signature…';
      await sleep(1500);
      this._sessionToken = 'mock-vault-token-' + Date.now();
      status.className = 'p-3 rounded-lg text-sm font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400';
      status.textContent = '✓ Vault session opened. Access granted for 1 hour.';
    });
  },
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
