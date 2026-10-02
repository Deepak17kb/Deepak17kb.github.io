/* =========================================================
   Coffee, two ways
   1. Buy me a coffee: UPI. Pick a size, scan the QR (desktop) or
      tap "Pay in a UPI app" (phone). Hidden until DKB_DATA.coffee.upi is set.
   2. Coffee chat: a pre-written email inviting a virtual coffee.
   ========================================================= */
(() => {
  const D = window.DKB_DATA || {};
  const C = D.coffee || {};
  const api = () => window.DKB || {};
  const dlg = document.querySelector('.cafe');
  if (!dlg) return;

  const VPA_OK = /^[\w.\-]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,64}$/;
  const upiReady = typeof C.upi === 'string' && VPA_OK.test(C.upi.trim());
  const vpa = upiReady ? C.upi.trim() : '';
  document.documentElement.classList.toggle('has-upi', upiReady);

  /* ---------- Coffee chat: an email that's already half written ---------- */
  const CHAT_SUBJECT = 'Virtual coffee chat ☕';
  const chatBody = () => {
    return [
      'Hi Deepak,',
      '',
      "I saw your portfolio and I'd like to grab a virtual coffee to talk about [a job / an internship / a project].",
      '',
      'A couple of times that work for me (with time zone):',
      '- ',
      '- ',
      '',
      'Best,',
      '',
    ].join('\n');
  };
  const chatHref = () => (api().gmailUrl ? api().gmailUrl(CHAT_SUBJECT, chatBody()) : `mailto:${D.email}`);
  const chatMailto = () => (api().mailtoUrl ? api().mailtoUrl(CHAT_SUBJECT, chatBody()) : `mailto:${D.email}`);
  document.querySelectorAll('[data-coffee-chat]').forEach((a) => {
    a.href = chatHref();
    a.target = '_blank';
    a.rel = 'noopener';
  });
  document.querySelectorAll('[data-coffee-chat-mailto]').forEach((a) => (a.href = chatMailto()));

  /* ---------- UPI ---------- */
  let amount = C.sizes && C.sizes[1] ? C.sizes[1].amount : 0; // default: the middle size
  const upiLink = () => {
    // `pa` stays literal (validated above): some UPI apps don't decode %40 in the payee address
    const q = [`pa=${vpa}`, `pn=${encodeURIComponent(C.payee || D.name)}`, 'cu=INR', `tn=${encodeURIComponent('Coffee for Deepak')}`];
    if (amount) q.push(`am=${amount}`);
    return 'upi://pay?' + q.join('&');
  };

  // the QR library is only fetched the first time the dialog opens
  let qrLib = null;
  const loadQr = () =>
    qrLib ||
    (qrLib = new Promise((res, rej) => {
      if (window.qrcode) return res(window.qrcode);
      const s = document.createElement('script');
      s.src = 'vendor/qrcode.js';
      s.onload = () => res(window.qrcode);
      s.onerror = rej;
      document.head.appendChild(s);
    }));

  const qrBox = dlg.querySelector('.cafe__qr');
  const payBtn = dlg.querySelector('[data-upi-pay]');
  const amountEl = dlg.querySelector('[data-upi-amount]');
  const drawQr = () =>
    loadQr().then((qrcode) => {
      const qr = qrcode(0, 'M');
      qr.addData(upiLink());
      qr.make();
      const n = qr.getModuleCount();
      let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
      // built from module coordinates only, so it's safe to inject
      // 4-module white quiet zone, as the QR spec asks, so phone cameras lock on reliably
      qrBox.innerHTML = `<svg viewBox="-4 -4 ${n + 8} ${n + 8}" role="img" aria-label="UPI QR code to pay ${amount ? '₹' + amount : 'any amount'}"><rect x="-4" y="-4" width="${n + 8}" height="${n + 8}" fill="#fff"/><path d="${d}" fill="#121110"/></svg>`;
    }).catch(() => { qrBox.textContent = 'QR unavailable. Use the UPI ID below.'; });

  const refresh = () => {
    if (!upiReady) return;
    payBtn.href = upiLink();
    amountEl.textContent = amount ? `₹${amount}` : 'any amount';
    dlg.querySelectorAll('[data-size]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.size === amount)));
    drawQr();
  };

  if (upiReady) {
    const sizes = dlg.querySelector('.cafe__sizes');
    [...(C.sizes || []), { name: 'Any amount', amount: 0 }].forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.size = s.amount;
      b.innerHTML = '<span></span><b></b>';
      b.firstChild.textContent = s.name;
      b.lastChild.textContent = s.amount ? `₹${s.amount}` : 'you choose';
      b.addEventListener('click', () => { amount = s.amount; refresh(); });
      sizes.appendChild(b);
    });
    dlg.querySelector('[data-upi-id]').textContent = vpa;
    dlg.querySelector('[data-upi-copy]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(vpa); api().toast && api().toast('UPI ID copied ☕'); } catch (e) {}
    });
  }

  /* ---------- Dialog ---------- */
  let last = null;
  const isOpen = () => dlg.classList.contains('is-open');
  function open() {
    if (!upiReady) { window.open(chatHref(), '_blank', 'noopener'); return; } // nothing to pay into yet: go straight to the chat
    if (isOpen()) return;
    last = document.activeElement;
    dlg.hidden = false;
    void dlg.offsetWidth;
    dlg.classList.add('is-open');
    api().lockScroll && api().lockScroll('cafe', true);
    refresh();
    dlg.querySelector('.cafe__panel').focus({ preventScroll: true });
  }
  function close() {
    if (!isOpen()) return;
    dlg.classList.remove('is-open');
    api().lockScroll && api().lockScroll('cafe', false);
    setTimeout(() => { if (!isOpen()) dlg.hidden = true; }, 350);
    last && last.focus && last.focus({ preventScroll: true });
  }
  dlg.addEventListener('click', (e) => { if (e.target.closest('[data-cafe-close]')) close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key !== 'Tab') return;
    const f = [...dlg.querySelectorAll('a[href], button')].filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  document.querySelectorAll('[data-coffee-buy]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); open(); }));

  window.DKB_COFFEE = { open, upiReady, chatHref, chatMailto, vpa };
})();
