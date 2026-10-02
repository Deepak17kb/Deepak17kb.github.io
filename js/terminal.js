/* =========================================================
   Terminal — the whole portfolio as a tiny shell.
   Reads from DKB_DATA; actions go through window.DKB.
   ========================================================= */
(() => {
  const term = document.querySelector('.term');
  if (!term) return;

  const D = window.DKB_DATA || {};
  const api = window.DKB || {};
  const out = term.querySelector('.term__out');
  const form = term.querySelector('.term__form');
  const input = term.querySelector('.term__input');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PROMPT = 'deepak@lpu:~$';

  const history = [];
  let hIdx = 0;

  /* ---------- Output helpers (only trusted strings become HTML) ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const acc = (s) => `<span class="t-acc">${s}</span>`;
  const dim = (s) => `<span class="t-dim">${s}</span>`;
  const ok = (s) => `<span class="t-ok">${s}</span>`;
  const err = (s) => `<span class="t-err">${s}</span>`;
  const link = (href, label) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`;
  const cmd = (c) => `<button type="button" class="t-cmd" data-cmd="${esc(c)}">${esc(c)}</button>`;
  const pad = (s, n) => s + ' '.repeat(Math.max(1, n - s.length));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Lines print one after another so output "types" in, without blocking input
  let queue = Promise.resolve();
  const print = (lines, cls = '') => {
    lines = [].concat(lines);
    queue = queue.then(async () => {
      for (const l of lines) {
        const div = document.createElement('div');
        div.className = 't-line' + (cls ? ' ' + cls : '');
        if (l instanceof Node) div.appendChild(l);
        else div.innerHTML = l === '' ? '&nbsp;' : l;
        out.appendChild(div);
        out.scrollTop = out.scrollHeight;
        if (!reduced && lines.length < 40) await wait(16);
      }
    });
    return queue;
  };
  const echo = (text) => {
    const frag = document.createDocumentFragment();
    const p = document.createElement('span');
    p.className = 't-prompt';
    p.textContent = PROMPT + ' ';
    frag.append(p, document.createTextNode(text));
    return print(frag, 't-echo');
  };

  const openUrl = (url) => window.open(url, '_blank', 'noopener');
  const download = () => {
    const a = document.createElement('a');
    a.href = D.cv;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const findProject = (q) => {
    q = q.toLowerCase();
    return (D.projects || []).find((p) => p.key === q || p.name.toLowerCase().includes(q));
  };
  const narrow = () => out.clientWidth < 520;

  /* ---------- Commands ---------- */
  const whoami = () => [
    acc(esc(D.name)),
    `CSE undergrad at Lovely Professional University · CGPA ${esc(D.cgpa)}`,
    'From Bhubaneswar, Odisha. Builds AI agents, full-stack apps and data stories.',
    `Thinks in graphs. Status: ${ok('open to internships')}`,
  ];
  const trophies = () => [
    acc('Achievements'),
    ...D.achievements.map((a) => `  ${acc(pad(a.rank, 8))}${esc(a.title)} ${dim('— ' + esc(a.event))}${a.when ? '  ' + dim(esc(a.when)) : ''}`),
  ];
  const contact = () => [
    acc('Say hi'),
    `  email     ${link('mailto:' + D.email, D.email)}  ${dim('(or run')} ${cmd('email')} ${dim('to copy it)')}`,
    `  linkedin  ${link(D.links.linkedin, D.links.linkedin.replace('https://', ''))}`,
    `  github    ${link(D.links.github, D.links.github.replace('https://', ''))}`,
    `  cv        ${cmd('cv')}`,
  ];
  const hireMe = () => {
    print([
      `${dim('[sudo] password for recruiter:')} ********`,
      ok('✓ Access granted. Good call.'),
      'Scrolling you to the contact form, and the email is on your clipboard.',
    ]);
    api.copyEmail && api.copyEmail();
    setTimeout(() => api.scrollTo && api.scrollTo('#contact'), 900);
  };

  const COMMANDS = {
    help: {
      desc: 'list everything I understand',
      run: () => [
        'Commands:',
        ...Object.entries(COMMANDS)
          .filter(([, c]) => !c.hidden)
          .map(([k, c]) => `  ${cmd(k)}${' '.repeat(Math.max(1, 14 - k.length))}${dim(esc(c.desc))}`),
        '',
        dim('↑/↓ history · Tab autocomplete · Ctrl+L clear. Feeling bold? Try ') + cmd('sudo hire-me'),
      ],
    },
    whoami: { desc: 'the short version', run: whoami },
    neofetch: {
      desc: 'system info, but it is me',
      run: () => {
        const art = String.raw`    _                    _
 __| |___ ___ _ __  __ _| |__
/ _${'`'} / -_) -_) '_ \/ _${'`'} | / /
\__,_\___\___| .__/\__,_|_\_\
             |_|`.split('\n');
        const info = [
          `${acc('deepak')}@${acc('lpu')}`,
          dim('-----------'),
          `${acc('OS')}      B.Tech CSE @ LPU (2024 → now)`,
          `${acc('CGPA')}    ${esc(D.cgpa)}`,
          `${acc('Shell')}   TypeScript · C++ · Python`,
          `${acc('Wins')}    #1 AgentIQ Datathon`,
          `        Top 10 Algo Arena · Top 30 CodeXtreme`,
          `${acc('Uptime')}  150+ DSA problems and counting`,
          `${acc('Status')}  ${ok('open to internships')}`,
          `${acc('Fuel')}    chai, ∞`,
        ];
        if (narrow()) return [...art.map((l) => acc(esc(l))), '', ...info];
        return Array.from({ length: Math.max(art.length, info.length) }, (_, i) => acc(esc(pad(art[i] || '', 32))) + (info[i] || ''));
      },
    },
    projects: {
      desc: 'things I have shipped',
      run: () => [
        acc('Projects') + dim('  (open <name> to launch one)'),
        ...D.projects.flatMap((p, i) => [
          `  ${dim(String(i + 1).padStart(2, '0'))} ${acc(esc(p.name))} ${dim('— ' + esc(p.what))}`,
          `     ${p.stack ? dim(esc(p.stack)) + '  ' : ''}${p.demo ? link(p.demo, 'demo ↗') + ' ' : ''}${p.code ? link(p.code, 'code ↗') : ''}`,
        ]),
      ],
    },
    open: {
      desc: 'open <project | github | linkedin | cv>',
      run: (args) => {
        const q = args[0];
        if (!q) return ['usage: open <name>   e.g. ' + cmd('open broadbridge')];
        if (q === 'github' || q === 'linkedin') { openUrl(D.links[q]); return [ok(`opening ${q} ↗`)]; }
        if (q === 'cv' || q === 'resume') { download(); return [ok('downloading the CV…')]; }
        const p = findProject(args.join(' '));
        if (!p) return [err(`open: no project called "${esc(args.join(' '))}".`) + ' Try ' + cmd('projects')];
        openUrl(p.demo || p.code);
        return [ok(`opening ${esc(p.name)} ${p.demo ? 'demo' : 'repo'} ↗`)];
      },
    },
    achievements: { desc: 'the trophy shelf', run: trophies },
    education: {
      desc: 'degrees and grades',
      run: () => [acc('Education'), ...D.education.flatMap((e) => [`  ${esc(e.what)} · ${acc(esc(e.score))}`, `  ${dim(esc(e.where) + ' · ' + esc(e.when))}`])],
    },
    experience: {
      desc: 'training & simulations',
      run: () => [acc('Experience'), ...D.experience.flatMap((e) => [`  ${esc(e.what)} ${dim('@ ' + esc(e.where) + ' · ' + esc(e.when))}`, `  ${dim('↳ ' + esc(e.note))}`])],
    },
    skills: {
      desc: 'languages, frameworks, tools',
      run: () => [acc('Skills'), ...Object.entries(D.skills).map(([k, v]) => `  ${acc(pad(k, 11))}${esc(v)}`)],
    },
    certs: {
      desc: 'certifications',
      run: () => [acc(`Certifications (${D.certs.length})`), ...D.certs.map((c) => `  ${esc(c.name)} ${dim('— ' + esc(c.by) + (c.when ? ', ' + esc(c.when) : ''))}`)],
    },
    contact: { desc: 'how to reach me', run: contact },
    email: {
      desc: 'copy my email address',
      run: () => { api.copyEmail && api.copyEmail(); return [ok(`✓ ${esc(D.email)} copied to clipboard`)]; },
    },
    cv: { desc: 'download my résumé (PDF)', run: () => { download(); return [ok('downloading Deepak-Kumar-Behera-CV.pdf…')]; } },
    theme: {
      desc: 'theme [light | dark]',
      run: (args) => {
        const now = document.documentElement.getAttribute('data-theme');
        const want = args[0];
        if (want && want !== 'light' && want !== 'dark') return ['usage: theme [light | dark]'];
        if (want === now) return [dim(`already ${now}.`)];
        api.toggleTheme && api.toggleTheme();
        return [ok(`✓ switched to ${want || (now === 'dark' ? 'light' : 'dark')} mode`)];
      },
    },
    goto: {
      desc: 'scroll to a section',
      run: (args) => {
        const ids = D.sections.map((s) => s.id);
        const id = (args[0] || '').replace('#', '');
        if (!ids.includes(id) && id !== 'top') return [`usage: goto <${ids.join(' | ')} | top>`];
        api.scrollTo && api.scrollTo('#' + id);
        return [ok(`→ ${id}`)];
      },
    },
    coffee: {
      desc: 'fuel the next commit',
      run: () => { api.coffeeRain && api.coffeeRain(); return ['☕ ' + link(D.links.coffee, 'buymeacoffee.com/deepak17kb')]; },
    },
    date: {
      desc: 'what time is it in Punjab',
      run: () => [new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date()) + ' ' + dim('IST')],
    },
    ls: {
      desc: 'list files',
      run: (args) =>
        args[0] && args[0].replace(/\/$/, '') === 'projects'
          ? [D.projects.map((p) => acc(p.key)).join('  ')]
          : [`${cmd('cat about.txt')}  ${acc('projects/')}  ${cmd('cat trophies.md')}  ${cmd('cat contact.vcf')}  cv.pdf`],
    },
    cat: {
      desc: 'read a file',
      run: (args) => {
        const f = args[0] || '';
        if (f === 'about.txt') return whoami();
        if (f === 'trophies.md') return trophies();
        if (f === 'contact.vcf') return contact();
        if (f === 'cv.pdf') return [dim('binary file. try ') + cmd('cv') + dim(' to download it')];
        if (f.startsWith('projects')) return [`cat: ${esc(f)}: Is a directory`];
        return [f ? err(`cat: ${esc(f)}: No such file`) : 'usage: cat <file>   (see ' + cmd('ls') + ')'];
      },
    },
    history: { desc: 'what you typed', run: () => (history.length ? history.map((h, i) => `  ${dim(String(i + 1).padStart(3))}  ${esc(h)}`) : [dim('nothing yet')]) },
    clear: { desc: 'wipe the screen', run: () => { out.textContent = ''; return []; } },

    // hidden extras
    echo: { hidden: true, run: (args, raw) => [esc(raw.replace(/^echo\s*/, ''))] },
    sudo: {
      hidden: true,
      run: (args) => {
        if (args.join(' ') === 'hire-me') { hireMe(); return []; }
        return [err('deepak is not in the sudoers file. This incident will be reported.') + dim(' (to a recruiter, hopefully)')];
      },
    },
    'hire-me': { hidden: true, run: () => [err('permission denied.') + ' try ' + cmd('sudo hire-me')] },
    rm: { hidden: true, run: () => [err('rm: permission denied.') + dim(' Also, rude.')] },
    exit: { hidden: true, run: () => ['There is no escape. But there is ' + cmd('contact') + '.'] },
    hi: { hidden: true, run: () => ['Hey! 👋 Type ' + cmd('help') + ' to look around.'] },
    hello: { hidden: true, run: () => COMMANDS.hi.run() },
    resume: { hidden: true, run: () => COMMANDS.cv.run() },
    trophies: { hidden: true, run: trophies },
    about: { hidden: true, run: whoami },
    pwd: { hidden: true, run: () => ['/home/deepak/portfolio'] },
  };

  const execute = (raw) => {
    const line = raw.trim();
    echo(line);
    if (!line) return;
    history.push(line);
    hIdx = history.length;
    const [name, ...rest] = line.split(/\s+/);
    const args = rest.map((a) => a.toLowerCase());
    const c = COMMANDS[name.toLowerCase()];
    if (!c) return print(`${err('command not found:')} ${esc(name)}. Type ${cmd('help')}.`);
    const lines = c.run(args, line);
    if (lines && lines.length) print(lines);
  };

  /* ---------- Input ---------- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    execute(input.value);
    input.value = '';
  });

  const complete = () => {
    const v = input.value;
    const parts = v.split(/\s+/);
    let pool;
    if (parts.length === 1) pool = Object.keys(COMMANDS).filter((k) => !COMMANDS[k].hidden || k === 'sudo');
    else if (parts[0] === 'open') pool = [...D.projects.map((p) => p.key), 'github', 'linkedin', 'cv'];
    else if (parts[0] === 'goto') pool = [...D.sections.map((s) => s.id), 'top'];
    else if (parts[0] === 'theme') pool = ['light', 'dark'];
    else if (parts[0] === 'cat') pool = ['about.txt', 'trophies.md', 'contact.vcf', 'cv.pdf'];
    else if (parts[0] === 'sudo') pool = ['hire-me'];
    else return;
    const last = parts[parts.length - 1].toLowerCase();
    const hits = pool.filter((p) => p.startsWith(last));
    if (hits.length === 1) {
      parts[parts.length - 1] = hits[0];
      input.value = parts.join(' ') + (parts.length === 1 ? ' ' : '');
    } else if (hits.length > 1) {
      echo(v);
      print(hits.map((h) => acc(h)).join('  '));
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      complete();
    } else if (e.key === 'ArrowUp') {
      if (!history.length) return;
      e.preventDefault();
      hIdx = Math.max(0, hIdx - 1);
      input.value = history[hIdx];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      hIdx = Math.min(history.length, hIdx + 1);
      input.value = history[hIdx] || '';
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      out.textContent = '';
    } else if (e.key === 'c' && e.ctrlKey && input.selectionStart === input.selectionEnd) {
      // Ctrl+C with nothing selected interrupts, like a real shell
      echo(input.value + '^C');
      input.value = '';
    }
  });

  // Clickable commands (chips + anything printed as a command)
  term.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cmd]');
    if (b) {
      execute(b.dataset.cmd);
      input.focus({ preventScroll: true });
      return;
    }
    // Click on empty terminal space focuses the prompt (unless selecting text or following a link)
    if (!e.target.closest('a') && !String(window.getSelection())) input.focus({ preventScroll: true });
  });

  /* ---------- Boot once it's on screen ---------- */
  const boot = () =>
    print([
      dim(`deepak-sh 1.0 · last login: ${new Date().toDateString()} on your browser`),
      `Welcome. Type ${cmd('help')} or tap a command below.`,
      '',
    ]);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      boot();
    }, { threshold: 0.3 });
    io.observe(term);
  } else {
    boot();
  }
})();
