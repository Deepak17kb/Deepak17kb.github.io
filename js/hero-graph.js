/* =========================================================
   Hero backdrop — a small road network arching around the portrait.
   Every few seconds Dijkstra routes from a PROBLEM node to a
   SOLUTION node and the shortest path is drawn around the photo.
   Nothing is placed behind the person, so no line crosses the face.
   ========================================================= */
(() => {
  const svg = document.querySelector('.route-graph');
  const marks = document.querySelector('.route-marks');   // above the name, below the photo
  const box = document.querySelector('.hero__aura');
  if (!svg || !marks || !box) return;

  const NS = 'http://www.w3.org/2000/svg';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gs = window.gsap;
  const IMG_W = 1087;      // portrait image space (1087 × 1199)
  const NAV_CLEAR = 76;    // px from the top of the page kept free for the nav

  /* ---------- Keep-out: head + hair (ellipse) and neck/shoulders/suit (polygon), with a margin ---------- */
  const HX = 562, HY = 300;
  const head = (x, y) => ((x - HX) / 262) ** 2 + ((y - HY) / 335) ** 2 < 1;
  const body = [[320, 505], [810, 505], [1120, 690], [1260, 1320], [-180, 1320], [-60, 690]];
  const inPoly = (x, y, p) => {
    let inside = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i], [xj, yj] = p[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const blocked = (x, y) => head(x, y) || inPoly(x, y, body);
  const segmentClear = (a, b) => {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      if (blocked(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
    }
    return true;
  };

  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent && parent.appendChild(n);
    return n;
  };

  /* ---------- State ---------- */
  let pts = [], adj = [], live = () => false, nodeEls = [], edgeEls = [];
  let leftSide = [], rightSide = [];
  let gEdges, gSeen, gNodes, route, runner, ends, labels;

  /* ---------- Build the network for the current layout ---------- */
  function generate() {
    // highest point the network may reach without running into the nav, in image units
    const b = box.getBoundingClientRect();
    const scale = b.width / IMG_W || 0.65;
    const top = b.top + window.scrollY;
    const minY = Math.max(-205, (NAV_CLEAR - top) / scale);

    // seeded, so the network looks the same on every visit at a given size
    let seed = 20240817;
    const rand = () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // a halo band arching over the head (right → top → left), plus a few strays to the left
    pts = [];
    const MIN = 82;
    const tryAdd = (p) => {
      if (p.y < minY || p.x > 1125 || blocked(p.x, p.y)) return;
      if (pts.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > MIN)) pts.push(p);
    };
    for (let tries = 0; tries < 9000 && pts.length < 42; tries++) {
      const th = (-18 + rand() * 216) * Math.PI / 180;
      const f = rand();
      tryAdd({ x: HX + Math.cos(th) * (300 + f * 300), y: HY - Math.sin(th) * (360 + f * 160) });
    }
    for (let tries = 0; tries < 1500 && pts.length < 46; tries++) tryAdd({ x: -380 + rand() * 480, y: -120 + rand() * 600 });

    // k-nearest edges that stay out of the keep-out zone
    adj = pts.map(() => []);
    const edges = [];
    const has = new Set();
    pts.forEach((p, i) => {
      pts
        .map((q, j) => ({ j, d: Math.hypot(q.x - p.x, q.y - p.y) }))
        .filter((o) => o.j !== i && o.d < 280)
        .sort((m, n) => m.d - n.d)
        .slice(0, 3)
        .forEach(({ j, d }) => {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (has.has(key) || !segmentClear(p, pts[j])) return;
          has.add(key);
          edges.push([i, j]);
          adj[i].push([j, d]);
          adj[j].push([i, d]);
        });
    });

    // keep the largest connected piece so every route has somewhere to go
    const comp = new Array(pts.length).fill(-1);
    let best = -1, bestSize = 0, c = 0;
    for (let i = 0; i < pts.length; i++) {
      if (comp[i] !== -1) continue;
      const stack = [i]; comp[i] = c; let size = 0;
      while (stack.length) {
        const u = stack.pop(); size++;
        adj[u].forEach(([v]) => { if (comp[v] === -1) { comp[v] = c; stack.push(v); } });
      }
      if (size > bestSize) { bestSize = size; best = c; }
      c++;
    }
    live = (i) => comp[i] === best;

    // endpoints low on either side of the portrait, kept away from the screen edges so labels fit
    leftSide = pts.map((p, i) => i).filter((i) => live(i) && pts[i].x < HX - 270 && pts[i].x > 40 && pts[i].y > 90);
    rightSide = pts.map((p, i) => i).filter((i) => live(i) && pts[i].x > HX + 270 && pts[i].x < 1020 && pts[i].y > 90);

    // render
    svg.textContent = '';
    marks.textContent = '';
    gEdges = el('g', { class: 'rg-edges' }, svg);
    gSeen = el('g', { class: 'rg-seen-layer' }, svg);
    gNodes = el('g', { class: 'rg-nodes' }, svg);
    route = el('path', { class: 'rg-path', d: '' }, marks);
    ends = [el('circle', { class: 'rg-end', r: 15 }, marks), el('circle', { class: 'rg-end', r: 15 }, marks)];
    runner = el('circle', { class: 'rg-runner', r: 8 }, marks);
    labels = [el('text', { class: 'rg-label', 'text-anchor': 'middle' }, marks), el('text', { class: 'rg-label', 'text-anchor': 'middle' }, marks)];
    labels[0].textContent = 'PROBLEM';
    labels[1].textContent = 'SOLUTION';
    [route, runner, ...ends, ...labels].forEach((n) => n.setAttribute('opacity', 0));

    edgeEls = edges.filter(([i, j]) => live(i) && live(j)).map(([i, j]) =>
      el('line', { class: 'rg-edge', x1: pts[i].x, y1: pts[i].y, x2: pts[j].x, y2: pts[j].y }, gEdges)
    );
    nodeEls = pts.map((p, i) => live(i)
      ? el('circle', { class: 'rg-node' + (adj[i].length >= 4 ? ' is-hub' : ''), cx: p.x, cy: p.y, r: adj[i].length >= 4 ? 7 : 5 }, gNodes)
      : null);
  }

  /* ---------- Search ---------- */
  const dijkstra = (s, t) => {
    const dist = pts.map(() => Infinity), prev = pts.map(() => -1), done = pts.map(() => false), order = [];
    dist[s] = 0;
    for (;;) {
      let u = -1;
      for (let i = 0; i < pts.length; i++) if (!done[i] && live(i) && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || dist[u] === Infinity) break;
      done[u] = true; order.push(u);
      if (u === t) break;
      adj[u].forEach(([v, w]) => { if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; } });
    }
    const path = [];
    for (let v = t; v !== -1; v = prev[v]) path.unshift(v);
    return { order, prev, path: path[0] === s ? path : [] };
  };

  let flip = false;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pickPair = () => {
    flip = !flip;
    const a = pick(leftSide), b = pick(rightSide);
    return flip ? [a, b] : [b, a];
  };
  const placeEnds = (s, t) => {
    [s, t].forEach((n, k) => {
      ends[k].setAttribute('cx', pts[n].x); ends[k].setAttribute('cy', pts[n].y);
      labels[k].setAttribute('x', pts[n].x);
      labels[k].setAttribute('y', pts[n].y - 30);
    });
  };
  const pathD = (path) => path.map((n, k) => `${k ? 'L' : 'M'}${pts[n].x.toFixed(1)},${pts[n].y.toFixed(1)}`).join(' ');

  /* ---------- Static frame (no GSAP / reduced motion) ---------- */
  const drawStatic = () => {
    if (!leftSide.length || !rightSide.length) return;
    const [s, t] = pickPair();
    const { path } = dijkstra(s, t);
    route.setAttribute('d', pathD(path));
    placeEnds(s, t);
    [route, ...ends, ...labels].forEach((n) => n.setAttribute('opacity', 1));
  };
  if (!gs || reduced) {
    generate();
    drawStatic();
    let w = innerWidth;
    window.addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; generate(); drawStatic(); } });
    return;
  }

  /* ---------- Motion: build the network, then keep routing ---------- */
  let current = null, waiting = null, onScreen = true, started = false;

  const stopLoop = () => {
    if (current) { current.kill(); current = null; }
    if (waiting) { waiting.kill(); waiting = null; }
  };

  const cycle = () => {
    waiting = null;
    if (!leftSide.length || !rightSide.length) return;
    const [s, t] = pickPair();
    const { order, prev, path } = dijkstra(s, t);
    if (path.length < 2) { waiting = gs.delayedCall(0.4, cycle); return; }
    placeEnds(s, t);
    route.setAttribute('d', pathD(path));
    const len = route.getTotalLength();
    route.style.strokeDasharray = len;
    const seen = [];
    const step = 1.1 / Math.max(order.length, 1);
    const tl = gs.timeline({
      onComplete: () => {
        seen.forEach((n) => n.remove());
        nodeEls.forEach((n) => n && n.classList.remove('is-seen'));
        current = null;
        waiting = gs.delayedCall(0.5, () => (onScreen ? cycle() : (waiting = null)));
      },
    });
    tl.to([...ends, ...labels], { attr: { opacity: 1 }, duration: 0.35, stagger: 0.05 }, 0);
    // exploration: settled nodes light up in Dijkstra order, with the edge that reached them
    order.forEach((u, k) => {
      tl.call(() => {
        nodeEls[u] && nodeEls[u].classList.add('is-seen');
        if (prev[u] >= 0) {
          const a = pts[prev[u]], b = pts[u];
          seen.push(el('line', { class: 'rg-seen', x1: a.x, y1: a.y, x2: b.x, y2: b.y }, gSeen));
        }
      }, null, 0.3 + k * step);
    });
    // the shortest path draws and a runner travels it
    const at = 0.45 + order.length * step;
    const ride = { p: 0 };
    tl.set(route, { attr: { opacity: 1 }, strokeDashoffset: len }, at)
      .set(runner, { attr: { opacity: 1 } }, at)
      .to(route, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, at)
      .to(ride, {
        p: 1, duration: 1.2, ease: 'power2.inOut',
        onUpdate: () => {
          const pt = route.getPointAtLength(ride.p * len);
          runner.setAttribute('cx', pt.x); runner.setAttribute('cy', pt.y);
        },
      }, at)
      .to(gSeen, { opacity: 0.35, duration: 0.6 }, at + 0.4)
      // hold, then clear the board
      .to([route, runner, ...ends, ...labels], { attr: { opacity: 0 }, duration: 0.6 }, at + 2.9)
      .to(gSeen, { opacity: 0, duration: 0.6 }, at + 2.9)
      .set(gSeen, { opacity: 1 });
    current = tl;
  };

  const build = () => {
    if (started) return;
    started = true;
    generate();   // built lazily: it measures the layout, so keep it out of page load
    // the network assembles outward from the portrait, then the first route runs
    const byDist = (n) => Math.hypot(+n.getAttribute('cx') - HX, +n.getAttribute('cy') - HY);
    const nodes = nodeEls.filter(Boolean).sort((a, b) => byDist(a) - byDist(b));
    gs.timeline({ onComplete: () => onScreen && cycle() })
      .from(edgeEls, { opacity: 0, duration: 0.8, stagger: 0.012, ease: 'power1.out' }, 0)
      .from(nodes, { attr: { r: 0 }, duration: 0.5, stagger: 0.018, ease: 'back.out(2)' }, 0.1);
  };

  // start with the hero intro (after the preloader); fall back if no intro event arrives
  document.addEventListener('dkb:intro', () => gs.delayedCall(0.5, build), { once: true });
  gs.delayedCall(6, build);

  // a new layout changes how much room there is above the head: rebuild for it
  let lastW = innerWidth, resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (innerWidth === lastW) return;   // mobile toolbars change height only
      lastW = innerWidth;
      if (!started) return;
      stopLoop();
      generate();
      if (onScreen) cycle();
    }, 250);
  });

  // only animate while the hero is on screen
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) {
      if (current) current.resume();
      else if (started && !waiting) cycle();
    } else if (current) current.pause();
  }).observe(svg);
})();
