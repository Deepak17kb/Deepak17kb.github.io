/* =========================================================
   The cloud: nine thousand points of light that follow the visitor down the page.
   It comes out of the tie as the opening scrolls, pours into the full stop, returns as stars,
   and builds each project in turn, then the win. Raw WebGL points, no library.

   Shapes are built the way a nano suit is, in layers. Every point belongs to a plate, a small patch
   of the shape. On a change the fine detail closes into plates, the plates melt, and the metal runs
   to the shape's home point and on as one stream of liquid to the new shape's home point. There it
   floods outward, plates flip into place on it as hexagons, and they open into fine detail.
   The liquid is the same points drawn again, as soft blobs into a half-size buffer, then thresholded
   into one surface and shaded like polished metal.

   Numbers in the shapes are real: LifeLine's 40 locations and 83 roads, UPI Risk Desk's
   5 agents, Darklytics' eight sold-out shares. Where the page says a project is a shape,
   the shape is built from that project's own figures.
   Without WebGL the page keeps its drawn project tiles and only the words change.
   ========================================================= */
(() => {
  const root = document.documentElement;
  const canvas = document.querySelector('.holo');
  const face = document.querySelector('.hero__face');
  const dotEl = document.querySelector('.hero__dot');
  const wordEl = document.querySelector('.hero__word');
  const proofEl = document.querySelector('.hero__proof');
  if (!canvas || !wordEl) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LINES = [
    { word: 'graph engines', proof: 'LifeLine: 40 locations, 83 roads', href: '#lifeline' },
    { word: 'AI agents', proof: 'UPI Risk Desk: 5 AI risk agents', href: '#upi' },
    { word: 'data stories', proof: 'Darklytics: what sold out first', href: '#darklytics' },
    { word: 'risk engines', proof: 'BroadBridge: thousands of simulated markets', href: '#broadbridge' },
    { word: 'full-stack apps', proof: 'NER SafeRoute: 3,447 road segments', href: '#saferoute' },
  ];
  const HOLD = 5.4; // seconds each word stays
  const BUILD = 2.3; // seconds for one shape to come apart and the next to assemble
  const CELL = 0.2; // a plate's size, in shape units
  const KANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

  /* ---------- The line beside the name ---------- */
  let line = 0, wordTimer = 0;
  const showWord = (text) => {
    clearInterval(wordTimer);
    if (reduced) { wordEl.textContent = text; return; }
    const from = performance.now();
    wordTimer = setInterval(() => {
      const p = Math.min(1, (performance.now() - from) / 560);
      const done = Math.floor(p * text.length);
      wordEl.textContent = text.slice(0, done) + [...text.slice(done)].map((c) => (c === ' ' ? ' ' : KANA[(Math.random() * KANA.length) | 0])).join('');
      if (p === 1) clearInterval(wordTimer);
    }, 45);
  };
  const setLine = (i) => {
    line = (i + LINES.length) % LINES.length;
    showWord(LINES[line].word);
    if (proofEl) {
      proofEl.setAttribute('href', LINES[line].href);
      proofEl.firstElementChild.textContent = LINES[line].proof;
    }
  };

  let cycling = 0;
  const cycle = () => {
    setLine(line + 1);
    if (window.DKB_SUIT) window.DKB_SUIT.ripple();
  };
  const startWords = () => { if (!cycling && !reduced) cycling = setInterval(cycle, HOLD * 1000); };
  wordEl.addEventListener('click', () => { clearInterval(cycling); cycling = 0; cycle(); startWords(); });
  document.addEventListener('dkb:intro', startWords);
  setTimeout(startWords, 9000); // if the intro never ran

  /* ---------- WebGL, or just the words ---------- */
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl || reduced) { canvas.remove(); return; }
  root.classList.add('has-holo');

  const N = innerWidth < 861 ? 4200 : 11000;

  /* ---------- Shapes: x, y, z in roughly ±1.45, ±1, ±1, then heat (1 = the highlighted route) ---------- */
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const shape = (fn, seed) => {
    const d = new Float32Array(N * 4);
    const r = rng(seed);
    const gauss = () => (r() + r() + r() + r() - 2) / 2; // thick in the middle, in -1..1
    let i = 0;
    const put = (x, y, z, heat = 0) => {
      if (i >= N) return;
      d[i * 4] = x; d[i * 4 + 1] = y; d[i * 4 + 2] = z; d[i * 4 + 3] = heat;
      i++;
    };
    const home = fn(put, r, gauss, N);
    while (i < N) { const j = (r() * Math.max(1, i)) | 0; put(d[j * 4], d[j * 4 + 1], d[j * 4 + 2], d[j * 4 + 3]); }
    return plated(d, home, r);
  };
  // each point learns its plate's centre and when that plate locks: nearest the shape's home point first.
  // With no home (the stars) every point is its own plate.
  const plated = (p, home, r) => {
    const groups = new Map();
    for (let i = 0; i < N; i++) {
      const k = home ? (Math.floor(p[i * 4] / CELL) + 64) + (Math.floor(p[i * 4 + 1] / CELL) + 64) * 128 + (Math.floor(p[i * 4 + 2] / CELL) + 64) * 16384 : i;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(i);
    }
    const plates = [...groups.values()].map((ids) => {
      const c = [0, 1, 2].map((a) => ids.reduce((s, i) => s + p[i * 4 + a], 0) / ids.length);
      return { ids, c, at: home ? dist(c, home) : r() };
    });
    const far = Math.max(...plates.map((q) => q.at));
    const d = new Float32Array(N * 8);
    plates.forEach(({ ids, c, at }) => {
      const order = home ? (at / far) * 0.84 + r() * 0.16 : at;
      // one point in each plate draws the hexagon: its order carries a +2
      ids.forEach((i, n) => d.set([p[i * 4], p[i * 4 + 1], p[i * 4 + 2], p[i * 4 + 3], c[0], c[1], c[2], order + (n ? 0 : 2)], i * 8));
    });
    return { data: d, home: home || [0, 0, 0] };
  };

  // LifeLine: 40 locations, 83 roads, and the route that survives
  const graph = (put, r, gauss, n) => {
    const nodes = [];
    for (let g = 0; nodes.length < 40 && g < 40000; g++) {
      const p = [(r() * 2 - 1) * 1.5, (r() * 2 - 1) * 0.98, (r() * 2 - 1) * 0.9];
      if ((p[0] / 1.5) ** 2 + (p[1] / 0.98) ** 2 + (p[2] / 0.9) ** 2 > 1) continue;
      if (nodes.every((q) => dist(p, q) > 0.34)) nodes.push(p);
    }
    const pairs = [];
    nodes.forEach((a, i) => nodes.forEach((b, j) => j > i && pairs.push([dist(a, b), i, j])));
    pairs.sort((a, b) => a[0] - b[0]);
    // a spanning tree first, so everything is reachable; then the shortest roads left, up to 83
    const root_ = nodes.map((_, i) => i);
    const find = (x) => (root_[x] === x ? x : (root_[x] = find(root_[x])));
    const roads = [];
    const used = new Set();
    pairs.forEach(([, a, b], k) => {
      if (find(a) !== find(b)) { root_[find(a)] = find(b); roads.push([a, b]); used.add(k); }
    });
    pairs.forEach(([, a, b], k) => { if (roads.length < 83 && !used.has(k)) roads.push([a, b]); });
    // Dijkstra, leftmost to rightmost
    const adj = nodes.map(() => []);
    roads.forEach(([a, b]) => { const w = dist(nodes[a], nodes[b]); adj[a].push([b, w]); adj[b].push([a, w]); });
    const start = nodes.reduce((m, p, i) => (p[0] < nodes[m][0] ? i : m), 0);
    const end = nodes.reduce((m, p, i) => (p[0] > nodes[m][0] ? i : m), 0);
    const best = nodes.map(() => Infinity), prev = nodes.map(() => -1), seen = nodes.map(() => false);
    best[start] = 0;
    for (;;) {
      let u = -1;
      best.forEach((v, i) => { if (!seen[i] && v < Infinity && (u < 0 || v < best[u])) u = i; });
      if (u < 0) break;
      seen[u] = true;
      adj[u].forEach(([v, w]) => { if (best[u] + w < best[v]) { best[v] = best[u] + w; prev[v] = u; } });
    }
    const route = new Set();
    for (let v = end; prev[v] !== -1; v = prev[v]) route.add(Math.min(v, prev[v]) + '-' + Math.max(v, prev[v]));
    const onRoute = ([a, b]) => route.has(Math.min(a, b) + '-' + Math.max(a, b));
    nodes.forEach((p, i) => {
      const count = (n * 0.32) / 40, hot = i === end ? 2 : i === start ? 1 : 0; // the route starts in red and arrives in gold
      for (let k = 0; k < count; k++) put(p[0] + gauss() * 0.075, p[1] + gauss() * 0.075, p[2] + gauss() * 0.075, hot);
    });
    const weights = roads.map((e) => dist(nodes[e[0]], nodes[e[1]]) * (onRoute(e) ? 2.6 : 1));
    const total = weights.reduce((a, b) => a + b, 0);
    roads.forEach((e, k) => {
      const count = (n * 0.68 * weights[k]) / total;
      const a = nodes[e[0]], b = nodes[e[1]], hot = onRoute(e) ? 1 : 0;
      for (let c = 0; c < count; c++) {
        const t = r();
        put(a[0] + (b[0] - a[0]) * t + gauss() * 0.012, a[1] + (b[1] - a[1]) * t + gauss() * 0.012, a[2] + (b[2] - a[2]) * t + gauss() * 0.012, hot);
      }
    });
    return nodes[start];
  };

  // UPI Risk Desk: five agents around a desk, and the dispute ring they close
  const agents = (put, r, gauss, n) => {
    const orb = (cx, cy, cz, rad, count, heat = 0) => {
      for (let k = 0; k < count; k++) {
        const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), ra = rad * (0.82 + 0.18 * r());
        put(cx + ra * Math.sin(ph) * Math.cos(th), cy + ra * Math.cos(ph), cz + ra * Math.sin(ph) * Math.sin(th), heat);
      }
    };
    const spots = [0, 1, 2, 3, 4].map((k) => {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      return [Math.cos(a) * 1.25, 0, Math.sin(a) * 1.05];
    });
    orb(0, 0, 0, 0.3, n * 0.2, 1);
    spots.forEach((s) => orb(s[0], s[1], s[2], 0.2, n * 0.08));
    spots.forEach((s, k) => {
      const q = spots[(k + 1) % 5];
      for (let c = 0; c < n * 0.05; c++) { // the ring, bowed outward
        const t = r(), bow = 1 + 0.14 * Math.sin(t * Math.PI);
        put((s[0] + (q[0] - s[0]) * t) * bow, gauss() * 0.02, (s[2] + (q[2] - s[2]) * t) * bow, 1);
      }
      for (let c = 0; c < n * 0.03; c++) { const t = r(); put(s[0] * t, gauss() * 0.02, s[2] * t); }
    });
    return [0, 0, 0];
  };

  // Darklytics: the eight aisles, each as tall as the share of it that sold out
  const bars = (put, r, gauss, n) => {
    const shares = [15.8, 14.3, 14.1, 9.5, 7.7, 4.5, 3.7, 1.8];
    const sum = shares.reduce((a, b) => a + b + 3, 0);
    shares.forEach((v, k) => {
      const x = -1.4 + (2.8 * k) / 7, z = 0.16 * Math.cos((k / 7) * Math.PI * 2);
      const h = (v / 15.8) * 1.72, w = 0.14, base = -0.92;
      const count = (n * 0.86 * (v + 3)) / sum;
      for (let c = 0; c < count; c++) {
        const face_ = r(), y = base + r() * h;
        const a = r() * 2 - 1;
        const hot = y > base + h - 0.1 ? 1 : 0;
        if (face_ < 0.34) { const sx = r() < 0.5 ? -1 : 1, sz = r() < 0.5 ? -1 : 1; put(x + sx * w, y, z + sz * w, hot); } // the four corners stay crisp
        else if (face_ < 0.62) put(x + a * w, y, z + (r() < 0.5 ? -w : w), hot);
        else if (face_ < 0.86) put(x + (r() < 0.5 ? -w : w), y, z + a * w, hot);
        else put(x + a * w, base + h, z + (r() * 2 - 1) * w, 1);
      }
    });
    for (let c = 0; c < n * 0.14; c++) {
      const grid = r() < 0.5;
      const p = -1.6 + r() * 3.2, q = Math.round(r() * 6) / 6 * 1.4 - 0.7;
      put(grid ? p : Math.round((p + 1.6) / 0.4) * 0.4 - 1.6, -0.94, grid ? q : (r() * 2 - 1) * 0.7);
    }
    return [-1.4, -0.92, 0];
  };

  // BroadBridge: one goal against thousands of simulated markets
  const fan = (put, r, gauss, n) => {
    const PATHS = 46, STEPS = 48;
    const paths = [];
    for (let p = 0; p < PATHS; p++) {
      const drift = 0.25 + 1.5 * (p / (PATHS - 1)) ** 1.1;
      const z = (r() * 2 - 1) * 0.7;
      let y = 0;
      const line_ = [];
      for (let s = 0; s <= STEPS; s++) {
        const t = s / STEPS;
        y += (r() - 0.5) * 0.09 * (0.3 + t);
        line_.push([-1.45 + 2.9 * t, -0.8 + drift * t + y * t, z * t]);
      }
      paths.push(line_);
    }
    const sample = (line_, heat, spread) => {
      const t = r() * STEPS, a = line_[t | 0], b = line_[Math.min(STEPS, (t | 0) + 1)], f = t % 1;
      put(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f + gauss() * spread, a[2] + (b[2] - a[2]) * f, heat);
    };
    const median = paths[PATHS >> 1];
    for (let c = 0; c < n * 0.84; c++) sample(paths[(r() * PATHS) | 0], 0, 0.006);
    for (let c = 0; c < n * 0.1; c++) sample(median, 1, 0.012);
    for (let c = 0; c < n * 0.06; c++) { // the goal
      const x = -1.45 + r() * 2.9;
      if (((x + 2) * 8) % 1 < 0.6) put(x, 0.72, 0, 2);
      else put(x + 0.02, 0.72, 0, 2);
    }
    return [-1.45, -0.8, 0];
  };

  // full stack: four layers with data running through them
  const stack = (put, r, gauss, n) => {
    const levels = [-0.84, -0.28, 0.28, 0.84];
    const W = 1.2, D = 0.86;
    levels.forEach((y) => {
      for (let c = 0; c < n * 0.21; c++) {
        const k = r();
        if (k < 0.42) { // the rim
          const e = r() * 2 * (W + D);
          let x, z;
          if (e < W) { x = -W + 2 * e; z = -D; }
          else if (e < W + D) { x = W; z = -D + 2 * (e - W); }
          else if (e < 2 * W + D) { x = W - 2 * (e - W - D); z = D; }
          else { x = -W; z = D - 2 * (e - 2 * W - D); }
          put(x, y, z);
        } else { // a grid of cells on the plate
          const lines = 7, along = r() < 0.5;
          const p = (r() * 2 - 1), q = Math.round(((r() * 2 - 1) * lines) / 2) / (lines / 2);
          put(along ? p * W : q * W, y, along ? q * D : p * D);
        }
      }
    });
    for (let c = 0; c < n * 0.16; c++) put(gauss() * 0.05, -0.84 + r() * 1.68, gauss() * 0.05, 1);
    return [0, -0.84, 0];
  };

  // NER SafeRoute: mountains in contour lines, and the road that goes around
  const terrain = (put, r, gauss, n) => {
    const peaks = [[0.1, 0.1, 1, 0.42], [-0.85, -0.45, 0.62, 0.34], [0.9, 0.5, 0.7, 0.36], [0.75, -0.6, 0.45, 0.3], [-0.6, 0.6, 0.5, 0.3]];
    const h = (x, z) => peaks.reduce((s, [px, pz, a, w]) => s + a * Math.exp(-((x - px) ** 2 + (z - pz) ** 2) / (2 * w * w)), 0);
    const y = (v) => -0.62 + v * 1.15;
    let placed = 0;
    for (let g = 0; placed < n * 0.84 && g < n * 40; g++) {
      const x = (r() * 2 - 1) * 1.45, z = (r() * 2 - 1) * 1;
      const v = h(x, z);
      if (((v * 9) % 1) > 0.26) continue; // keep only the contour bands
      put(x, y(v), z);
      placed++;
    }
    const curve = (t) => {
      const x = -1.35 + 2.7 * t;
      const z = 0.8 - 1.5 * t + 0.62 * Math.sin(t * Math.PI) ** 2; // swings wide of the main peak
      return [x, z];
    };
    for (let c = 0; c < n * 0.16; c++) {
      const [x, z] = curve(r());
      put(x + gauss() * 0.012, y(h(x, z)) + 0.03, z + gauss() * 0.012, 1);
    }
    const [x0, z0] = curve(0);
    return [x0, y(h(x0, z0)), z0];
  };

  const stars = (put, r) => { for (let i = 0; i < N; i++) put(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1); };

  // the housing: every point packed into the tie, waiting for the opening's scroll
  const seedShape = (put, r, gauss) => { for (let i = 0; i < N; i++) put(gauss() * 0.3, gauss() * 0.3, gauss() * 0.3); return [0, 0, 0]; };

  // "#1", sampled from the heading font
  const winnerShape = () => {
    const off = document.createElement('canvas');
    const W = 640, H = 340;
    off.width = W; off.height = H;
    const c = off.getContext('2d', { willReadFrequently: true });
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 300px "Cal Sans", "Inter Tight", sans-serif`;
    c.fillText('#1', W / 2, H / 2 + 8);
    const px = c.getImageData(0, 0, W, H).data;
    const spots = [];
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (px[(y * W + x) * 4 + 3] > 128) spots.push([x, y]);
    return shape((put, r, gauss) => {
      for (let i = 0; i < N && spots.length; i++) {
        const [x, y] = spots[(r() * spots.length) | 0];
        const mx = ((x + r() * 2) / W - 0.5) * 3, my = (0.5 - (y + r() * 2) / H) * 1.6;
        put(mx, my, gauss() * 0.05, 1);
      }
      return [-1.3, -0.72, 0];
    }, 11);
  };

  const SHAPES = { seed: shape(seedShape, 1), graph: shape(graph, 40), agents: shape(agents, 5), bars: shape(bars, 8), fan: shape(fan, 46), stack: shape(stack, 4), terrain: shape(terrain, 3447), stars: shape(stars, 9) };
  const LOOK = {
    seed: { pitch: 0, fit: 0.3 }, graph: { pitch: 0.26, spin: 1, fit: 1 }, agents: { pitch: 0.62, spin: 1, fit: 0.92 }, bars: { pitch: 0.2, fit: 0.9 }, fan: { pitch: 0.1, fit: 0.9 },
    stack: { pitch: 0.62, spin: 1, fit: 0.74 }, terrain: { pitch: 0.66, spin: 1, fit: 0.76 }, winner: { pitch: 0, sway: 0.2, fit: 1.7 }, stars: { pitch: 0, fit: 1 },
  };

  /* ---------- GPU ---------- */
  const VERT = `
  precision highp float;
  attribute vec4 a_from, a_fp, a_to, a_tp;
  attribute vec3 a_seed;
  uniform vec2 u_res, u_cf, u_ct, u_dot, u_ptr;
  uniform vec3 u_hf, u_ht, u_c1, u_c2, u_c3, u_spark, u_gold;
  uniform float u_sf, u_st, u_t, u_time, u_yaw, u_pitch, u_collapse, u_alpha;
  uniform float u_vel, u_scroll, u_starF, u_starT, u_dpr, u_ps, u_ptrOn, u_light, u_pass, u_weight, u_liquid, u_bow, u_hotOnly;
  varying vec3 v_c; varying float v_a, v_hex, v_flip;
  const float PI = 3.14159265;
  vec3 spin(vec3 p) {
    float c = cos(u_yaw), s = sin(u_yaw);
    p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
    c = cos(u_pitch); s = sin(u_pitch);
    return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
  }
  // screen position (px, y down) and nearness 0..1
  vec3 place(vec3 a, vec2 c, float sc, float star) {
    if (star > .5) {
      float d = a.z * .5 + .5;
      float y = fract(a.y * .5 + .5 - u_scroll * (.00012 + .00042 * d));
      return vec3((a.x * .5 + .5) * u_res.x, y * u_res.y, d);
    }
    vec3 p = spin(a);
    float k = 3.6 / (3.6 - p.z);
    return vec3(c.x + p.x * k * sc, c.y - p.y * k * sc, clamp(.5 + p.z * .42, 0., 1.));
  }
  float ramp(float a, float b) { float x = clamp((u_t - a) / (b - a), 0., 1.); return x * x * (3. - 2. * x); }
  float bump(float a, float b) { return sin(clamp((u_t - a) / (b - a), 0., 1.) * PI); }
  vec3 tint(float g) { g = clamp(g, 0., 1.); return g < .5 ? mix(u_c1, u_c2, g * 2.) : mix(u_c2, u_c3, g * 2. - 1.); }
  void main() {
    float seed = a_seed.x, rnd = a_seed.z;
    float leadF = step(1.5, a_fp.w), leadT = step(1.5, a_tp.w);
    float fo = a_fp.w - 2. * leadF, to = a_tp.w - 2. * leadT;

    // when this point moves: the outline goes up first, the plates fill it in, nearest the home point first
    float first = step(seed, .16);
    float dep = fo * .2 + rnd * .03;
    float lat = max(dep + .16, .3 + .1 * seed); // reaches the new home point
    float arr = max(lat + .06, first > .5 ? .34 + to * .16 : .46 + to * .32);
    float a0 = ramp(dep, dep + .05);        // gather into its plate
    float a1 = ramp(dep + .04, dep + .15);  // melt and drain to the old shape's home point
    float b = ramp(dep + .1, lat);          // run down the stream
    float c = ramp(lat, arr + .05);         // flood out from the home point, the far plates last
    float d = ramp(arr + .05, arr + .13);   // the plate opens into detail

    vec3 A = place(a_from.xyz, u_cf, u_sf, u_starF), Ap = place(a_fp.xyz, u_cf, u_sf, u_starF);
    vec3 B = place(a_to.xyz, u_ct, u_st, u_starT), Bp = place(a_tp.xyz, u_ct, u_st, u_starT);
    vec2 ha = place(u_hf, u_cf, u_sf, 0.).xy, hb = place(u_ht, u_ct, u_st, 0.).xy;
    if (u_starF > .5) ha = hb;
    if (u_starT > .5) hb = ha;
    vec2 bow = vec2(hb.y - ha.y, ha.x - hb.x) * .26;
    float ub = 1. - b;
    vec2 ride = ub * ub * ha + 2. * ub * b * ((ha + hb) * .5 + bow) + b * b * hb;
    float tw = rnd * 6.283 + b * 9.;
    ride += vec2(cos(tw), sin(tw)) * sin(b * PI) * (3. + 11. * seed);
    vec2 px = A.xy + a0 * (Ap.xy - A.xy) + a1 * (ha - Ap.xy) + (ride - ha) + c * (Bp.xy - hb) + d * (B.xy - Bp.xy);

    float near = mix(A.z, B.z, c);
    float heat = mix(a_from.w, a_to.w, c);
    float lock = bump(arr, arr + .17);
    float stream = bump(dep + .1, arr);

    // a plate: its one lead point draws as a hexagon while it peels off or locks on
    float lp = clamp((u_t - arr - .01) / .2, 0., 1.);
    float hexIn = bump(arr + .01, arr + .21);
    float hexOut = bump(dep, dep + .13) * (1. - u_starF);
    float wave = (to - fract(u_time * .085)) * 15.;
    float pulse = (1. - u_starT) * step(.999, u_t) * exp(-wave * wave);
    float hex = max(leadT * max(hexIn * (1. - u_starT), pulse * .6), leadF * hexOut);
    float redHex = step(.015, hex) * step(rnd, .3); // three plates in ten are red, each a colour of its own
    float goldHex = step(.015, hex) * step(.3, rnd) * step(rnd, .46); // and some are gold
    if (leadT > .5) px = mix(px, Bp.xy, hexIn * (1. - u_starT));
    if (leadF > .5) px = mix(px, Ap.xy, hexOut * step(u_t, dep + .13));
    v_flip = hexOut > hexIn ? 1. - a0 * .6 : sin(min(lp * 2.4, 1.) * PI * .5);
    if (pulse > hexIn && pulse > hexOut) v_flip = .75 + .25 * sin(u_time + rnd * 6.);
    v_hex = hex;

    px += vec2(sin(u_time * 1.1 + rnd * 50.), cos(u_time * .9 + rnd * 31.)) * .7; // shimmer
    px.y += u_vel * (seed - .5) * 1.6;                                            // the cloud drags with the scroll

    float starry = max(u_starF * (1. - a1), u_starT * c);
    float size = a_seed.y * (.7 + .6 * near) * (1. + lock * 1.1 + pulse * .6) * mix(1., .56, starry);
    float alpha = (.55 + .45 * near) * mix(1., step(seed, .28) * .62, starry); // fewer, fainter stars, so type stays clean
    alpha *= mix(1., .5, first * (1. - ramp(.78, .94)) * c * (1. - u_starT));   // the outline waits, faint, for its plates

    if (u_ptrOn > .001) {
      vec2 q = px - u_ptr; float l = length(q);
      if (l < 110. && l > .01) { float f = 1. - l / 110.; px += q / l * f * f * 62. * u_ptrOn; }
    }
    float pour = smoothstep(seed * .62, .38 + seed * .62, u_collapse);
    vec2 arc = vec2(px.y - u_dot.y, u_dot.x - px.x) * u_bow;
    px = mix(px, u_dot, pour * pour) + arc * sin(pour * PI);
    px += vec2(sin(pour * 14. + rnd * 6.283), cos(pour * 14. + rnd * 6.283)) * sin(pour * PI) * (2. + 8. * seed);

    float twinkle = .74 + .26 * sin(u_time * 2. + rnd * 80.);
    if (heat > .5) twinkle = .85 + .4 * sin(u_time * 3. - (B.x + B.y) * .018);
    v_a = alpha * twinkle * u_alpha * (1. + stream * .5);

    vec3 q3 = spin(a_to.xyz);
    float g = u_starT * seed + (1. - u_starT) * (.5 + q3.y * .27 + q3.x * .17 + .09 * sin(u_time * .4 + to * 5.));
    vec3 col = mix(tint(b), tint(g), c) * (.72 + .42 * near);
    col = mix(col, u_spark, max(smoothstep(.3, .7, heat), redHex));
    col = mix(col, u_gold, max(smoothstep(1.3, 1.7, heat), goldHex));
    col = mix(col, vec3(1.), max(lock * .3, pulse * .18) * (1. - u_light));
    v_c = col;

    gl_Position = vec4(px.x / u_res.x * 2. - 1., 1. - px.y / u_res.y * 2., 0., 1.);

    // how much of this point is liquid just now: from the melt until a plate takes it
    float liq = ramp(dep + (u_starF > .5 ? .12 : .03), dep + (u_starF > .5 ? .17 : .12)) * (1. - ramp(u_starT > .5 ? lat : arr - .02, u_starT > .5 ? lat + .08 : arr + .08));
    liq = max(liq, sin(clamp(pour * 1.15, 0., 1.) * PI) * step(.001, u_collapse)) * u_liquid;
    if (u_pass > .5) { // the liquid pass: only a soft blob for each liquid point
      if (liq < .01) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; return; }
      v_a = liq * u_weight; v_hex = 0.;
      gl_PointSize = (15. + 11. * seed) * u_ps * u_dpr * .5;
      return;
    }
    v_a *= 1. - liq * .9;
    if (u_hotOnly > .5 && heat < .5 && redHex + goldHex < .5) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; return; }

    float plate = ${CELL.toFixed(2)} * 1.35 * (hexOut > hexIn ? u_sf : u_st);
    gl_PointSize = max(1., mix(size * u_ps * (1. + .4 * u_hotOnly), plate, step(.015, hex)) * u_dpr * (1. - pour * .5));
  }`;
  const FRAG = `
  precision mediump float;
  varying vec3 v_c; varying float v_a, v_hex, v_flip;
  uniform float u_scan, u_over, u_blob;
  void main() {
    vec2 q = (gl_PointCoord - .5) * 2.;
    if (u_blob > .5) { float b = 1. - dot(q, q); if (b < 0.) discard; gl_FragColor = vec4(b * b * v_a); return; }
    float scan = .86 + .14 * sin(gl_FragCoord.y * .9 - u_scan); // the faint bands of a projection
    if (v_hex > .015) { // a plate, turning to face you as it locks
      q.x /= max(v_flip, .1);
      float d = max(abs(q.x), abs(q.x) * .5 + abs(q.y) * .866);
      if (d > .866) discard;
      float a = min(1., (smoothstep(.62, .8, d) * 1.15 + .13) * (1. - smoothstep(.83, .866, d)) * v_hex * v_a);
      gl_FragColor = vec4(v_c * a * scan, a * u_over);
      return;
    }
    float r = dot(q, q);
    if (r > 1.) discard;
    float g = 1. - r; g = g * sqrt(g);
    gl_FragColor = vec4(v_c * g * v_a * scan, g * v_a * u_over); // part light, part paint: dense patches keep their colour instead of burning white
  }`;

  // one sheet over the screen: where the blobs add up to enough, there is a surface
  const SHEET_VERT = `
  attribute vec2 a_q;
  varying vec2 v_q;
  void main() { v_q = a_q * .5 + .5; gl_Position = vec4(a_q, 0., 1.); }`;
  const SHEET_FRAG = `
  precision highp float;
  uniform sampler2D u_d;
  uniform vec2 u_step;
  uniform vec3 u_c1, u_c2, u_c3;
  uniform float u_shine, u_clock;
  varying vec2 v_q;
  ${window.DKB_CHROME || ''}
  void main() {
    float h = texture2D(u_d, v_q).r;
    float a = smoothstep(.2, .3, h);
    if (a < .004) discard;
    vec2 n = vec2(texture2D(u_d, v_q - vec2(u_step.x, 0.)).r - texture2D(u_d, v_q + vec2(u_step.x, 0.)).r,
                  texture2D(u_d, v_q - vec2(0., u_step.y)).r - texture2D(u_d, v_q + vec2(0., u_step.y)).r) * 3.4;
    vec3 c = chrome(n, v_q.x * 1.3 - v_q.y * .8 + u_clock * .06);
    gl_FragColor = vec4(c * a, a) * u_shine;
  }`;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  const giveUp = () => { root.classList.remove('has-holo'); canvas.remove(); };
  if (!vs || !fs) return giveUp();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return giveUp();

  // without the liquid the points still make the journey; only the surface is missing
  let sheet = (() => {
    const a = window.DKB_CHROME && compile(gl.VERTEX_SHADER, SHEET_VERT), b = window.DKB_CHROME && compile(gl.FRAGMENT_SHADER, SHEET_FRAG);
    if (!a || !b) return null;
    const p = gl.createProgram();
    gl.attachShader(p, a); gl.attachShader(p, b);
    gl.bindAttribLocation(p, 7, 'a_q');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(7);
    gl.vertexAttribPointer(7, 2, gl.FLOAT, false, 0, 0);
    return { p, tex, fbo: gl.createFramebuffer(), u: Object.fromEntries(['u_d', 'u_step', 'u_c1', 'u_c2', 'u_c3', 'u_shine', 'u_clock'].map((n) => [n, gl.getUniformLocation(p, n)])) };
  })();
  gl.useProgram(prog);
  const U = {};
  ['u_res', 'u_cf', 'u_ct', 'u_dot', 'u_ptr', 'u_hf', 'u_ht', 'u_c1', 'u_c2', 'u_c3', 'u_spark', 'u_gold', 'u_sf', 'u_st', 'u_t', 'u_time', 'u_yaw', 'u_pitch', 'u_collapse', 'u_alpha',
    'u_vel', 'u_scroll', 'u_starF', 'u_starT', 'u_dpr', 'u_ps', 'u_ptrOn', 'u_light', 'u_scan', 'u_over', 'u_pass', 'u_weight', 'u_blob', 'u_liquid', 'u_bow', 'u_hotOnly'].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
  const A_ = {};
  ['a_from', 'a_fp', 'a_to', 'a_tp', 'a_seed'].forEach((n) => { A_[n] = gl.getAttribLocation(prog, n); gl.enableVertexAttribArray(A_[n]); });
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const buffer = (arr) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    return b;
  };
  const BUF = {}, HOME = {};
  Object.keys(SHAPES).forEach((k) => { BUF[k] = buffer(SHAPES[k].data); HOME[k] = SHAPES[k].home; });
  {
    const r = rng(77), seeds = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      seeds[i * 3] = r();
      seeds[i * 3 + 1] = 1.7 + r() * r() * 2.9;
      seeds[i * 3 + 2] = r();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer(seeds));
    gl.vertexAttribPointer(A_.a_seed, 3, gl.FLOAT, false, 0, 0);
  }
  const fonts = document.fonts && document.fonts.load ? document.fonts.load('600 300px "Cal Sans"').catch(() => {}) : Promise.resolve();
  fonts.then(() => { const s = winnerShape(); BUF.winner = buffer(s.data); HOME.winner = s.home; });

  /* ---------- State ---------- */
  let W = 1, H = 1, dpr = 1;
  let mode = 'hero';
  let fromShape = 'seed', toShape = 'seed', t = 1, dur = BUILD, queued = null, anchor = null;
  let fp = { x: 0, y: 0, s: 100 }, tp = { x: 0, y: 0, s: 100 };
  let alpha = 0, alphaT = 0, yaw = 0.4, pitch = 0.26;
  let collapse = 0, heroFade = 1;
  let strain = 0, blank = false;
  let time = 0, last = 0, vel = 0, lastScroll = scrollY, ptrX = -999, ptrY = -999, ptrOn = 0, ptrWant = 0;
  const pal = { bright: {}, deep: {}, spark: [1, 1, 1] };

  const size = () => {
    W = innerWidth; H = innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, W > 1600 ? 1.25 : 1.75);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (sheet) { // the liquid's buffer, half size
      gl.bindTexture(gl.TEXTURE_2D, sheet.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width >> 1, canvas.height >> 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, sheet.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sheet.tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  };

  // the colours come from the page, so there is one palette to change
  const colours = () => {
    const css = getComputedStyle(root);
    const vec = (name) => { const h = css.getPropertyValue(name).trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
    [1, 2, 3].forEach((n) => { pal.bright[n] = vec('--b' + n); pal.deep[n] = vec('--d' + n); });
    pal.spark = vec('--spark');
    pal.gold = vec('--au');
  };

  // in the hero the cloud is folded into the tie
  const tieSpot = () => {
    const f = window.DKB_SUIT ? window.DKB_SUIT.tie() : (() => { const r = face.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.72 }; })();
    return { x: f.x, y: f.y, s: 100 };
  };
  const spotOf = (el) => {
    if (!el) return tp;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: Math.max(40, Math.min(r.width / 3.1, r.height / 2.2)) };
  };

  const fitOf = (name) => (LOOK[name] || LOOK.stars).fit;

  const begin = (w) => {
    fromShape = toShape;
    fp = { ...tp };
    toShape = w.shape;
    anchor = w.el || null;
    alphaT = w.alpha;
    t = 0;
    dur = w.dur;
  };

  const draw = () => {
    const light = root.getAttribute('data-theme') === 'light' && mode === 'page' ? 1 : 0;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, BUF[fromShape] || BUF.stars);
    gl.vertexAttribPointer(A_.a_from, 4, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(A_.a_fp, 4, gl.FLOAT, false, 32, 16);
    gl.bindBuffer(gl.ARRAY_BUFFER, BUF[toShape] || BUF.stars);
    gl.vertexAttribPointer(A_.a_to, 4, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(A_.a_tp, 4, gl.FLOAT, false, 32, 16);
    gl.uniform2f(U.u_res, W, H);
    gl.uniform2f(U.u_cf, fp.x, fp.y);
    gl.uniform2f(U.u_ct, tp.x, tp.y);
    gl.uniform1f(U.u_sf, fp.s);
    gl.uniform1f(U.u_st, tp.s);
    gl.uniform1f(U.u_t, t);
    gl.uniform1f(U.u_time, time);
    gl.uniform1f(U.u_scan, (time * 4) % 6.2832);
    gl.uniform1f(U.u_yaw, yaw);
    gl.uniform1f(U.u_pitch, pitch);
    gl.uniform1f(U.u_alpha, alpha);
    gl.uniform3fv(U.u_hf, HOME[fromShape] || HOME.stars);
    gl.uniform3fv(U.u_ht, HOME[toShape] || HOME.stars);
    const set = light ? pal.deep : pal.bright;
    gl.uniform3fv(U.u_c1, set[1]); gl.uniform3fv(U.u_c2, set[2]); gl.uniform3fv(U.u_c3, set[3]);
    gl.uniform3fv(U.u_spark, toShape === 'winner' || fromShape === 'winner' ? pal.gold : pal.spark); // the #1 is all gold
    gl.uniform3fv(U.u_gold, pal.gold);
    gl.uniform1f(U.u_collapse, mode === 'hero' ? collapse : 0);
    const d = dotEl.getBoundingClientRect();
    const dx = d.left + d.width / 2, dy = d.top + d.height / 2;
    gl.uniform2f(U.u_dot, dx, dy);
    // the ribbon from the tie to the full stop always bows away from the head, so it never crosses the face
    const head = window.DKB_SUIT ? window.DKB_SUIT.head() : { x: tp.x, y: tp.y - 200 };
    gl.uniform1f(U.u_bow, (dx - tp.x) * (head.y - tp.y) - (dy - tp.y) * (head.x - tp.x) > 0 ? -0.22 : 0.22);
    gl.uniform1f(U.u_vel, Math.max(-60, Math.min(60, vel)));
    gl.uniform1f(U.u_scroll, scrollY);
    gl.uniform1f(U.u_starF, fromShape === 'stars' ? 1 : 0);
    gl.uniform1f(U.u_starT, toShape === 'stars' ? 1 : 0);
    gl.uniform1f(U.u_dpr, dpr);
    gl.uniform1f(U.u_ps, Math.max(0.72, Math.min(1.25, tp.s / 130)));
    gl.uniform2f(U.u_ptr, ptrX, ptrY);
    gl.uniform1f(U.u_ptrOn, ptrOn);
    gl.uniform1f(U.u_light, light);
    gl.uniform1f(U.u_over, light ? 1 : 0.64);
    // the liquid goes first, under the points: only while metal is moving
    gl.uniform1f(U.u_liquid, sheet ? 1 : 0);
    if (sheet && alpha > 0.01 && (t < 1 || (mode === 'hero' && collapse > 0.001 && collapse < 0.999))) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, sheet.fbo);
      gl.viewport(0, 0, canvas.width >> 1, canvas.height >> 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform1f(U.u_pass, 1); gl.uniform1f(U.u_blob, 1);
      gl.uniform1f(U.u_weight, N > 5000 ? 0.14 : 0.275);
      gl.drawArrays(gl.POINTS, 0, N);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(sheet.p);
      gl.bindTexture(gl.TEXTURE_2D, sheet.tex);
      gl.uniform1i(sheet.u.u_d, 0);
      gl.uniform2f(sheet.u.u_step, 3 / canvas.width, 3 / canvas.height);
      gl.uniform3fv(sheet.u.u_c1, set[1]); gl.uniform3fv(sheet.u.u_c2, set[2]); gl.uniform3fv(sheet.u.u_c3, set[3]);
      gl.uniform1f(sheet.u.u_shine, Math.min(1, alpha));
      gl.uniform1f(sheet.u.u_clock, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.useProgram(prog);
    }
    gl.uniform1f(U.u_pass, 0); gl.uniform1f(U.u_blob, 0);
    gl.drawArrays(gl.POINTS, 0, N);
    // the highlighted routes again, on top and opaque, so their colour stays its own instead of mixing with the light under it
    gl.uniform1f(U.u_over, 1); gl.uniform1f(U.u_hotOnly, 1);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.uniform1f(U.u_hotOnly, 0);
  };

  const frame = (now) => {
    requestAnimationFrame(frame);
    if (sheet && t < 1) { strain += ((now - last > 40 ? 1 : 0) - strain) * 0.08; if (strain > 0.7) sheet = null; } // too slow for the liquid: drop it, keep the points
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    time += dt;

    const sy = scrollY;
    vel += (sy - lastScroll - vel) * 0.16;
    lastScroll = sy;

    if (t < 1) t = Math.min(1, t + (dt / dur) * (queued ? 2.2 : 1)); // something is waiting: finish faster
    if (t >= 1 && queued) { const w = queued; queued = null; begin(w); }

    if (mode === 'hero') {
      alphaT = heroFade * Math.min(1, collapse * 8);
      tp = fp = tieSpot();
    } else if (anchor) { const a = spotOf(anchor); tp = { ...a, s: a.s * fitOf(toShape) }; }

    const look = LOOK[toShape] || LOOK.stars;
    if (look.spin) yaw += dt * 0.3;
    else {
      const home = Math.round(yaw / (Math.PI * 2)) * Math.PI * 2 + Math.sin(time * 0.45) * (look.sway ?? 0.34);
      yaw += (home - yaw) * Math.min(1, dt * 1.6);
    }
    pitch += (look.pitch - pitch) * Math.min(1, dt * 2);
    alpha += (alphaT - alpha) * Math.min(1, dt * 3.2);
    ptrOn += (ptrWant - ptrOn) * Math.min(1, dt * 6);

    if (alpha < 0.004 && alphaT < 0.004) { // nothing to show: the canvas leaves the page's compositing altogether
      if (!blank) { gl.clear(gl.COLOR_BUFFER_BIT); canvas.style.visibility = 'hidden'; blank = true; }
      return;
    }
    if (blank) { canvas.style.visibility = ''; blank = false; }
    draw();
  };

  /* ---------- What the page can ask of it ---------- */
  window.DKB_HOLO = {
    // the cloud runs from the tie into the full stop as the opening scrolls
    collapse: (p, fade = 1) => { collapse = p; heroFade = fade; },
    go: (shape, el, opts = {}) => {
      mode = 'page';
      const want = { shape, el: el || null, alpha: opts.alpha ?? (shape === 'stars' ? 0.75 : 1), dur: BUILD };
      if (want.shape === toShape && want.el === anchor) { alphaT = want.alpha; queued = null; return; }
      if (t >= 1) begin(want);
      else queued = want;
    },
    hero: () => {
      mode = 'hero';
      queued = null;
      begin({ shape: 'seed', alpha: 0, dur: 0.01 });
    },
  };

  /* ---------- Pointer: the light parts around it ---------- */
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    ptrX = e.clientX; ptrY = e.clientY; ptrWant = 1;
  }, { passive: true });
  document.addEventListener('mouseleave', () => { ptrWant = 0; });

  /* ---------- Start ---------- */
  size();
  colours();
  tp = fp = tieSpot();
  new MutationObserver(colours).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(size, 120); });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); root.classList.remove('has-holo'); canvas.remove(); });
  requestAnimationFrame(frame);
})();
