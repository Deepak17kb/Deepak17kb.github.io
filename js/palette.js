/* =========================================================
   Command palette — Ctrl/⌘ K (or "/") from anywhere:
   jump to sections, copy email, grab the CV, open demos.
   ========================================================= */
(() => {
  const pal = document.querySelector('.palette');
  if (!pal) return;

  const D = window.DKB_DATA || {};
  const api = window.DKB || {};
  const input = pal.querySelector('.palette__input');
  const list = pal.querySelector('.palette__list');
  const isMac = /Mac|iPhone|iPad/i.test(navigator.userAgentData ? navigator.userAgentData.platform : navigator.platform || navigator.userAgent);
  document.querySelectorAll('[data-kbd-mod]').forEach((el) => (el.textContent = isMac ? '⌘' : 'Ctrl'));

  const openUrl = (url) => window.open(url, '_blank', 'noopener');
  const download = () => {
    const a = document.createElement('a');
    a.href = D.cv;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const go = (id, opts) => api.scrollTo && api.scrollTo(id, opts);
  const runInTerminal = (c) => {
      go('#terminal', { offset: -80 });
      setTimeout(() => { if (window.DKB_TERM) { window.DKB_TERM.run(c); window.DKB_TERM.focus(); } }, 1100);
    };

  const items = [
    ...(D.sections || []).map((s) => ({ group: 'Go to', label: s.label, hint: '#' + s.id, keys: s.id, run: () => go('#' + s.id, s.id === 'terminal' ? { offset: -80 } : undefined) })),
    { group: 'Go to', label: 'Back to top', hint: '#top', keys: 'home hero start', run: () => go('#top') },
    { group: 'Actions', label: 'Copy email address', hint: D.email, keys: 'mail contact hire', run: () => api.copyEmail() },
    { group: 'Actions', label: 'Download CV', hint: 'PDF', keys: 'resume cv', run: download },
    { group: 'Actions', label: 'Toggle dark / light mode', hint: 'theme', keys: 'theme night day', run: () => api.toggleTheme() },
    {
      group: 'Actions', label: 'Open the terminal', hint: 'shell', keys: 'cli console command',
      run: () => {
        go('#terminal', { offset: -80 });
        setTimeout(() => window.DKB_TERM && window.DKB_TERM.focus(), 1200);
      },
    },
    { group: 'Actions', label: 'Generate a maze in the Path Lab', hint: 'A* · Dijkstra', keys: 'graph lab pathfinding', run: () => { go('#lab'); document.querySelector('[data-lab="maze"]')?.click(); } },
    { group: 'Actions', label: 'TL;DR — the 30-second version', hint: 'résumé', keys: 'tldr summary recruiter quick short resume cv', run: () => window.DKB_TLDR && window.DKB_TLDR.open() },
    { group: 'Actions', label: 'Print a one-page résumé', hint: 'PDF', keys: 'print pdf resume cv save', run: () => window.DKB_TLDR && window.DKB_TLDR.print() },
    { group: 'Actions', label: 'Latest pushes, live from GitHub', hint: 'git log', keys: 'git log commits activity github live', run: () => runInTerminal('git log') },
    { group: 'Actions', label: 'Play snake in the terminal', hint: 'game', keys: 'snake game play fun', run: () => runInTerminal('snake') },
    { group: 'Actions', label: 'Make it rain coffee', hint: '☕', keys: 'coffee easter egg konami', run: () => api.coffeeRain() },
    ...(D.projects || []).map((p) => ({ group: 'Projects', label: p.name, hint: p.demo ? 'live demo ↗' : 'GitHub ↗', keys: p.what, run: () => openUrl(p.demo || p.code) })),
    { group: 'Elsewhere', label: 'GitHub', hint: '↗', keys: 'code repos', run: () => openUrl(D.links.github) },
    { group: 'Elsewhere', label: 'LinkedIn', hint: '↗', keys: 'profile', run: () => openUrl(D.links.linkedin) },
    ...(window.DKB_COFFEE && window.DKB_COFFEE.upiReady
      ? [{ group: 'Elsewhere', label: 'Buy me a coffee (UPI)', hint: 'QR ☕', keys: 'support donate tip upi pay', run: () => window.DKB_COFFEE.open() }]
      : []),
    { group: 'Elsewhere', label: 'Virtual coffee chat', hint: 'email', keys: 'coffee chat meet talk job internship hire', run: () => openUrl(window.DKB_COFFEE ? window.DKB_COFFEE.chatHref() : 'mailto:' + D.email) },
  ];

  // prefix > word start > substring (label or keywords) > loose subsequence (label only)
  const score = (it, q) => {
    if (!q) return 1;
    const label = it.label.toLowerCase();
    if (label.startsWith(q)) return 4;
    if (label.split(/\s+/).some((w) => w.startsWith(q))) return 3;
    if (`${label} ${it.keys || ''}`.toLowerCase().includes(q)) return 2;
    let i = 0;
    for (const ch of label) if (ch === q[i]) i++;
    return i === q.length ? 1 : 0;
  };

  let shown = [];
  let active = 0;

  function render() {
    const q = input.value.trim().toLowerCase();
    shown = items
      .map((it, i) => ({ it, i, s: score(it, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => (q ? b.s - a.s : 0) || a.i - b.i)
      .map((x) => x.it);
    list.textContent = '';
    let group = null;
    shown.forEach((it, k) => {
      // group headings only when browsing; a search is ranked, so groups would interleave
      if (!q && it.group !== group) {
        group = it.group;
        const h = document.createElement('li');
        h.className = 'palette__group';
        h.setAttribute('role', 'presentation');
        h.textContent = group;
        list.appendChild(h);
      }
      const li = document.createElement('li');
      li.id = 'pal-opt-' + k;
      li.className = 'palette__item';
      li.setAttribute('role', 'option');
      const label = document.createElement('span');
      label.className = 'palette__label';
      label.textContent = it.label;
      const hint = document.createElement('span');
      hint.className = 'palette__hint mono';
      hint.textContent = it.hint || '';
      li.append(label, hint);
      li.addEventListener('pointermove', () => active !== k && setActive(k, false));
      li.addEventListener('click', () => choose(k));
      list.appendChild(li);
    });
    if (!shown.length) {
      const li = document.createElement('li');
      li.className = 'palette__empty';
      li.textContent = 'Nothing matches. Try “cv”, “dark” or “github”.';
      list.appendChild(li);
    }
    setActive(0, true);
  }

  function setActive(k, scroll = true) {
    if (!shown.length) return input.removeAttribute('aria-activedescendant');
    active = (k + shown.length) % shown.length;
    list.querySelectorAll('.palette__item').forEach((el, i) => el.setAttribute('aria-selected', String(i === active)));
    const el = document.getElementById('pal-opt-' + active);
    input.setAttribute('aria-activedescendant', el.id);
    if (scroll) el.scrollIntoView({ block: 'nearest' });
  }

  let lastFocus = null;
  let hideTimer;
  const isOpen = () => pal.classList.contains('is-open');

  function show() {
    if (isOpen()) return;
    clearTimeout(hideTimer);
    lastFocus = document.activeElement;
    pal.hidden = false;
    void pal.offsetWidth; // commit the closed state so the open transition runs
    pal.classList.add('is-open');
    input.value = '';
    render();
    input.focus({ preventScroll: true });
    api.lockScroll && api.lockScroll('palette', true);
  }

  function hide() {
    if (!isOpen()) return;
    pal.classList.remove('is-open');
    api.lockScroll && api.lockScroll('palette', false);
    hideTimer = setTimeout(() => (pal.hidden = true), 350);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function choose(k) {
    const it = shown[k];
    if (!it) return;
    hide();
    it.run();
  }

  const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      isOpen() ? hide() : show();
    } else if (e.key === '/' && !isOpen() && !typing(e.target)) {
      e.preventDefault();
      show();
    }
  });

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hide(); }
    else if (e.key === 'Tab') e.preventDefault(); // keep focus inside the dialog
  });
  pal.addEventListener('click', (e) => e.target.closest('[data-palette-close]') && hide());
  document.querySelectorAll('[data-palette-open]').forEach((b) => b.addEventListener('click', show));
})();
