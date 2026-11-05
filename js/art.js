/* =========================================================
   The Deepak Line: everything drawn in code.
   Each piece draws once, or runs only while it is on screen.
   ========================================================= */
(() => {
  'use strict';

  const C = {
    poster: '#090B14',
    blue: '#1735C2', sheen: '#2A4CDD', fold: '#0E2590', b3: '#5F7FFF', b2: '#8AA2FF', ice: '#BFCBFF',
    red: '#FF2A46', gold: '#D9AE3C', goldHi: '#F3D98A', white: '#FFFFFF',
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = (max = 2) => Math.min(max, window.devicePixelRatio || 1);
  // small seeded generator, so every poster draws the same picture each visit
  const rng = (seed) => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // layout size, not the projected one: posters sit on a curved 3D rail
  const setup = (canvas, max = 2) => {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    const d = DPR(max);
    canvas.width = Math.round(w * d);
    canvas.height = Math.round(h * d);
    const g = canvas.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    return { g, w, h };
  };
  const dot = (g, x, y, r) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); };

  /* ---------- poster art ---------- */

  // LifeLine: a 40-node city of 83 roads. One road on the shortest route breaks; red is the detour.
  const lifeline = (g, w, h, big) => {
    const r = rng(40);
    const cols = 8, rows = 5, px = w * 0.07, py = h * 0.1;
    const N = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      N.push({ x: px + (w - 2 * px) * (i + 0.5 + (r() - 0.5) * 0.7) / cols, y: py + (h - 2 * py) * (j + 0.5 + (r() - 0.5) * 0.7) / rows });
    }
    const pairs = [];
    for (let a = 0; a < N.length; a++) for (let b = a + 1; b < N.length; b++) pairs.push([a, b, Math.hypot(N[a].x - N[b].x, N[a].y - N[b].y)]);
    pairs.sort((p, q) => p[2] - q[2]);
    const parent = N.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const E = [], used = new Set();
    for (const [a, b, d] of pairs) { const fa = find(a), fb = find(b); if (fa !== fb) { parent[fa] = fb; E.push([a, b, d]); used.add(a * 64 + b); } }
    for (const [a, b, d] of pairs) { if (E.length >= 83) break; if (!used.has(a * 64 + b)) { E.push([a, b, d]); used.add(a * 64 + b); } }
    const adj = N.map(() => []);
    E.forEach(([a, b, d], k) => { adj[a].push([b, d, k]); adj[b].push([a, d, k]); });
    const route = (s, t, banned) => {
      const dist = N.map(() => Infinity), prev = N.map(() => -1), done = N.map(() => false);
      dist[s] = 0;
      for (;;) {
        let u = -1;
        for (let i = 0; i < N.length; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
        if (u < 0 || dist[u] === Infinity || u === t) break;
        done[u] = true;
        for (const [v, d, k] of adj[u]) if (k !== banned && dist[u] + d < dist[v]) { dist[v] = dist[u] + d; prev[v] = u; }
      }
      const out = [];
      for (let v = t; v >= 0; v = prev[v]) out.unshift(v);
      return out[0] === s ? out : [];
    };
    const S = 8, T = 31;
    const first = route(S, T, -1);
    const m = Math.max(1, Math.floor(first.length / 2));
    const broken = E.findIndex(([a, b]) => (a === first[m - 1] && b === first[m]) || (a === first[m] && b === first[m - 1]));
    let detour = route(S, T, broken);
    const cut = detour.length ? broken : -1;
    if (!detour.length) detour = first;

    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,255,255,.17)';
    g.lineWidth = 1;
    g.beginPath();
    E.forEach(([a, b], k) => { if (k !== cut) { g.moveTo(N[a].x, N[a].y); g.lineTo(N[b].x, N[b].y); } });
    g.stroke();
    if (cut >= 0) {
      const [a, b] = E[cut];
      const mx = (N[a].x + N[b].x) / 2, my = (N[a].y + N[b].y) / 2, s = big ? 7 : 5;
      g.setLineDash([3, 4]);
      g.strokeStyle = 'rgba(255,255,255,.45)';
      g.beginPath(); g.moveTo(N[a].x, N[a].y); g.lineTo(N[b].x, N[b].y); g.stroke();
      g.setLineDash([]);
      g.strokeStyle = '#fff';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(mx - s, my - s); g.lineTo(mx + s, my + s); g.moveTo(mx + s, my - s); g.lineTo(mx - s, my + s); g.stroke();
    }
    g.strokeStyle = C.red;
    g.lineWidth = big ? 4 : 3;
    g.beginPath();
    detour.forEach((i, n) => (n ? g.lineTo(N[i].x, N[i].y) : g.moveTo(N[i].x, N[i].y)));
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.78)';
    g.beginPath();
    N.forEach((n, i) => { if (i !== S && i !== T) dot(g, n.x, n.y, big ? 2.6 : 2); });
    g.fill();
    g.fillStyle = C.red;
    g.beginPath();
    detour.slice(1, -1).forEach((i) => dot(g, N[i].x, N[i].y, big ? 3.4 : 2.8));
    g.fill();
    g.lineWidth = 2.4;
    g.strokeStyle = '#fff';
    g.fillStyle = C.poster;
    g.beginPath(); dot(g, N[S].x, N[S].y, big ? 7 : 5.5); g.fill(); g.stroke();
    const gold = g.createLinearGradient(N[T].x - 8, N[T].y - 8, N[T].x + 8, N[T].y + 8);
    gold.addColorStop(0, C.goldHi); gold.addColorStop(1, C.gold);
    g.fillStyle = gold;
    g.beginPath(); dot(g, N[T].x, N[T].y, big ? 8 : 6.5); g.fill();
  };

  // UPI Risk Desk: a cloud of accounts, one dispute ring of seven in red, five risk agents watching.
  const upi = (g, w, h, big) => {
    const r = rng(121);
    const P = [];
    for (let i = 0; i < (big ? 120 : 90); i++) P.push({ x: w * (0.05 + 0.9 * r()), y: h * (0.08 + 0.66 * r()) });
    g.strokeStyle = 'rgba(255,255,255,.13)';
    g.lineWidth = 1;
    g.beginPath();
    P.forEach((p, i) => {
      let best = -1, bd = Infinity;
      P.forEach((q, j) => { if (j !== i) { const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2; if (d < bd) { bd = d; best = j; } } });
      g.moveTo(p.x, p.y); g.lineTo(P[best].x, P[best].y);
    });
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.beginPath();
    P.forEach((p) => dot(g, p.x, p.y, big ? 2 : 1.6));
    g.fill();
    const cx = w * 0.56, cy = h * 0.4, R = Math.min(w, h) * 0.21;
    const ring = Array.from({ length: 7 }, (_, k) => {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / 7 + (r() - 0.5) * 0.3;
      const rr = R * (0.86 + r() * 0.28);
      return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr };
    });
    // five agents along the bottom, each watching part of the ring
    const ay = h * 0.86;
    const agents = Array.from({ length: 5 }, (_, k) => ({ x: w * (0.14 + k * 0.18), y: ay }));
    g.setLineDash([2, 4]);
    g.strokeStyle = 'rgba(255,255,255,.3)';
    g.beginPath();
    agents.forEach((a, k) => { const t = ring[(k * 3) % 7]; g.moveTo(a.x, a.y); g.lineTo(t.x, t.y); });
    g.stroke();
    g.setLineDash([]);
    g.strokeStyle = C.red;
    g.lineWidth = big ? 3 : 2.4;
    g.lineJoin = 'round';
    g.beginPath();
    ring.forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.closePath();
    g.stroke();
    // arrowheads: the money goes round
    g.fillStyle = C.red;
    ring.forEach((p, k) => {
      const q = ring[(k + 1) % 7];
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, a = Math.atan2(q.y - p.y, q.x - p.x), s = big ? 7 : 5.5;
      g.beginPath();
      g.moveTo(mx + Math.cos(a) * s, my + Math.sin(a) * s);
      g.lineTo(mx + Math.cos(a + 2.5) * s, my + Math.sin(a + 2.5) * s);
      g.lineTo(mx + Math.cos(a - 2.5) * s, my + Math.sin(a - 2.5) * s);
      g.closePath();
      g.fill();
    });
    g.beginPath();
    ring.forEach((p) => dot(g, p.x, p.y, big ? 5 : 4));
    g.fill();
    g.strokeStyle = '#fff';
    g.lineWidth = 1.6;
    agents.forEach((a) => {
      const s = big ? 9 : 7;
      g.beginPath();
      for (let k = 0; k < 6; k++) { const t = Math.PI / 6 + (k * Math.PI) / 3; const x = a.x + Math.cos(t) * s, y = a.y + Math.sin(t) * s; k ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.closePath();
      g.fillStyle = C.poster;
      g.fill();
      g.stroke();
    });
  };

  // NER SafeRoute: contour dots of the hills, warnings off the road, and the safe road in red.
  const saferoute = (g, w, h, big) => {
    const r = rng(3447);
    const sm = (t) => t * t * (3 - 2 * t);
    // smooth value noise on a G x G lattice
    const noise = (G) => {
      const V = [];
      for (let i = 0; i < (G + 1) * (G + 1); i++) V.push(r());
      return (x, y) => {
        const gx = Math.min(G - 1e-6, Math.max(0, x * G)), gy = Math.min(G - 1e-6, Math.max(0, y * G));
        const i = Math.floor(gx), j = Math.floor(gy), fx = sm(gx - i), fy = sm(gy - j);
        const a = V[j * (G + 1) + i], b = V[j * (G + 1) + i + 1], c = V[(j + 1) * (G + 1) + i], d = V[(j + 1) * (G + 1) + i + 1];
        return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
      };
    };
    const hills = noise(5), ridges = noise(13);
    const height = (x, y) => hills(x, y) * 0.75 + ridges(x, y) * 0.25;
    const step = big ? 5 : 4.2;
    g.fillStyle = 'rgba(255,255,255,.42)';
    g.beginPath();
    for (let y = step; y < h; y += step) for (let x = step; x < w; x += step) {
      const v = height(x / w, y / h) * 10;
      if (Math.abs((v % 1) - 0.5) < 0.085) dot(g, x, y, 0.95);
    }
    g.fill();
    const pts = [[0.06, 0.92], [0.2, 0.74], [0.3, 0.6], [0.47, 0.55], [0.6, 0.4], [0.76, 0.3], [0.94, 0.1]].map(([x, y]) => [x * w, y * h]);
    const curve = () => {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    };
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = C.poster;
    g.lineWidth = big ? 12 : 9;
    curve(); g.stroke();
    g.strokeStyle = C.red;
    g.lineWidth = big ? 4 : 3;
    curve(); g.stroke();
    // landslide warnings, kept off the route
    g.strokeStyle = '#fff';
    g.lineWidth = 1.6;
    [[0.3, 0.3], [0.7, 0.7], [0.84, 0.52], [0.16, 0.42]].forEach(([x, y]) => {
      const cx = x * w, cy = y * h, s = big ? 9 : 7;
      g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s, cy + s * 0.75); g.lineTo(cx - s, cy + s * 0.75); g.closePath();
      g.fillStyle = C.poster; g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx, cy - s * 0.35); g.lineTo(cx, cy + s * 0.2); g.stroke();
    });
    // the truck
    const [tx, ty] = pts[3];
    g.fillStyle = '#fff';
    g.beginPath(); g.roundRect ? g.roundRect(tx - 9, ty - 5, 18, 10, 4) : g.rect(tx - 9, ty - 5, 18, 10); g.fill();
  };

  // BroadBridge: simulated markets fan out; the white line is the median, gold is the goal.
  const broadbridge = (g, w, h, big) => {
    const r = rng(239);
    const gauss = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
    const n = big ? 160 : 100, steps = 48;
    const x0 = w * 0.06, x1 = w * 0.95, y0 = h * 0.74, scale = h * 0.42;
    const runs = [];
    for (let k = 0; k < n; k++) {
      let v = 1;
      const row = [v];
      for (let s = 1; s <= steps; s++) { v *= Math.exp(0.006 + 0.045 * gauss()); row.push(v); }
      runs.push(row);
    }
    const X = (s) => x0 + ((x1 - x0) * s) / steps;
    const Y = (v) => y0 - (v - 1) * scale;
    const q = (s, f) => { const col = runs.map((row) => row[s]).sort((a, b) => a - b); return col[Math.floor(f * (col.length - 1))]; };
    g.fillStyle = 'rgba(42,76,221,.34)';
    g.beginPath();
    for (let s = 0; s <= steps; s++) g.lineTo(X(s), Y(q(s, 0.9)));
    for (let s = steps; s >= 0; s--) g.lineTo(X(s), Y(q(s, 0.1)));
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.075)';
    g.lineWidth = 1;
    g.beginPath();
    runs.forEach((row) => row.forEach((v, s) => (s ? g.lineTo(X(s), Y(v)) : g.moveTo(X(s), Y(v)))));
    g.stroke();
    g.strokeStyle = '#fff';
    g.lineWidth = big ? 3 : 2.4;
    g.lineJoin = 'round';
    g.beginPath();
    for (let s = 0; s <= steps; s++) g.lineTo(X(s), Y(q(s, 0.5)));
    g.stroke();
    const goal = Y(1.32);
    const gold = g.createLinearGradient(x0, 0, x1, 0);
    gold.addColorStop(0, C.gold); gold.addColorStop(0.5, C.goldHi); gold.addColorStop(1, C.gold);
    g.strokeStyle = gold;
    g.lineWidth = 2;
    g.setLineDash([7, 6]);
    g.beginPath(); g.moveTo(x0, goal); g.lineTo(x1, goal); g.stroke();
    g.setLineDash([]);
    g.fillStyle = C.gold;
    g.font = `500 ${big ? 12 : 10}px "JetBrains Mono", monospace`;
    g.textAlign = 'right';
    g.fillText('GOAL', x1, goal - 8);
    g.textAlign = 'left';
  };

  // Darklytics: what sold out first. One row per aisle; red is the share that was out of stock.
  const AISLES = [['Dry fruits & nuts', 54, 342], ['Snacks & munchies', 186, 1303], ['Staples & grains', 76, 538], ['Fruits & vegetables', 202, 2126], ['Bakery & biscuits', 96, 1245], ['Sweets & chocolates', 84, 1880], ['Dairy, bread & eggs', 76, 2062], ['Beverages', 26, 1473]];
  const darklytics = (g, w, h, big) => {
    const r = rng(610789);
    const left = big ? w * 0.36 : w * 0.08, right = big ? w * 0.86 : w * 0.92;
    const top = h * 0.14, bottom = h * 0.86;
    const cols = big ? 34 : 26;
    const gap = (right - left) / (cols - 1), rowGap = (bottom - top) / (AISLES.length - 1);
    const rad = Math.min(gap, rowGap) * 0.3;
    AISLES.forEach(([name, out, n], j) => {
      const y = top + j * rowGap;
      const hot = new Set();
      const want = Math.max(1, Math.round((out / n) * cols));
      while (hot.size < want) hot.add(Math.floor(r() * cols));
      g.fillStyle = 'rgba(255,255,255,.3)';
      g.beginPath();
      for (let i = 0; i < cols; i++) if (!hot.has(i)) dot(g, left + i * gap, y, rad);
      g.fill();
      g.fillStyle = C.red;
      g.beginPath();
      hot.forEach((i) => dot(g, left + i * gap, y, rad * 1.25));
      g.fill();
      if (big) {
        g.font = '500 11px "JetBrains Mono", monospace';
        g.fillStyle = 'rgba(221,224,230,.85)';
        g.textAlign = 'left';
        g.fillText(name, 14, y + 4);
        g.fillStyle = C.red;
        g.textAlign = 'right';
        g.fillText(((out / n) * 100).toFixed(1) + '%', w - 14, y + 4);
        g.textAlign = 'left';
      }
    });
  };

  const ART = { lifeline, upi, saferoute, broadbridge, darklytics };

  // big = the case-file version, with labels; posters fade into their card at the bottom
  const poster = (key, canvas, big = false) => {
    const fn = ART[key];
    if (!fn || !canvas) return;
    const { g, w, h } = setup(canvas, 2);
    canvas.dataset.size = w + 'x' + h;
    g.fillStyle = C.poster;
    g.fillRect(0, 0, w, h);
    fn(g, w, h, big);
    if (!big) {
      const f = g.createLinearGradient(0, h * 0.55, 0, h);
      f.addColorStop(0, 'rgba(9,11,20,0)');
      f.addColorStop(1, 'rgba(9,11,20,1)');
      g.fillStyle = f;
      g.fillRect(0, h * 0.55, w, h * 0.45);
    }
  };

  /* ---------- the portrait's rim light ---------- */
  // Baked once: a blue glow around the shoulders only (it fades out below the chin, so nothing glows around the face).
  const rim = (img, canvas) => {
    if (!img || !canvas) return;
    const draw = () => {
      const d = DPR(1.5);
      const w = Math.round(canvas.clientWidth * d), h = Math.round(canvas.clientHeight * d);
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      const g = canvas.getContext('2d', { willReadFrequently: true });
      const pw = w / 1.08, ph = h / 1.08, px = (w - pw) / 2, py = (h - ph) / 2, off = w * 4;
      g.shadowOffsetX = off;
      g.shadowColor = 'rgba(42,76,221,.9)';
      g.shadowBlur = 38 * d;
      g.drawImage(img, px - off, py, pw, ph);
      g.shadowColor = 'rgba(191,203,255,.9)';
      g.shadowBlur = 5 * d;
      g.drawImage(img, px - off, py, pw, ph);
      g.shadowColor = 'transparent';
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(img, px, py, pw, ph);
      const fade = g.createLinearGradient(0, py + ph * 0.5, 0, py + ph * 0.66);
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = fade;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
    };
    const go = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => requestAnimationFrame(draw));
    if (img.complete && img.naturalWidth) go();
    else img.addEventListener('load', go, { once: true });
    let t, was = '';
    addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => { const now = canvas.clientWidth + 'x' + canvas.clientHeight; if (now !== was) { was = now; draw(); } }, 250);
    });
    was = canvas.clientWidth + 'x' + canvas.clientHeight;
  };

  /* ---------- the thesis: scattered points find their grid ---------- */
  const dots = (canvas) => {
    const r = rng(7);
    const COLS = 40, ROWS = 12;
    const pts = [];
    for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) {
      const trend = ROWS - 1 - Math.round((i / (COLS - 1)) * (ROWS - 1) * 0.86);
      pts.push({ i, j, sx: r(), sy: r(), hot: j === trend, delay: (i / COLS) * 0.45 + r() * 0.08 });
    }
    let g = null, w = 0, h = 0, last = -1;
    const resize = () => { ({ g, w, h } = setup(canvas, 1.5)); last = -1; };
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const draw = (p) => {
      if (!g) resize();
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      g.clearRect(0, 0, w, h);
      const gx0 = w * 0.08, gx1 = w * 0.92, gy0 = h * 0.56, gy1 = h * 0.8;
      const sxs = (gx1 - gx0) / (COLS - 1), sys = (gy1 - gy0) / (ROWS - 1);
      const s = Math.max(2, Math.min(4, sxs * 0.16));
      for (const hot of [false, true]) {
        g.fillStyle = hot ? '#FF2A46' : 'rgba(255,255,255,.32)';
        g.beginPath();
        for (const q of pts) {
          if (q.hot !== hot) continue;
          const t = ease(Math.min(1, Math.max(0, (p - q.delay) / 0.5)));
          const x = q.sx * w + (gx0 + q.i * sxs - q.sx * w) * t;
          const y = q.sy * h + (gy0 + q.j * sys - q.sy * h) * t;
          const z = hot ? s * 1.35 : s;
          g.rect(x - z / 2, y - z / 2, z, z);
        }
        g.fill();
      }
    };
    return { resize, draw };
  };

  /* ---------- the about sky: a flow field, painted once ---------- */
  // One function paints it. It runs in a Web Worker where the browser can draw off the main thread
  // (Chrome, Edge, Firefox, Safari 16.4+), and on the page in small slices where it can't, so every browser gets a sky.
  function skyPainter(g, w, h, n, steps) {
    let seed = 2600;
    const r = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#02030A'); bg.addColorStop(1, '#070B1F');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const S = Math.min(w, h);
    const V = [
      { x: .36 * w, y: .4 * h, r: .3 * S, s: 1.4 },
      { x: .62 * w, y: .54 * h, r: .2 * S, s: -1.2 },
      { x: .86 * w, y: .2 * h, r: .13 * S, s: 1.6 },
      { x: .14 * w, y: .76 * h, r: .14 * S, s: -1 },
    ];
    for (let k = 0; k < 9; k++) V.push({ x: r() * w, y: r() * h, r: (.04 + r() * .05) * S, s: (r() < .5 ? -1 : 1) * (1 + r()) });
    const field = (x, y) => {
      let vx = 1, vy = .45 * Math.sin(y / h * 7 + x / w * 3.2);
      for (const v of V) {
        const dx = x - v.x, dy = y - v.y, d2 = dx * dx + dy * dy, f = Math.exp(-d2 / (v.r * v.r));
        const d = Math.sqrt(d2) + 1e-3, sp = v.s * f * 3.2;
        vx += -dy / d * sp; vy += dx / d * sp;
      }
      const m = Math.hypot(vx, vy) || 1;
      return [vx / m, vy / m];
    };
    const pal = ['#0E2590', '#1735C2', '#1735C2', '#2A4CDD', '#2A4CDD', '#5F7FFF', '#8AA2FF', '#BFCBFF', '#FFFFFF'];
    g.lineCap = 'round';
    const strokes = (i0, i1) => {
      for (let i = i0; i < i1; i++) {
        let x = r() * w, y = r() * h;
        let near = 0;
        for (const v of V) near = Math.max(near, Math.exp(-((x - v.x) ** 2 + (y - v.y) ** 2) / (v.r * v.r * 2.2)));
        const c = pal[Math.min(pal.length - 1, Math.floor((near * .75 + r() * .45) * pal.length))];
        g.strokeStyle = c;
        g.globalAlpha = .05 + r() * .1 + near * .12;
        g.lineWidth = .6 + r() * 1.8;
        g.beginPath(); g.moveTo(x, y);
        const len = steps * (.5 + r() * .7);
        for (let s = 0; s < len; s++) {
          const f = field(x, y);
          x += f[0] * 2.4; y += f[1] * 2.4;
          if (x < -20 || y < -20 || x > w + 20 || y > h + 20) break;
          g.lineTo(x, y);
        }
        g.stroke();

      }
    };
    const finish = () => {
      // a crescent moon with rings of halo, and a scatter of stars
      g.globalAlpha = 1;
      const mx = .86 * w, my = .2 * h, mr = .035 * S;
      for (let k = 4; k >= 1; k--) {
        g.strokeStyle = 'rgba(191,203,255,' + (.05 + .03 * (5 - k)) + ')';
        g.lineWidth = 2 + k;
        g.beginPath(); g.arc(mx, my, mr * (1.6 + k * .9), 0, Math.PI * 2); g.stroke();
      }
      g.save();
      g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.clip();
      g.fillStyle = '#EEF1FF'; g.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
      g.fillStyle = '#060918';
      g.beginPath(); g.arc(mx + mr * .45, my - mr * .2, mr * .86, 0, Math.PI * 2); g.fill();
      g.restore();
      for (let k = 0; k < 70; k++) {
        const x = r() * w, y = r() * h * .9, s = .6 + r() * 1.8;
        const glow = g.createRadialGradient(x, y, 0, x, y, s * 6);
        glow.addColorStop(0, 'rgba(255,255,255,.9)'); glow.addColorStop(.25, 'rgba(191,203,255,.35)'); glow.addColorStop(1, 'rgba(191,203,255,0)');
        g.fillStyle = glow;
        g.beginPath(); g.arc(x, y, s * 6, 0, Math.PI * 2); g.fill();
      }
    };
    return { strokes, finish };
  }
  const SKY = `const skyPainter = ${skyPainter.toString()};
  self.onmessage = (e) => {
    const { w, h, n, steps } = e.data;
    const cv = new OffscreenCanvas(w, h);
    const g = cv.getContext('2d', { willReadFrequently: true });
    if (!g) { self.postMessage({ fail: true }); return; }
    const p = skyPainter(g, w, h, n, steps);
    p.strokes(0, n);
    p.finish();
    const bmp = cv.transferToImageBitmap();
    self.postMessage({ bmp }, [bmp]);
  };`;
  const sky = (canvas) => {
    if (!canvas) return null;
    let started = false;
    const N = 2600, STEPS = 150;
    // no worker drawing here: paint on the page, a slice at a time so scrolling stays smooth
    const inPage = (w, h) => {
      canvas.width = w;
      canvas.height = h;
      const g = canvas.getContext('2d');
      if (!g) return;
      const p = skyPainter(g, w, h, N, STEPS);
      let i = 0;
      const slice = () => {
        const end = Math.min(N, i + 140);
        p.strokes(i, end);
        i = end;
        if (i < N) setTimeout(slice, 16);
        else { p.finish(); canvas.classList.add('is-painted'); }
      };
      slice();
    };
    const paint = () => {
      if (started) return;
      started = true;
      // 1x is plenty for a soft painting under a dark veil, and keeps the upload to the graphics card small
      const w = Math.round(Math.min(1700, Math.max(640, canvas.clientWidth))), h = Math.round(Math.min(1400, Math.max(480, canvas.clientHeight)));
      if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') { inPage(w, h); return; }
      let url, wk;
      const fallback = () => { if (wk) wk.terminate(); if (url) URL.revokeObjectURL(url); inPage(w, h); };
      try {
        url = URL.createObjectURL(new Blob([SKY], { type: 'text/javascript' }));
        wk = new Worker(url);
        wk.onmessage = ({ data }) => {
          if (data.fail || !data.bmp) { fallback(); return; }
          canvas.width = data.bmp.width;
          canvas.height = data.bmp.height;
          const g = canvas.getContext('bitmaprenderer');
          if (g) g.transferFromImageBitmap(data.bmp);
          else canvas.getContext('2d').drawImage(data.bmp, 0, 0);
          canvas.classList.add('is-painted');
          wk.terminate();
          URL.revokeObjectURL(url);
        };
        wk.onerror = fallback;
        wk.postMessage({ w, h, n: N, steps: STEPS });
      } catch (e) {
        fallback();
      }
    };
    // normally painted while the page sits idle after the intro; this catches a fast scroll
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); paint(); } }, { rootMargin: '150% 0px' });
    io.observe(canvas);
    return paint;
  };

  /* ---------- the terminus orb: points on a sphere, the cursor pushes them away ---------- */
  const orb = (canvas) => {
    if (!canvas) return;
    let gl = null;
    try { gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' }); } catch (e) {}
    if (!gl) { canvas.remove(); return; }
    const VS = `
      attribute vec3 p; attribute float k;
      uniform float t, dpr, push; uniform vec2 m;
      varying float vA;
      void main() {
        float c = cos(t * .16), s = sin(t * .16);
        vec3 q = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
        float cx = cos(.42), sx = sin(.42);
        q = vec3(q.x, cx * q.y - sx * q.z, sx * q.y + cx * q.z);
        q *= 1. + .035 * sin(t * .9 + p.y * 5.);
        float per = 2.4 / (3.1 - q.z);
        vec2 xy = q.xy * per * .82;
        vec2 d = xy - m;
        float dist = length(d);
        xy += d / (dist + 1e-4) * push * smoothstep(.5, 0., dist) * .2;
        gl_Position = vec4(xy, 0., 1.);
        gl_PointSize = (1.5 + k * 2.2) * per * dpr;
        vA = .3 + .7 * smoothstep(-1., 1., q.z);
      }`;
    const FS = `
      precision mediump float;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - .5);
        if (d > .5) discard;
        float a = smoothstep(.5, .08, d) * vA;
        vec3 col = mix(vec3(.75, .8, 1.), vec3(1.), vA);
        gl_FragColor = vec4(col * a, a);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(pr, 0, 'p');
    gl.bindAttribLocation(pr, 1, 'k');
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { canvas.remove(); return; }
    const N = matchMedia('(max-width: 899px), (orientation: landscape) and (max-height: 540px)').matches ? 1500 : 2600;
    const r = rng(2600);
    const data = new Float32Array(N * 4);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), a = i * golden;
      const j = 1 + (r() - 0.5) * 0.05;
      data.set([Math.cos(a) * rad * j, y * j, Math.sin(a) * rad * j, r()], i * 4);
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.useProgram(pr);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12);
    const U = (n) => gl.getUniformLocation(pr, n);
    const uT = U('t'), uD = U('dpr'), uP = U('push'), uM = U('m');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const mouse = { x: 9, y: 9, tx: 9, ty: 9, push: 0, tp: 0 };
    let d = 1;
    const size = () => {
      d = DPR(1.5);
      canvas.width = Math.round(canvas.clientWidth * d);
      canvas.height = Math.round(canvas.clientHeight * d);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const host = canvas.parentElement;
    host.addEventListener('pointermove', (e) => {
      const b = canvas.getBoundingClientRect();
      mouse.tx = ((e.clientX - b.left) / b.width) * 2 - 1;
      mouse.ty = -(((e.clientY - b.top) / b.height) * 2 - 1);
      mouse.tp = 1;
    });
    host.addEventListener('pointerleave', () => { mouse.tp = 0; });
    let raf = 0, on = false, t0 = performance.now();
    const TOUCH = matchMedia('(pointer: coarse)').matches; // on touch screens it holds still mid-scroll
    const frame = (now) => {
      raf = 0;
      if (!on) return;
      if (TOUCH && now - (window.LINE_SCROLL_AT || -1e9) < 150) { raf = requestAnimationFrame(frame); return; }
      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;
      mouse.push += (mouse.tp - mouse.push) * 0.06;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uT, reduced ? 2 : (now - t0) / 1000);
      gl.uniform1f(uD, d);
      gl.uniform1f(uP, mouse.push);
      gl.uniform2f(uM, mouse.x, mouse.y);
      gl.drawArrays(gl.POINTS, 0, N);
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    size();
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); if (on && !raf) raf = requestAnimationFrame(frame); }, 200); });
    new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      if (on && !raf) raf = requestAnimationFrame(frame);
    }, { rootMargin: '10% 0px' }).observe(canvas);
  };

  /* ---------- boot: posters draw as they come near ---------- */
  const boot = () => {
    const posters = Array.from(document.querySelectorAll('.poster[data-key]'));
    const drawn = new WeakSet();
    const draw = (p) => {
      if (drawn.has(p)) return;
      drawn.add(p);
      io.unobserve(p);
      poster(p.dataset.key, p.querySelector('.poster__art'));
    };
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) draw(e.target); }), { rootMargin: '0px 120% 120% 0px' });
    const start = () => posters.forEach((p) => io.observe(p));
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start, start);
    // once the intro has played, draw one poster per idle moment, then the sky, so nothing is drawn mid-scroll
    const idle = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 600 }) : (f) => setTimeout(f, 80);
    let paintSky = null;
    document.addEventListener('line:ready', () => {
      const queue = posters.slice();
      const next = () => {
        const p = queue.shift();
        if (p) { draw(p); idle(next); } else if (paintSky) idle(paintSky);
      };
      idle(next);
    }, { once: true });
    let t;
    addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => posters.forEach((p) => {
        const c = p.querySelector('.poster__art');
        if (!c || c.width <= 1) return;
        const size = c.clientWidth + 'x' + c.clientHeight;
        if (c.dataset.size !== size) { c.dataset.size = size; poster(p.dataset.key, c); }
      }), 250);
    });
    rim(document.querySelector('.hero__photo'), document.querySelector('.hero__rim'));
    paintSky = sky(document.querySelector('.about__sky'));
    orb(document.querySelector('.terminus__orb'));
  };

  window.LINE_ART = { poster, dots };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
