export const VaultModal = {
  _sessionToken: null,

  mount(selector, opts) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.innerHTML = this._render(opts);
    requestAnimationFrame(() => {
      el.querySelector('.vbackdrop')?.classList.remove('opacity-0');
      el.querySelector('.vpanel')?.classList.remove('opacity-0', 'translate-y-4');
    });
    this._bindEvents(el, opts);
  },

  unmount(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.querySelector('.vbackdrop')?.classList.add('opacity-0');
    el.querySelector('.vpanel')?.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => { if (el) el.innerHTML = ''; }, 300);
  },

  _render(opts) {
    return `
    <div class="vbackdrop fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 opacity-0 transition-opacity duration-200">
      <div class="vpanel w-full max-w-2xl bg-bank-900 border border-amber-500/20 rounded-2xl overflow-hidden shadow-2xl opacity-0 translate-y-4 transition-all duration-200">

        <!-- Header -->
        <div class="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-amber-500/5">
          <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <div class="flex-1">
            <h2 class="text-white font-semibold text-[16px]">Secure Vault</h2>
            <p class="text-amber-400/70 text-[12px]">Hardware key authentication required · Clearance Level 3+</p>
          </div>
          <button id="vault-close" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-bank-400 hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-white/10 px-6">
          ${['Authenticate', 'KYC Records', 'Blob Store', 'Hardware Keys'].map((tab, i) => `
            <button data-tab="${i}" class="vault-tab px-4 py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors
              ${i === 0 ? 'border-amber-400 text-amber-400' : 'border-transparent text-bank-400 hover:text-bank-200'}">
              ${tab}
            </button>`).join('')}
        </div>

        <!-- Content -->
        <div id="vault-content" class="p-6 min-h-[320px]">
          ${this._authTab()}
        </div>
      </div>
    </div>`;
  },

  _authTab() {
    return `
    <div class="flex flex-col gap-5">
      <div class="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
        <svg class="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <div>
          <p class="text-amber-300 text-[13px] font-medium">Hardware Key Required</p>
          <p class="text-amber-400/70 text-[12px] mt-0.5">Connect your registered USB security key. Session lasts 1 hour.</p>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-bank-300 text-xs font-semibold uppercase tracking-wider">Select Hardware Key</label>
        <select id="vault-key-sel" class="w-full px-3 py-2.5 rounded-lg bg-bank-800 border border-white/10 text-white text-sm focus:outline-none focus:border-vault-600 transition-colors">
          <option value="">— Select your registered key —</option>
          <option value="slot1">Slot 1: Primary Key (YubiKey 5C)</option>
          <option value="slot2">Slot 2: Backup Key</option>
        </select>
      </div>

      <div id="challenge-section" class="hidden flex-col gap-3">
        <label class="text-bank-300 text-xs font-semibold uppercase tracking-wider">FIDO2 Challenge</label>
        <div class="bg-bank-800 rounded-lg p-3 font-mono text-[11px] text-bank-300 break-all" id="challenge-display">—</div>
        <p class="text-bank-400 text-[12px]">Touch your hardware key when it blinks.</p>
        <button id="sign-btn" class="w-full py-2.5 rounded-lg bg-vault-600 hover:bg-vault-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
          </svg>
          Sign Challenge with Hardware Key
        </button>
      </div>

      <button id="get-challenge-btn" class="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-bank-200 font-medium text-sm transition-colors flex items-center justify-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
        Request FIDO2 Challenge
      </button>

      <div id="vault-status" class="hidden p-3 rounded-lg text-sm font-medium"></div>
    </div>`;
  },

  _kycTab() {
    return `
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
        <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        <span class="text-emerald-400 text-[12px]">All fields AES-256-GCM encrypted. Decrypted in-browser only.</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        ${['Full Name','Date of Birth','ID Type','ID Number','ID Expiry','KYC Status'].map(f => `
        <div class="flex flex-col gap-1">
          <label class="text-bank-400 text-[11px] uppercase tracking-wider">${f}</label>
          <div class="bg-bank-800 rounded-lg px-3 py-2">
            <div class="h-3 bg-bank-700 rounded animate-pulse w-3/4"></div>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
  },

  _blobTab() {
    return `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h3 class="text-bank-200 text-[14px] font-medium">Encrypted Documents</h3>
        <button class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-bank-200 text-[12px] transition-colors">
          Upload Document
        </button>
      </div>
      ${['Q3 Compliance Report.pdf','Board Resolution 2024.pdf','KYC Evidence Pack.zip'].map(name => `
      <div class="flex items-center gap-3 p-3 rounded-xl bg-bank-800/50 border border-white/5 hover:border-white/10 group transition-colors">
        <div class="w-8 h-8 rounded-lg bg-bank-700 flex items-center justify-center text-bank-300 text-[10px] font-mono shrink-0">PDF</div>
        <div class="flex-1 min-w-0">
          <p class="text-bank-100 text-[13px] truncate">${name}</p>
          <p class="text-bank-500 text-[11px]">Encrypted · IPFS · 1.2 MB</p>
        </div>
        <button class="opacity-0 group-hover:opacity-100 transition-opacity text-bank-400 hover:text-white text-[12px] flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Download
        </button>
      </div>`).join('')}
    </div>`;
  },

  _hwKeysTab() {
    return `
    <div class="flex flex-col gap-4">
      <div class="grid grid-cols-2 gap-4">
        ${[1,2].map(slot => `
        <div class="p-4 rounded-xl border border-white/10 bg-bank-800/30 flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
            </div>
            <span class="text-white text-[13px] font-medium">Slot ${slot} — ${slot===1?'Primary':'Backup'}</span>
          </div>
          <div class="text-bank-400 text-[12px] space-y-1">
            <div class="flex justify-between"><span>Type</span><span class="text-bank-200">YubiKey 5C NFC</span></div>
            <div class="flex justify-between"><span>Sign count</span><span class="text-bank-200 font-mono">42</span></div>
            <div class="flex justify-between"><span>Last used</span><span class="text-bank-200">Today</span></div>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
            <span class="text-emerald-400 text-[11px]">Active</span>
          </div>
        </div>`).join('')}
      </div>
      <button class="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-bank-200 text-sm transition-colors">
        Register New Hardware Key
      </button>
    </div>`;
  },

  _bindEvents(el, opts) {
    el.querySelector('#vault-close')?.addEventListener('click', opts.onClose);
    el.querySelector('.vbackdrop')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) opts.onClose();
    });

    el.querySelectorAll('.vault-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.vault-tab').forEach(t => {
          t.classList.remove('border-amber-400','text-amber-400');
          t.classList.add('border-transparent','text-bank-400');
        });
        btn.classList.add('border-amber-400','text-amber-400');
        btn.classList.remove('border-transparent','text-bank-400');

        const tab = parseInt(btn.dataset.tab);
        const content = el.querySelector('#vault-content');
        if (!this._sessionToken && tab > 0) {
          content.innerHTML = `
          <div class="flex flex-col items-center gap-3 py-12 text-bank-400">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <p class="text-[13px]">Authenticate with hardware key first.</p>
          </div>`;
          return;
        }
        const renders = [
          () => this._authTab(),
          () => this._kycTab(),
          () => this._blobTab(),
          () => this._hwKeysTab(),
        ];
        content.innerHTML = renders[tab]?.() || '';
        if (tab === 0) this._bindAuthEvents(el);
      });
    });

    this._bindAuthEvents(el);
  },

  _bindAuthEvents(el) {
    el.querySelector('#get-challenge-btn')?.addEventListener('click', async () => {
      if (!el.querySelector('#vault-key-sel')?.value) {
        alert('Select a hardware key first.'); return;
      }
      const status = el.querySelector('#vault-status');
      status.className = 'p-3 rounded-lg text-sm font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400';
      status.textContent = 'Requesting FIDO2 challenge...';
      status.classList.remove('hidden');
      await new Promise(r => setTimeout(r, 800));
      const challenge = btoa(Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => String.fromCharCode(b)).join(''));
      el.querySelector('#challenge-display').textContent = challenge;
      el.querySelector('#challenge-section')?.classList.remove('hidden');
      el.querySelector('#challenge-section')?.classList.add('flex');
      status.className = 'p-3 rounded-lg text-sm font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400';
      status.textContent = 'Challenge ready. Touch your hardware key when it blinks.';
    });

    el.querySelector('#sign-btn')?.addEventListener('click', async () => {
      const status = el.querySelector('#vault-status');
      status.className = 'p-3 rounded-lg text-sm font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400';
      status.textContent = 'Waiting for hardware key...';
      await new Promise(r => setTimeout(r, 1500));
      this._sessionToken = 'vault-token-' + Date.now();
      status.className = 'p-3 rounded-lg text-sm font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400';
      status.textContent = 'Vault session opened. Access granted for 1 hour.';
    });
  },
};
