/* =========================================================
   TL;DR — the whole portfolio on one screen, built from DKB_DATA.
   It is also the print layout: Ctrl/⌘ P anywhere prints this sheet
   as a one-page résumé.
   ========================================================= */
(() => {
  const root = document.querySelector('.tldr');
  const D = window.DKB_DATA;
  if (!root || !D) return;

  const sheet = root.querySelector('.tldr__sheet');
  const api = () => window.DKB || {};

  // tiny element builder: h('p.cls', 'text') / h('ul', [children])
  const h = (sel, kids) => {
    const [tag, ...cls] = sel.split('.');
    const n = document.createElement(tag);
    if (cls.length) n.className = cls.join(' ');
    [].concat(kids == null ? [] : kids).forEach((k) => n.append(k instanceof Node ? k : document.createTextNode(k)));
    return n;
  };
  const a = (href, text, cls) => {
    const n = h('a' + (cls ? '.' + cls : ''), text);
    n.href = href;
    if (/^https?:/.test(href)) { n.target = '_blank'; n.rel = 'noopener'; }
    return n;
  };
  const strip = (u) => u.replace(/^https?:\/\//, '').replace(/\/$/, '');

  let built = false;
  function build() {
    if (built) return;
    built = true;
    const edu = D.education[0];
    const featured = D.projects.filter((p) => p.featured);

    const head = h('header.tldr__head', [
      h('div', [
        h('p.tldr__kicker.mono', 'TL;DR · 30-second version'),
        h('h2.tldr__name', D.name),
        h('p.tldr__role', `${edu.what} · ${edu.where.split(',')[0]} · ${edu.when} · ${edu.score}`),
      ]),
      h('ul.tldr__contact.mono', [
        h('li', a('mailto:' + D.email, D.email)),
        h('li', a(D.links.linkedin, strip(D.links.linkedin))),
        h('li', a(D.links.github, strip(D.links.github))),
        h('li', a(D.site, strip(D.site))),
      ]),
    ]);
    head.querySelector('h2').id = 'tldr-title';

    const one = h('p.tldr__one', D.oneLiner);

    const wins = h('section.tldr__block', [
      h('h3.mono', 'Highlights'),
      h('ul.tldr__wins', D.achievements.map((w) =>
        h('li', [h('b.mono', w.rank), h('span', [h('strong', w.title), ` · ${w.event}${w.when ? ' · ' + w.when : ''}`])])
      )),
    ]);

    const projects = h('section.tldr__block.tldr__projects', [
      h('h3.mono', 'Selected projects'),
      h('ul', featured.map((p) => {
        const links = h('span.tldr__links.mono', []);
        if (p.demo) links.append(a(p.demo, 'live ↗'));
        if (p.code) links.append(a(p.code, 'code ↗'));
        return h('li', [
          h('div.tldr__ptop', [h('strong', p.name), h('span.mono.tldr__when', `${p.when}${p.team ? ' · team' : ''}`), links]),
          h('p', p.what),
          h('p.tldr__metrics.mono', p.metrics.join('  ·  ')),
          h('p.tldr__stack.mono', p.stack),
        ]);
      })),
      h('p.tldr__more.mono', 'Also: ' + D.projects.filter((p) => !p.featured).map((p) => p.name).join(' · ')),
    ]);

    const exp = h('section.tldr__block', [
      h('h3.mono', 'Experience & training'),
      h('ul.tldr__list', D.experience.map((e) => h('li', [h('strong', e.what), ` · ${e.where} · ${e.when}`, h('span.tldr__note', e.note)]))),
    ]);

    const skills = h('section.tldr__block', [
      h('h3.mono', 'Skills'),
      h('dl.tldr__skills', Object.entries(D.skills).map(([k, v]) => h('div', [h('dt.mono', k), h('dd', v)]))),
    ]);

    const certs = h('section.tldr__block', [
      h('h3.mono', 'Certifications'),
      h('ul.tldr__list', D.certs.map((c) => h('li', [h('strong', c.name), ` · ${c.by}${c.when ? ' · ' + c.when : ''}`]))),
    ]);

    const foot = h('p.tldr__foot.mono', `Live portfolio: ${strip(D.site)} · sheet generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`);

    sheet.append(head, one, h('div.tldr__grid', [h('div', [wins, projects]), h('div', [exp, skills, certs])]), foot);
  }

  /* ---------- Open / close as a dialog ---------- */
  let lastFocus = null;
  const isOpen = () => !root.hidden && root.classList.contains('is-open');
  function open() {
    build();
    if (isOpen()) return;
    lastFocus = document.activeElement;
    root.hidden = false;
    void root.offsetWidth;
    root.classList.add('is-open');
    api().lockScroll && api().lockScroll('tldr', true);
    root.querySelector('.tldr__panel').focus({ preventScroll: true });
  }
  function close() {
    if (!isOpen()) return;
    root.classList.remove('is-open');
    api().lockScroll && api().lockScroll('tldr', false);
    setTimeout(() => { if (!root.classList.contains('is-open')) root.hidden = true; }, 350);
    lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-tldr-close]')) close();
    else if (e.target.closest('[data-tldr-print]')) window.print();
    else if (e.target.closest('[data-tldr-copy]')) api().copyEmail && api().copyEmail();
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key !== 'Tab') return;
    // keep focus inside the dialog
    const f = [...root.querySelectorAll('a[href], button, [tabindex="0"]')].filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.querySelectorAll('[data-tldr-open]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); open(); }));

  // Printing from anywhere prints the sheet, so make sure it exists first
  window.addEventListener('beforeprint', build);

  window.DKB_TLDR = { open, close, print: () => { build(); window.print(); } };
})();
