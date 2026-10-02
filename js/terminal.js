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
    `Thinks in graphs. Status: ${ok('open to work')} ${dim('(jobs & internships)')}`,
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
          `${acc('Status')}  ${ok('open to work: jobs & internships')}`,
          `${acc('Fuel')}    coffee, ∞`,
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
      run: () => {
        api.coffeeRain && api.coffeeRain();
        const c = window.DKB_COFFEE;
        const lines = [acc('☕ coffee, two ways')];
        if (c && c.upiReady) lines.push(`  buy one   ${cmd('buy coffee')} ${dim('(UPI QR, any UPI app)')}`);
        lines.push(`  chat      ${link(c ? c.chatHref() : 'mailto:' + D.email, 'virtual coffee chat')} ${dim('(jobs, internships, projects)')}`);
        return lines;
      },
    },
    buy: {
      hidden: true,
      run: (args) => {
        const c = window.DKB_COFFEE;
        if (args[0] !== 'coffee') return ['usage: ' + cmd('buy coffee')];
        if (!c || !c.upiReady) return [dim('UPI is not set up yet. ') + link(c ? c.chatHref() : 'mailto:' + D.email, 'Grab a virtual coffee chat instead →')];
        c.open();
        return [ok('opening the coffee counter…')];
      },
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
    tldr: {
      desc: 'the 30-second version (printable)',
      run: () => { window.DKB_TLDR && window.DKB_TLDR.open(); return [ok('opening the TL;DR… (Ctrl/⌘ P prints it)')]; },
    },
    git: {
      desc: 'git log: my latest pushes, live',
      run: (args) => {
        if (args[0] !== 'log') return ['usage: ' + cmd('git log')];
        gitLog();
        return [];
      },
    },
    snake: { desc: 'a game. eat the bugs.', run: () => startSnake() },

    // hidden extras
    echo: { hidden: true, run: (args, raw) => [esc(raw.replace(/^echo\s*/, ''))] },
    sudo: {
      hidden: true,
      run: (args) => {
        if (args.join(' ') === 'hire-me') { hireMe(); return []; }
        if (/^rm -(rf|fr) \/\*?$/.test(args.join(' '))) return crumble();
        return [err('deepak is not in the sudoers file. This incident will be reported.') + dim(' (to a recruiter, hopefully)')];
      },
    },
    'hire-me': { hidden: true, run: () => [err('permission denied.') + ' try ' + cmd('sudo hire-me')] },
    rm: { hidden: true, run: () => [err('rm: permission denied.') + dim(' Also, rude. (sudo exists, if you dare)')] },
    print: { hidden: true, run: () => { window.DKB_TLDR && window.DKB_TLDR.print(); return [ok('sending the TL;DR to the printer…')]; } },
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

  /* ---------- git log: real pushes from the public GitHub API ---------- */
  function gitLog() {
    const gh = window.DKB_GH;
    if (!gh) return print(err('git: GitHub module not loaded'));
    print(dim(`$ curl api.github.com/users/${gh.user}/events …`));
    gh.pushes()
      .then((list) => {
        if (!list.length) return print(dim('no public pushes in the last 90 days.'));
        print([
          ...list.slice(0, 12).map((p) => `${acc(esc(p.sha || '·······'))}  ${dim(esc(pad(gh.ago(p.at), 16)))}${esc(p.repo)} ${dim('(' + esc(p.branch) + ')')}`),
          dim(`… ${list.length} pushes in the last 90 days of public activity · `) + link(`https://github.com/${gh.user}`, 'github.com/' + gh.user),
        ]);
      })
      .catch(() => print(err('fatal: could not reach GitHub') + dim(' (offline or rate-limited, try again in a minute)')));
  }

  /* ---------- snake: a small game inside the shell ---------- */
  let game = null;
  const best = () => { try { return +localStorage.getItem('dkb-snake') || 0; } catch (e) { return 0; } };
  function startSnake() {
    if (game) return [dim('already playing. q to quit.')];
    const W = narrow() ? 16 : 26, H = narrow() ? 11 : 12;
    // board = a grid of cells (box-drawing glyphs aren't in the self-hosted font subset, so text would misalign)
    const pre = document.createElement('div');
    pre.className = 't-game';
    pre.setAttribute('role', 'img');
    pre.setAttribute('aria-label', 'Snake game. Arrow keys or W A S D to steer, space to pause, Q to quit.');
    pre.style.setProperty('--cols', W);
    const board = document.createElement('div');
    board.className = 't-game__board';
    const cells = Array.from({ length: W * H }, () => board.appendChild(document.createElement('i')));
    const status = document.createElement('div');
    status.className = 't-game__status';
    pre.append(board, status);
    const s = { body: [[4, 5], [3, 5], [2, 5]], dir: [1, 0], next: [1, 0], food: null, score: 0, speed: 150, timer: 0, paused: false };
    const free = () => {
      for (;;) {
        const f = [Math.floor(Math.random() * W), Math.floor(Math.random() * H)];
        if (!s.body.some(([x, y]) => x === f[0] && y === f[1])) return f;
      }
    };
    s.food = free();
    const render = () => {
      cells.forEach((c) => (c.className = ''));
      s.body.forEach(([x, y], i) => (cells[y * W + x].className = i ? 'g-s' : 'g-h'));
      cells[s.food[1] * W + s.food[0]].className = 'g-f';
      status.textContent = `score ${s.score}   best ${Math.max(best(), s.score)}${s.paused ? '   ‖ paused' : ''}`;
    };
    const io = new IntersectionObserver(([e]) => {
      if (!game) return;
      s.paused = !e.isIntersecting; // pause while the terminal is off-screen
      render();
      clearTimeout(s.timer);
      if (!s.paused) s.timer = setTimeout(step, s.speed);
    }, { threshold: 0.3 });
    const end = () => {
      clearTimeout(s.timer);
      io.disconnect();
      const prev = best();
      if (s.score > prev) { try { localStorage.setItem('dkb-snake', String(s.score)); } catch (e) {} }
      game = null;
      print([
        err('✕ game over') + `  score ${s.score}` + (s.score > prev ? ok('  ★ new best') : dim(`  best ${prev}`)),
        dim('again? ') + cmd('snake'),
      ]);
    };
    function step() {
      if (s.paused || !game) return;
      s.dir = s.next;
      const head = [s.body[0][0] + s.dir[0], s.body[0][1] + s.dir[1]];
      const hit = head[0] < 0 || head[1] < 0 || head[0] >= W || head[1] >= H || s.body.some(([x, y]) => x === head[0] && y === head[1]);
      if (hit) return end();
      s.body.unshift(head);
      if (head[0] === s.food[0] && head[1] === s.food[1]) {
        s.score++;
        s.speed = Math.max(70, s.speed - 5);
        s.food = free();
      } else s.body.pop();
      render();
      s.timer = setTimeout(step, s.speed);
    }
    const turn = (dx, dy) => {
      if (dx === -s.dir[0] && dy === -s.dir[1]) return; // no reversing into yourself
      s.next = [dx, dy];
    };
    const DIRS = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
    let t0 = null;
    pre.addEventListener('touchstart', (e) => { t0 = e.touches[0]; }, { passive: true });
    pre.addEventListener('touchend', (e) => {
      if (!t0) return;
      const t = e.changedTouches[0], dx = t.clientX - t0.clientX, dy = t.clientY - t0.clientY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) (Math.abs(dx) > Math.abs(dy) ? turn(Math.sign(dx), 0) : turn(0, Math.sign(dy)));
      t0 = null;
    });
    game = {
      key(e) {
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (k === 'q' || k === 'Escape') { e.preventDefault(); end(); return true; }
        if (k === ' ' || k === 'p') {
          e.preventDefault();
          s.paused = !s.paused;
          render();
          clearTimeout(s.timer);
          if (!s.paused) s.timer = setTimeout(step, s.speed);
          return true;
        }
        const d = DIRS[k];
        if (!d) return false;
        e.preventDefault();
        turn(d[0], d[1]);
        return true;
      },
    };
    print([acc('snake.exe') + dim('  eat the bugs ◆ · arrows / WASD or swipe · space pauses · q quits')]).then(() => {
      if (!game) return;
      out.appendChild(pre);
      render();
      out.scrollTop = out.scrollHeight;
      io.observe(term);
      s.timer = setTimeout(step, 450);
    });
    input.focus({ preventScroll: true });
    return [];
  }

  /* ---------- sudo rm -rf / : the page falls apart, then rebuilds ---------- */
  let crumbling = false;
  function crumble() {
    const gs = window.gsap;
    if (!gs || reduced) return [err('rm: refusing to remove "/"') + dim(' (reduced motion is on, so you get the quiet version)')];
    if (crumbling) return [dim('already deleting. patience.')];
    crumbling = true;
    const vh = innerHeight;
    const sel = 'h1, h2, h3, p, li, .btn, .section__label, .term, .shell__intro, .lab__bar, .lab__stage, .lab__foot, .algo, .stat, .card, .exe, .pipeline, .row, .skills__col, .project__visual, .portrait, .email, .coffee, .form label, .socials, .footer__name, .ghlive';
    let els = [...document.querySelectorAll(sel)].filter((el) => {
      if (el.closest('.palette, .tldr, .nav, .menu, .preloader')) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.bottom > 0 && r.top < vh;
    });
    els = els.filter((el) => !els.some((o) => o !== el && o.contains(el))).slice(0, 80); // outermost only
    print([dim('[sudo] password for visitor: ********'), err('rm: removing / … recursively …')]);
    const rand = gs.utils.random;
    gs.timeline({ delay: 0.9, onComplete: () => { crumbling = false; } })
      .to(els, { y: () => vh + rand(80, 260), x: () => rand(-80, 80), rotation: () => rand(-55, 55), duration: 1.1, ease: 'power2.in', stagger: { each: 0.025, from: 'random' } })
      .call(() => api.toast && api.toast('Just kidding. Restoring from backup…'))
      .to(els, { y: 0, x: 0, rotation: 0, duration: 1.1, ease: 'elastic.out(1, 0.6)', stagger: { each: 0.02, from: 'random' } }, '+=0.7')
      .set(els, { clearProps: 'x,y,rotation,transform' })
      .call(() => print(ok('✓ restored from backup. ') + dim('nice try.')));
    return [];
  }

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
    else if (parts[0] === 'sudo') pool = ['hire-me', 'rm'];
    else if (parts[0] === 'git') pool = ['log'];
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
    if (game && game.key(e)) return;
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
    if (!e.target.closest('a, .t-game') && !String(window.getSelection())) input.focus({ preventScroll: true });
  });

  // the command palette can run shell commands (snake, git log…)
  window.DKB_TERM = { run: (c) => execute(c) };

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
