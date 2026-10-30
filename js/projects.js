/* =========================================================
   Projects straight from GitHub: publish a public repo and it appears here, nothing to edit or tag.
   - a repo created in the last 90 days (with a description or a homepage) gets its own panel in
     Selected Work, and so does any repo tagged `portfolio-project`
   - every other public repo that isn't on the page yet goes in "Fresh on GitHub"
   - tag a repo `portfolio-hide` to keep it off the site
   Hand-written entries in js/data.js always win: a repo they cover is never listed twice.
   Cached in localStorage (the public API allows 60 calls/hour). If GitHub can't be reached,
   the page shows only what's in the HTML.
   ========================================================= */
(() => {
  const D = window.DKB_DATA || {};
  const USER = 'Deepak17kb';
  const KEY = 'dkb-gh-repos';
  const TTL = 5 * 60 * 1000; // ask GitHub again after 5 minutes
  const MAX_AGE = 7 * 86400000; // never show a cache older than a week
  const PROMOTE = 'portfolio-project';
  const HIDE = 'portfolio-hide';
  const MAX_PANELS = 3;
  const MAX_LIST = 6;
  const NEW_DAYS = 90; // a repo this young counts as a new project
  const SKIP = new Set([USER.toLowerCase(), `${USER}.github.io`.toLowerCase()]); // profile README, this site
  const QUIET_TOPICS = new Set([PROMOTE, HIDE, 'portfolio', 'github-pages']);

  const track = document.querySelector('.work__track');
  const outro = document.querySelector('.panel--outro');
  const live = document.querySelector('.outro__live');
  if (!track || !outro || !live) return;

  /* ---------- Which repos the page already covers by hand ---------- */
  const norm = (u) => (u || '').toLowerCase().replace(/\/+$/, '');
  const knownRepos = new Set();
  const knownDemos = new Set();
  (D.projects || []).filter((p) => !p.auto).forEach((p) => {
    const m = /github\.com\/[^/]+\/([^/?#]+)/i.exec(p.code || '');
    if (m) knownRepos.add(m[1].toLowerCase());
    if (p.repo) knownRepos.add(p.repo.toLowerCase());
    if (p.demo) knownDemos.add(norm(p.demo));
  });
  const onPage = (r) => knownRepos.has(r.name.toLowerCase()) || (r.homepage && knownDemos.has(norm(r.homepage)));

  /* ---------- GitHub + cache ---------- */
  const slim = (r) => ({
    name: r.name, description: r.description || '', homepage: r.homepage || '', url: r.html_url,
    language: r.language || '', topics: r.topics || [], stars: r.stargazers_count || 0,
    fork: r.fork, archived: r.archived, pushed: r.pushed_at, created: r.created_at,
  });
  const readCache = () => {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || 'null');
      return c && Array.isArray(c.d) && Date.now() - c.t < MAX_AGE ? c : null;
    } catch (e) { return null; }
  };
  const fetchRepos = () =>
    fetch(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('GitHub ' + r.status))))
      .then((list) => {
        const d = list.map(slim);
        try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d })); } catch (e) {}
        return d;
      });

  /* ---------- Choosing what to show ---------- */
  const isNew = (r) => (r.description || r.homepage) && Date.now() - new Date(r.created) < NEW_DAYS * 86400000;
  const pick = (repos) => {
    const candidates = repos.filter((r) =>
      !SKIP.has(r.name.toLowerCase()) && !r.archived && !r.topics.includes(HIDE) && !onPage(r) &&
      (!r.fork || r.topics.includes(PROMOTE)) // a fork only counts when it's tagged on purpose (team projects)
    );
    const panels = candidates
      .filter((r) => r.topics.includes(PROMOTE) || isNew(r))
      .sort((a, b) => b.created.localeCompare(a.created))
      .slice(0, MAX_PANELS);
    const list = candidates
      .filter((r) => !panels.includes(r))
      .sort((a, b) => b.pushed.localeCompare(a.pushed))
      .slice(0, MAX_LIST);
    return { panels, list, total: repos.length }; // the same number GitHub shows on the profile
  };

  /* ---------- Text helpers ---------- */
  const words = (s) => s.replace(/[-_]+/g, ' ').trim().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  const firstSentence = (s) => {
    const m = /^(.+?[.!?])(\s|$)/.exec(s);
    return m ? m[1] : s;
  };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  // "Qcom: quick-commerce market intelligence…" → title "Qcom", tagline "Quick-commerce market intelligence…"
  const describe = (r) => {
    const m = /^([^:—–]{2,28})\s*[:—–]\s+(.+)$/.exec(r.description);
    return m
      ? { title: m[1].trim(), tag: cap(firstSentence(m[2].trim())) }
      : { title: words(r.name), tag: cap(firstSentence(r.description)) };
  };
  const clip = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n)).replace(/[,;:\s]+$/, '') + '…');
  const month = (iso) => new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  const since = (iso) => {
    const d = Math.max(0, (Date.now() - new Date(iso)) / 86400000);
    if (d < 1) return 'Today';
    if (d < 30) return Math.floor(d) + 'd';
    if (d < 365) return Math.floor(d / 30) + 'mo';
    return Math.floor(d / 365) + 'y';
  };
  const pushedText = (iso) => {
    const s = since(iso);
    return s === 'Today' ? 'pushed today' : `pushed ${s} ago`;
  };
  const topicTags = (r) => {
    const t = r.topics.filter((x) => !QUIET_TOPICS.has(x)).slice(0, 6).map((x) => x.replace(/-/g, ' '));
    return t.length ? t : r.language ? [r.language] : [];
  };

  // tiny DOM builder: repo text always goes in as text, never as HTML
  const h = (tag, attrs = {}, kids = []) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => (k === 'text' ? (el.textContent = v) : el.setAttribute(k, v)));
    [].concat(kids).forEach((k) => k && el.append(k));
    return el;
  };

  /* ---------- A graph drawn from the repo name, in the style of the other project visuals ---------- */
  const hash = (s) => [...s].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619), 2166136261);
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  function graphSvg(name) {
    const rand = rng(hash(name));
    const pts = [];
    for (let guard = 0; pts.length < 22 && guard < 3000; guard++) {
      const p = [40 + rand() * 320, 60 + rand() * 280];
      if (pts.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 50)) pts.push(p);
    }
    // every node links to its three nearest neighbours
    const edges = new Map();
    const adj = pts.map(() => []);
    pts.forEach((p, i) => {
      pts.map((q, j) => [j, Math.hypot(p[0] - q[0], p[1] - q[1])])
        .filter(([j]) => j !== i)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .forEach(([j, w]) => {
          const k = Math.min(i, j) + '-' + Math.max(i, j);
          if (edges.has(k)) return;
          edges.set(k, [i, j]);
          adj[i].push([j, w]);
          adj[j].push([i, w]);
        });
    });
    // Dijkstra from the bottom-left node to the top-right one
    const start = pts.reduce((b, p, i) => (p[0] - p[1] < pts[b][0] - pts[b][1] ? i : b), 0);
    const end = pts.reduce((b, p, i) => (p[0] - p[1] > pts[b][0] - pts[b][1] ? i : b), 0);
    const dist = pts.map(() => Infinity);
    const prev = pts.map(() => -1);
    const done = pts.map(() => false);
    dist[start] = 0;
    for (;;) {
      let u = -1;
      dist.forEach((d, i) => { if (!done[i] && d < Infinity && (u < 0 || d < dist[u])) u = i; });
      if (u < 0) break;
      done[u] = true;
      adj[u].forEach(([v, w]) => { if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; } });
    }
    const route = [];
    if (dist[end] < Infinity) for (let v = end; v !== -1; v = prev[v]) route.unshift(v);
    const f = (n) => n.toFixed(1);
    const xy = (i) => `${f(pts[i][0])},${f(pts[i][1])}`;
    return `<svg viewBox="0 0 400 400" aria-hidden="true">
      <g class="g-edges">${[...edges.values()].map(([a, b]) => `<line x1="${f(pts[a][0])}" y1="${f(pts[a][1])}" x2="${f(pts[b][0])}" y2="${f(pts[b][1])}"/>`).join('')}</g>
      ${route.length > 1 ? `<polyline class="g-path" pathLength="1" points="${route.map(xy).join(' ')}"/>` : ''}
      <g class="g-nodes">${pts.map((p, i) => (i === start || i === end ? '' : `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="5"/>`)).join('')}</g>
      <circle class="g-start" cx="${f(pts[start][0])}" cy="${f(pts[start][1])}" r="9"/>
      <circle class="g-end" cx="${f(pts[end][0])}" cy="${f(pts[end][1])}" r="11"/>
    </svg>`;
  }

  /* ---------- Rendering ---------- */
  const panelFor = (r, num) => {
    const { title, tag } = describe(r);
    const metrics = [[r.language || '—', 'main language'], [month(r.created), 'repo created'], [since(r.pushed), 'since last push']];
    if (r.stars) metrics.push([String(r.stars), r.stars === 1 ? 'star' : 'stars']);
    const visual = h('div', { class: 'project__visual visual--auto', 'data-tilt': '' }, [
      h('span', { class: 'visual__caption mono', text: 'graph drawn from the repo name' }),
    ]);
    visual.insertAdjacentHTML('afterbegin', graphSvg(r.name));
    return h('article', { class: 'panel project project--auto', 'data-cursor': 'Explore', 'data-repo': r.name }, [
      h('div', { class: 'project__head' }, [
        h('span', { class: 'project__num', text: String(num).padStart(2, '0') }),
        h('span', { class: 'project__year mono', text: [month(r.created), r.language, 'Live from GitHub'].filter(Boolean).join(' · ') }),
      ]),
      h('div', { class: 'project__body' }, [
        h('div', { class: 'project__info' }, [
          h('h3', { class: 'project__title', text: title }),
          tag && h('p', { class: 'project__tag serif', text: tag }),
          h('ul', { class: 'project__metrics' }, metrics.map(([v, k]) => h('li', {}, [h('strong', { text: v }), h('span', { text: k })]))),
          h('div', { class: 'tags' }, topicTags(r).map((t) => h('span', { text: t }))),
          h('div', { class: 'project__links' }, [
            r.homepage && h('a', { href: r.homepage, target: '_blank', rel: 'noopener', class: 'link-arrow', 'data-magnetic': '' }, ['Live demo ', h('i', { text: '↗' })]),
            h('a', { href: r.url, target: '_blank', rel: 'noopener', class: 'link-arrow', 'data-magnetic': '' }, ['GitHub ', h('i', { text: '↗' })]),
          ]),
        ]),
        visual,
      ]),
    ]);
  };

  const itemFor = (r) => {
    const blurb = r.description ? clip(describe(r).tag, 70) : r.language || 'New repo';
    return h('li', {}, [
      h('a', { href: r.homepage || r.url, target: '_blank', rel: 'noopener' }, [
        h('span', { class: 'more__name', text: describe(r).title }),
        h('em', { class: 'serif', text: blurb }),
        h('i', { text: '↗' }),
        h('span', { class: 'more__meta mono', text: [r.language, pushedText(r.pushed)].filter(Boolean).join(' · ') }),
      ]),
    ]);
  };

  // terminal `projects`, `open <name>`, the palette and the TL;DR read DKB_DATA.projects
  const syncData = (panels) => {
    if (!Array.isArray(D.projects)) return;
    D.projects = D.projects.filter((p) => !p.auto);
    const at = D.projects.map((p) => !!p.featured).lastIndexOf(true) + 1;
    D.projects.splice(at, 0, ...panels.map((r) => {
      const { title, tag } = describe(r);
      return { key: r.name.toLowerCase(), name: title, what: tag || r.language, stack: topicTags(r).join(' · '), demo: r.homepage || undefined, code: r.url, auto: true };
    }));
  };

  let shownSig = null;
  const handmade = track.querySelectorAll('.project:not(.project--auto)').length;
  const totalEl = document.querySelector('[data-work-total]');

  // returns true when the set of panels changed (the horizontal scroll needs re-measuring)
  const render = (repos) => {
    const { panels, list, total } = pick(repos);
    const sig = JSON.stringify(panels);
    const panelsChanged = sig !== shownSig;
    if (panelsChanged) {
      track.querySelectorAll('.project--auto').forEach((el) => el.remove());
      panels.forEach((r, i) => outro.before(panelFor(r, handmade + i + 1)));
      if (totalEl) totalEl.textContent = String(handmade + panels.length).padStart(2, '0');
      syncData(panels);
      shownSig = sig;
    }
    const ul = live.querySelector('ul');
    ul.replaceChildren(...list.map(itemFor));
    live.querySelector('[data-repo-count]').textContent = `· ${total} public repos`;
    live.hidden = !list.length;
    return panelsChanged;
  };

  // Before main.js sets up the scroll animations: render from cache, synchronously
  const cache = readCache();
  if (cache) render(cache.d);
  if (cache && Date.now() - cache.t < TTL) return;

  fetchRepos()
    .then((repos) => {
      // a late answer must not shift what the visitor is reading: only re-render while Selected Work is still below the fold
      const work = document.getElementById('work');
      if (work && work.getBoundingClientRect().top < window.innerHeight) return;
      if (render(repos)) document.dispatchEvent(new Event('dkb:work-changed'));
    })
    .catch(() => {}); // offline or rate-limited: keep the cached or hand-written projects
})();
