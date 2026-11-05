/* =========================================================
   The Deepak Line: playable case files.
   Each project's picture is a small working model you can poke.
   Everything redraws only while something is moving.
   ========================================================= */
(() => {
  'use strict';

  const C = { bg: '#090B14', red: '#FF2A46', gold: '#D9AE3C', goldHi: '#F3D98A' };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rng = (seed) => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const fit = (canvas) => {
    const d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(w * d);
    canvas.height = Math.round(h * d);
    const g = canvas.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    return { g, w, h };
  };
  const dot = (g, x, y, r) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); };
  const goldLine = (g, x0, x1) => {
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, C.gold); gr.addColorStop(0.5, C.goldHi); gr.addColorStop(1, C.gold);
    return gr;
  };
  const local = (canvas, e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * canvas.clientWidth) / r.width, y: ((e.clientY - r.top) * canvas.clientHeight) / r.height };
  };
  const segDist = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / L, 0, 1);
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };
  const arrow = (g, x, y, a, s) => {
    g.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
    g.lineTo(x + Math.cos(a + 2.5) * s, y + Math.sin(a + 2.5) * s);
    g.lineTo(x + Math.cos(a - 2.5) * s, y + Math.sin(a - 2.5) * s);
    g.closePath();
  };
  // a module gets its canvas and its control bar, and hands back a function that tears it down
  const kit = (canvas) => {
    const subs = [];
    let raf = 0;
    return {
      on: (el, ev, fn, o) => { el.addEventListener(ev, fn, o); subs.push([el, ev, fn, o]); },
      frame: (fn) => { if (!raf) raf = requestAnimationFrame((t) => { raf = 0; fn(t); }); },
      stop: () => {
        subs.forEach(([el, ev, fn, o]) => el.removeEventListener(ev, fn, o));
        subs.length = 0;
        cancelAnimationFrame(raf);
        raf = 0;
        canvas.style.cursor = '';
      },
    };
  };

  /* ---------- LifeLine: break a road, watch the detour ---------- */
  const lifeline = (canvas, bar) => {
    const k = kit(canvas);
    let { g, w, h } = fit(canvas);
    const r = rng(40), cols = 8, rows = 5;
    const U = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) U.push({ u: 0.06 + (0.88 * (i + 0.5 + (r() - 0.5) * 0.7)) / cols, v: 0.09 + (0.82 * (j + 0.5 + (r() - 0.5) * 0.7)) / rows });
    const S = 8, T = 31;
    let N = [], E = [], adj = [], broken = new Set(), base = 1, hover = -1, dj = null, as = null, t0 = 0, note = '';
    const layout = () => {
      N = U.map((p) => ({ x: p.u * w, y: p.v * h }));
      const pairs = [];
      for (let a = 0; a < N.length; a++) for (let b = a + 1; b < N.length; b++) pairs.push([a, b, Math.hypot(N[a].x - N[b].x, N[a].y - N[b].y)]);
      pairs.sort((p, q) => p[2] - q[2]);
      const parent = N.map((_, i) => i);
      const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
      const used = new Set();
      E = [];
      for (const [a, b, d] of pairs) { const fa = find(a), fb = find(b); if (fa !== fb) { parent[fa] = fb; E.push([a, b, d]); used.add(a * 64 + b); } }
      for (const [a, b, d] of pairs) { if (E.length >= 83) break; if (!used.has(a * 64 + b)) { E.push([a, b, d]); used.add(a * 64 + b); } }
      adj = N.map(() => []);
      E.forEach(([a, b, d], e) => { adj[a].push([b, d, e]); adj[b].push([a, d, e]); });
      broken = new Set();
      base = search(false).cost;
    };
    // Dijkstra, or A* with a straight-line guess; both report the order they settled places in
    const search = (star) => {
      const n = N.length, dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false), order = [];
      const guess = (i) => (star ? Math.hypot(N[i].x - N[T].x, N[i].y - N[T].y) : 0);
      dist[S] = 0;
      for (;;) {
        let u = -1, best = Infinity;
        for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && dist[i] + guess(i) < best) { best = dist[i] + guess(i); u = i; }
        if (u < 0) break;
        done[u] = true;
        order.push(u);
        if (u === T) break;
        for (const [v, d, e] of adj[u]) if (!broken.has(e) && dist[u] + d < dist[v]) { dist[v] = dist[u] + d; prev[v] = u; }
      }
      const path = [];
      if (dist[T] < Infinity) for (let v = T; v >= 0; v = prev[v]) path.unshift(v);
      return { path, cost: dist[T], order };
    };
    bar.innerHTML = '<p class="play-read" aria-live="polite"></p><button class="play-btn" type="button">Rebuild the city</button>';
    const read = bar.querySelector('.play-read');
    const report = () => {
      if (note) { read.innerHTML = note; return; }
      const pct = Math.round((dj.cost / base - 1) * 100);
      read.innerHTML = `Roads broken <b>${broken.size}</b> · Detour <b>${pct > 0 ? '+' + pct + '%' : 'none'}</b> · Dijkstra checked <b>${dj.order.length}</b> places, A* only <b>${as.order.length}</b>`;
    };
    const solve = () => { dj = search(false); as = search(true); t0 = performance.now(); report(); k.frame(draw); };
    const draw = (now) => {
      g.fillStyle = C.bg;
      g.fillRect(0, 0, w, h);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.strokeStyle = 'rgba(255,255,255,.2)';
      g.lineWidth = 1.3;
      g.beginPath();
      E.forEach(([a, b], e) => { if (!broken.has(e)) { g.moveTo(N[a].x, N[a].y); g.lineTo(N[b].x, N[b].y); } });
      g.stroke();
      // broken roads: dashed, a cross in the middle
      g.setLineDash([3, 5]);
      g.strokeStyle = 'rgba(255,255,255,.5)';
      g.beginPath();
      broken.forEach((e) => { const [a, b] = E[e]; g.moveTo(N[a].x, N[a].y); g.lineTo(N[b].x, N[b].y); });
      g.stroke();
      g.setLineDash([]);
      g.strokeStyle = '#fff';
      g.lineWidth = 2;
      g.beginPath();
      broken.forEach((e) => { const [a, b] = E[e]; const mx = (N[a].x + N[b].x) / 2, my = (N[a].y + N[b].y) / 2; g.moveTo(mx - 6, my - 6); g.lineTo(mx + 6, my + 6); g.moveTo(mx + 6, my - 6); g.lineTo(mx - 6, my + 6); });
      g.stroke();
      if (hover >= 0) {
        const [a, b] = E[hover];
        g.strokeStyle = broken.has(hover) ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.85)';
        g.lineWidth = 4;
        g.beginPath(); g.moveTo(N[a].x, N[a].y); g.lineTo(N[b].x, N[b].y); g.stroke();
      }
      // the search spreading out, then the route drawing itself in
      const t = now - t0;
      const wp = reduced ? 1 : clamp(t / 520, 0, 1), rp = reduced ? 1 : clamp((t - 320) / 700, 0, 1);
      const seen = Math.ceil(wp * dj.order.length);
      g.fillStyle = 'rgba(255,255,255,.13)';
      g.beginPath();
      for (let i = 0; i < seen; i++) dot(g, N[dj.order[i]].x, N[dj.order[i]].y, 10);
      g.fill();
      const P = dj.path.map((i) => N[i]);
      let total = 0;
      for (let i = 1; i < P.length; i++) total += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y);
      let left = total * rp;
      g.strokeStyle = C.red;
      g.lineWidth = 4;
      g.beginPath();
      if (P.length) g.moveTo(P[0].x, P[0].y);
      for (let i = 1; i < P.length && left > 0; i++) {
        const L = Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y), f = Math.min(1, left / L);
        g.lineTo(P[i - 1].x + (P[i].x - P[i - 1].x) * f, P[i - 1].y + (P[i].y - P[i - 1].y) * f);
        left -= L;
      }
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.82)';
      g.beginPath();
      N.forEach((n, i) => { if (i !== S && i !== T) dot(g, n.x, n.y, 2.6); });
      g.fill();
      g.lineWidth = 2.6;
      g.strokeStyle = '#fff';
      g.fillStyle = C.bg;
      g.beginPath(); dot(g, N[S].x, N[S].y, 7.5); g.fill(); g.stroke();
      g.fillStyle = goldLine(g, N[T].x - 9, N[T].x + 9);
      g.beginPath(); dot(g, N[T].x, N[T].y, 8.5); g.fill();
      g.font = '500 10px "JetBrains Mono", monospace';
      g.fillStyle = 'rgba(221,224,230,.8)';
      g.fillText('START', N[S].x + 12, N[S].y + 4);
      g.fillStyle = C.gold;
      g.fillText('HOSPITAL', N[T].x - 64, N[T].y - 14);
      if (wp < 1 || rp < 1) k.frame(draw);
    };
    const pick = (p, reach) => {
      let best = -1, bd = reach;
      E.forEach(([a, b], e) => { const d = segDist(p.x, p.y, N[a].x, N[a].y, N[b].x, N[b].y); if (d < bd) { bd = d; best = e; } });
      return best;
    };
    k.on(canvas, 'pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const hv = pick(local(canvas, e), 12);
      if (hv !== hover) { hover = hv; canvas.style.cursor = hv >= 0 ? 'pointer' : 'default'; k.frame(draw); }
    });
    k.on(canvas, 'pointerleave', () => { hover = -1; k.frame(draw); });
    k.on(canvas, 'click', (e) => {
      const hit = pick(local(canvas, e), e.pointerType === 'touch' ? 22 : 12);
      if (hit < 0) return;
      note = '';
      if (broken.has(hit)) broken.delete(hit);
      else {
        broken.add(hit);
        if (!search(false).path.length) { broken.delete(hit); note = 'That road is a bridge in the graph, the last way through. Breaking it would cut off the hospital, so it stays open.'; }
      }
      solve();
    });
    k.on(bar.querySelector('.play-btn'), 'click', () => { broken.clear(); note = ''; solve(); });
    let rt;
    k.on(window, 'resize', () => { clearTimeout(rt); rt = setTimeout(() => { ({ g, w, h } = fit(canvas)); layout(); solve(); }, 200); });
    layout();
    solve();
    return k.stop;
  };

  /* ---------- BroadBridge: a Monte Carlo you can steer ---------- */
  const broadbridge = (canvas, bar) => {
    const k = kit(canvas);
    let { g, w, h } = fit(canvas);
    const PATHS = 400, MAXM = 300, SAMPLES = 60;
    // the same random markets every time, so a slider moves the picture instead of reshuffling it
    const r = rng(239);
    const Z = new Float32Array(PATHS * MAXM);
    for (let i = 0; i < Z.length; i += 2) {
      const u = 1 - r(), v = r(), m = Math.sqrt(-2 * Math.log(u));
      Z[i] = m * Math.cos(2 * Math.PI * v);
      Z[i + 1] = m * Math.sin(2 * Math.PI * v);
    }
    bar.innerHTML = `
      <div class="play-grid">
        <label class="play-range"><span>Saving each month <output></output></span><input type="range" min="2000" max="50000" step="1000" value="15000" data-k="m"></label>
        <label class="play-range"><span>Years <output></output></span><input type="range" min="3" max="25" step="1" value="12" data-k="y"></label>
        <label class="play-range"><span>Share in stocks <output></output></span><input type="range" min="10" max="90" step="5" value="60" data-k="s"></label>
        <label class="play-range"><span>Goal <output></output></span><input type="range" min="10" max="100" step="5" value="30" data-k="goal"></label>
      </div>
      <p class="play-read" aria-live="polite"></p>`;
    const inputs = [...bar.querySelectorAll('input')];
    const read = bar.querySelector('.play-read');
    const inr = (v) => '₹' + Math.round(v).toLocaleString('en-IN');
    const lakh = (v) => (v >= 1e7 ? '₹' + (v / 1e7).toFixed(2) + ' Cr' : '₹' + (v / 1e5).toFixed(1) + ' L');
    const vals = new Float32Array(PATHS * (SAMPLES + 1));
    let Q = null, months = 0, goal = 0, prob = 0;
    const run = () => {
      const o = Object.fromEntries(inputs.map((i) => [i.dataset.k, Number(i.value)]));
      inputs.forEach((i) => {
        const out = i.previousElementSibling.querySelector('output');
        out.textContent = i.dataset.k === 'm' ? inr(o.m) : i.dataset.k === 'y' ? o.y + ' yrs' : i.dataset.k === 's' ? o.s + '%' : '₹' + o.goal + ' L';
      });
      months = o.y * 12;
      goal = o.goal * 1e5;
      const s = o.s / 100, mu = 0.055 + 0.065 * s, sig = 0.03 + 0.17 * s;
      const drift = (mu - (sig * sig) / 2) / 12, vol = sig / Math.sqrt(12);
      let hit = 0;
      for (let p = 0; p < PATHS; p++) {
        let v = 0, j = 0;
        vals[p * (SAMPLES + 1)] = 0;
        for (let t = 0; t < months; t++) {
          v = v * Math.exp(drift + vol * Z[p * MAXM + t]) + o.m;
          const at = Math.floor(((t + 1) * SAMPLES) / months);
          while (j < at) { j++; vals[p * (SAMPLES + 1) + j] = v; }
        }
        if (v >= goal) hit++;
      }
      prob = hit / PATHS;
      const col = new Float32Array(PATHS);
      Q = [];
      for (let j = 0; j <= SAMPLES; j++) {
        for (let p = 0; p < PATHS; p++) col[p] = vals[p * (SAMPLES + 1) + j];
        col.sort();
        Q.push([col[40], col[100], col[200], col[300], col[360]]); // 10th, 25th, 50th, 75th, 90th
      }
      const med = Q[SAMPLES][2];
      read.innerHTML = `<b class="play-big">${Math.round(prob * 100)}%</b> chance of reaching <b>${lakh(goal)}</b> in ${o.y} years · median outcome <b>${lakh(med)}</b> · you put in <b>${lakh(o.m * months)}</b>`;
      k.frame(draw);
    };
    const draw = () => {
      g.fillStyle = C.bg;
      g.fillRect(0, 0, w, h);
      const x0 = 46, x1 = w - 18, y0 = h - 30, top = 22;
      const ymax = Math.max(goal * 1.3, Q[SAMPLES][4] * 1.04);
      const X = (j) => x0 + ((x1 - x0) * j) / SAMPLES;
      const Y = (v) => y0 - ((y0 - top) * v) / ymax;
      const band = (lo, hi, fill) => {
        g.fillStyle = fill;
        g.beginPath();
        for (let j = 0; j <= SAMPLES; j++) g.lineTo(X(j), Y(Q[j][hi]));
        for (let j = SAMPLES; j >= 0; j--) g.lineTo(X(j), Y(Q[j][lo]));
        g.closePath();
        g.fill();
      };
      band(0, 4, 'rgba(42,76,221,.26)');
      band(1, 3, 'rgba(42,76,221,.34)');
      g.strokeStyle = 'rgba(255,255,255,.06)';
      g.lineWidth = 1;
      g.beginPath();
      for (let p = 0; p < PATHS; p += 8) for (let j = 0; j <= SAMPLES; j++) { const y = Y(vals[p * (SAMPLES + 1) + j]); j ? g.lineTo(X(j), y) : g.moveTo(X(j), y); }
      g.stroke();
      g.strokeStyle = '#fff';
      g.lineWidth = 2.6;
      g.lineJoin = 'round';
      g.beginPath();
      for (let j = 0; j <= SAMPLES; j++) g.lineTo(X(j), Y(Q[j][2]));
      g.stroke();
      const gy = Y(goal);
      g.strokeStyle = goldLine(g, x0, x1);
      g.lineWidth = 2;
      g.setLineDash([7, 6]);
      g.beginPath(); g.moveTo(x0, gy); g.lineTo(x1, gy); g.stroke();
      g.setLineDash([]);
      g.font = '500 10.5px "JetBrains Mono", monospace';
      g.fillStyle = C.gold;
      g.textAlign = 'right';
      g.fillText('GOAL ' + lakh(goal).replace('₹', '₹ '), x1, gy - 8);
      g.fillStyle = 'rgba(221,224,230,.6)';
      g.textAlign = 'left';
      g.fillText('NOW', x0, h - 10);
      g.textAlign = 'right';
      g.fillText(months / 12 + ' YRS', x1, h - 10);
      g.textAlign = 'left';
      g.fillText(lakh(ymax).replace('₹', '₹ '), 6, top + 4);
      g.fillText('₹ 0', 6, y0 + 3);
    };
    inputs.forEach((i) => k.on(i, 'input', () => k.frame(run)));
    let rt;
    k.on(window, 'resize', () => { clearTimeout(rt); rt = setTimeout(() => { ({ g, w, h } = fit(canvas)); draw(); }, 200); });
    run();
    return k.stop;
  };

  /* ---------- UPI Risk Desk: depth-first search hunting for rings ---------- */
  const upi = (canvas, bar) => {
    const k = kit(canvas);
    let { g, w, h } = fit(canvas);
    const r = rng(121), n = 64;
    const U = [];
    for (let tries = 0; U.length < n && tries < 5000; tries++) {
      const p = { u: 0.05 + 0.9 * r(), v: 0.08 + 0.84 * r() };
      if (U.every((q) => Math.hypot((q.u - p.u) * 1.6, q.v - p.v) > 0.075)) U.push(p);
    }
    const rank = U.map((_, i) => i).sort((a, b) => U[a].u - U[b].u);
    const pos = new Array(U.length);
    rank.forEach((i, kx) => (pos[i] = kx));
    // three planted rings of 3, 5 and 7 accounts, each a closed loop of payments
    const inRing = new Array(U.length).fill(-1);
    const rings = [];
    [[0.2, 0.3, 3], [0.55, 0.62, 5], [0.8, 0.3, 7]].forEach(([cu, cv, size], ri) => {
      const near = U.map((p, i) => [Math.hypot((p.u - cu) * 1.6, p.v - cv), i]).filter(([, i]) => inRing[i] < 0).sort((a, b) => a[0] - b[0]).slice(0, size).map(([, i]) => i);
      const cx = near.reduce((s, i) => s + U[i].u, 0) / size, cy = near.reduce((s, i) => s + U[i].v, 0) / size;
      near.sort((a, b) => Math.atan2(U[a].v - cy, U[a].u - cx) - Math.atan2(U[b].v - cy, U[b].u - cx));
      near.forEach((i) => (inRing[i] = ri));
      rings.push(near);
    });
    // ordinary payments only flow forward and never leave a ring, so the planted rings are the only loops
    const E = [], key = new Set();
    const add = (a, b) => { if (a !== b && !key.has(a + '>' + b)) { key.add(a + '>' + b); E.push([a, b]); } };
    U.forEach((p, i) => {
      if (inRing[i] >= 0) return;
      const ahead = U.map((q, j) => [Math.hypot((q.u - p.u) * 1.6, q.v - p.v), j]).filter(([, j]) => pos[j] > pos[i]).sort((a, b) => a[0] - b[0]);
      const m = 1 + Math.floor(r() * 2);
      ahead.slice(0, m).forEach(([, j]) => add(i, j));
    });
    rings.forEach((ring) => ring.forEach((a, x) => add(a, ring[(x + 1) % ring.length])));
    const out = U.map(() => []);
    E.forEach(([a, b], e) => out[a].push([b, e]));
    // the whole search, recorded step by step, then played back
    const events = [];
    {
      const color = new Uint8Array(U.length);
      for (const s of rank) {
        if (color[s]) continue;
        const stack = [[s, 0]], path = [s];
        color[s] = 1;
        events.push({ t: 'enter', a: s });
        while (stack.length) {
          const top = stack[stack.length - 1], u = top[0];
          if (top[1] < out[u].length) {
            const [v, e] = out[u][top[1]++];
            if (color[v] === 0) { color[v] = 1; path.push(v); stack.push([v, 0]); events.push({ t: 'tree', e, a: v }); }
            else if (color[v] === 1) events.push({ t: 'back', e, ring: path.slice(path.indexOf(v)) });
            else events.push({ t: 'cross', e });
          } else { color[u] = 2; path.pop(); stack.pop(); events.push({ t: 'leave', a: u }); }
        }
      }
    }
    let N = [], t0 = -1, playing = false;
    const layout = () => { N = U.map((p) => ({ x: p.u * w, y: p.v * h })); };
    bar.innerHTML = '<p class="play-read" aria-live="polite"></p><button class="play-btn play-btn--go" type="button">Hunt for rings</button>';
    const read = bar.querySelector('.play-read');
    const btn = bar.querySelector('.play-btn');
    const DUR = 3600;
    const draw = (now) => {
      const p = t0 < 0 ? 0 : reduced ? 1 : clamp((now - t0) / DUR, 0, 1);
      const upto = Math.floor(p * events.length);
      const state = new Uint8Array(U.length), seenE = new Uint8Array(E.length), found = [];
      let checked = 0;
      for (let i = 0; i < upto; i++) {
        const ev = events[i];
        if (ev.t === 'enter' || ev.t === 'tree') state[ev.a] = 1;
        if (ev.t === 'leave') state[ev.a] = 2;
        if (ev.e !== undefined) { seenE[ev.e] = ev.t === 'tree' ? 2 : 1; checked++; }
        if (ev.t === 'back') found.push(ev.ring);
      }
      g.fillStyle = C.bg;
      g.fillRect(0, 0, w, h);
      g.lineCap = 'round';
      [[0, 'rgba(255,255,255,.12)', 1], [1, 'rgba(255,255,255,.3)', 1], [2, 'rgba(255,255,255,.62)', 1.6]].forEach(([s, col, lw]) => {
        g.strokeStyle = col;
        g.lineWidth = lw;
        g.beginPath();
        E.forEach(([a, b], e) => { if (seenE[e] === s) { g.moveTo(N[a].x, N[a].y); g.lineTo(N[b].x, N[b].y); } });
        g.stroke();
      });
      const ringNode = new Uint8Array(U.length);
      g.strokeStyle = C.red;
      g.fillStyle = C.red;
      g.lineWidth = 3;
      found.forEach((ring) => {
        g.beginPath();
        ring.forEach((a, x) => { const q = N[a]; x ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); ringNode[a] = 1; });
        g.closePath();
        g.stroke();
        g.beginPath();
        ring.forEach((a, x) => { const b = ring[(x + 1) % ring.length]; arrow(g, (N[a].x + N[b].x) / 2, (N[a].y + N[b].y) / 2, Math.atan2(N[b].y - N[a].y, N[b].x - N[a].x), 7); });
        g.fill();
      });
      U.forEach((_, i) => {
        g.beginPath();
        dot(g, N[i].x, N[i].y, ringNode[i] ? 5 : 3.2);
        g.fillStyle = ringNode[i] ? C.red : state[i] === 1 ? '#fff' : state[i] === 2 ? 'rgba(255,255,255,.42)' : 'rgba(255,255,255,.7)';
        g.fill();
        if (state[i] === 1 && !ringNode[i]) { g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; g.beginPath(); dot(g, N[i].x, N[i].y, 8); g.stroke(); }
      });
      read.innerHTML = t0 < 0
        ? `<b>${U.length}</b> accounts · <b>${E.length}</b> payments · three rings are hiding in here`
        : `Payments checked <b>${checked}</b> of <b>${E.length}</b> · Rings found <b>${found.length}</b>`;
      if (t0 >= 0 && p < 1) k.frame(draw);
      else if (p >= 1 && playing) { playing = false; btn.textContent = 'Hunt again'; }
    };
    k.on(btn, 'click', () => { t0 = performance.now(); playing = true; btn.textContent = 'Searching…'; k.frame(draw); });
    let rt;
    k.on(window, 'resize', () => { clearTimeout(rt); rt = setTimeout(() => { ({ g, w, h } = fit(canvas)); layout(); k.frame(draw); }, 200); });
    layout();
    k.frame(draw);
    return k.stop;
  };

  /* ---------- NER SafeRoute: drop a landslide, A* plans around it ---------- */
  const saferoute = (canvas, bar) => {
    const k = kit(canvas);
    let { g, w, h } = fit(canvas);
    const r = rng(3447);
    const sm = (t) => t * t * (3 - 2 * t);
    const noise = (G) => {
      const V = [];
      for (let i = 0; i < (G + 1) * (G + 1); i++) V.push(r());
      return (x, y) => {
        const gx = clamp(x * G, 0, G - 1e-6), gy = clamp(y * G, 0, G - 1e-6);
        const i = Math.floor(gx), j = Math.floor(gy), fx = sm(gx - i), fy = sm(gy - j);
        const a = V[j * (G + 1) + i], b = V[j * (G + 1) + i + 1], c = V[(j + 1) * (G + 1) + i], d = V[(j + 1) * (G + 1) + i + 1];
        return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
      };
    };
    const hills = noise(5), ridges = noise(13);
    const height = (x, y) => hills(x, y) * 0.75 + ridges(x, y) * 0.25;
    let cols = 0, rows = 0, cw = 0, ch = 0, slope = null, hz = null, route = [], hazards = [], ground = null, truck = 0, lastT = 0;
    const layout = () => {
      cols = 72;
      rows = Math.max(24, Math.round((cols * h) / w));
      cw = w / cols;
      ch = h / rows;
      slope = new Float32Array(cols * rows);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const u = (x + 0.5) / cols, v = (y + 0.5) / rows, e = 0.5 / cols;
        slope[y * cols + x] = Math.hypot(height(u + e, v) - height(u - e, v), height(u, v + e) - height(u, v - e)) * cols;
      }
      const mx = slope.reduce((a, b) => Math.max(a, b), 1e-6);
      for (let i = 0; i < slope.length; i++) slope[i] /= mx;
      // the hills are drawn once into their own canvas
      ground = document.createElement('canvas');
      const d = Math.min(2, window.devicePixelRatio || 1);
      ground.width = Math.round(w * d);
      ground.height = Math.round(h * d);
      const q = ground.getContext('2d');
      q.setTransform(d, 0, 0, d, 0, 0);
      q.fillStyle = C.bg;
      q.fillRect(0, 0, w, h);
      q.fillStyle = 'rgba(255,255,255,.4)';
      q.beginPath();
      for (let y = 4; y < h; y += 4.5) for (let x = 4; x < w; x += 4.5) { const v = height(x / w, y / h) * 10; if (Math.abs((v % 1) - 0.5) < 0.085) dot(q, x, y, 0.95); }
      q.fill();
      hazards = [];
      paint();
    };
    const paint = () => {
      hz = new Float32Array(cols * rows);
      hazards.forEach(({ x, y }) => {
        for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) {
          const cx = x + i, cy = y + j, d = Math.hypot(i, j);
          if (cx < 0 || cy < 0 || cx >= cols || cy >= rows || d > 7) continue;
          hz[cy * cols + cx] += d < 4 ? 400 : 40 * (1 - (d - 4) / 3);
        }
      });
      plan();
    };
    // A* over the grid, 8 neighbours; a step costs more on steep ground and much more near a landslide
    const plan = () => {
      const n = cols * rows, start = (rows - 3) * cols + 2, goal = 2 * cols + cols - 3;
      const gs = new Float32Array(n).fill(Infinity), from = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
      const heap = [];
      const push = (i, f) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, rr = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
      const gx = goal % cols, gy = (goal / cols) | 0;
      const guess = (i) => { const dx = Math.abs((i % cols) - gx), dy = Math.abs(((i / cols) | 0) - gy); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
      gs[start] = 0;
      push(start, guess(start));
      while (heap.length) {
        const [, u] = pop();
        if (closed[u]) continue;
        closed[u] = 1;
        if (u === goal) break;
        const ux = u % cols, uy = (u / cols) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const vx = ux + dx, vy = uy + dy;
          if (vx < 0 || vy < 0 || vx >= cols || vy >= rows) continue;
          const v = vy * cols + vx;
          if (closed[v]) continue;
          const step = (dx && dy ? 1.414 : 1) * (1 + 14 * slope[v] * slope[v] + hz[v]);
          if (gs[u] + step < gs[v]) { gs[v] = gs[u] + step; from[v] = u; push(v, gs[v] + guess(v)); }
        }
      }
      const cells = [];
      for (let c = goal; c >= 0; c = from[c]) cells.unshift(c);
      let pts = cells.map((c) => [((c % cols) + 0.5) * cw, (((c / cols) | 0) + 0.5) * ch]);
      for (let it = 0; it < 3; it++) { // round the corners
        const nx = [pts[0]];
        for (let i = 0; i < pts.length - 1; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
          nx.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
        }
        nx.push(pts[pts.length - 1]);
        pts = nx;
      }
      route = pts;
      const risk = cells.reduce((s, c) => s + Math.min(1, slope[c] * slope[c] * 1.6 + (hz[c] > 0 ? 0.6 : 0)), 0) / Math.max(1, cells.length);
      read.innerHTML = `Landslides <b>${hazards.length}</b> · Road <b>${cells.length}</b> grid steps · Average risk on the road <b>${risk.toFixed(2)}</b>`;
      truck = 0;
      k.frame(draw);
    };
    bar.innerHTML = '<p class="play-read" aria-live="polite"></p><button class="play-btn" type="button">Clear the roads</button>';
    const read = bar.querySelector('.play-read');
    const lens = [];
    const draw = (now) => {
      g.drawImage(ground, 0, 0, w, h);
      hazards.forEach(({ x, y }) => {
        const cx = (x + 0.5) * cw, cy = (y + 0.5) * ch, s = 10;
        g.strokeStyle = 'rgba(255,255,255,.6)';
        g.setLineDash([3, 4]);
        g.lineWidth = 1.4;
        g.beginPath(); dot(g, cx, cy, 4 * cw); g.stroke();
        g.setLineDash([]);
        g.fillStyle = C.bg;
        g.strokeStyle = '#fff';
        g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s, cy + s * 0.75); g.lineTo(cx - s, cy + s * 0.75); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(cx, cy - s * 0.35); g.lineTo(cx, cy + s * 0.25); g.stroke();
      });
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.strokeStyle = C.bg;
      g.lineWidth = 11;
      g.beginPath(); route.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      g.strokeStyle = C.red;
      g.lineWidth = 4;
      g.beginPath(); route.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      // a truck drives the road on a loop
      if (!lens.length || lens.route !== route) {
        lens.length = 0;
        let acc = 0;
        route.forEach(([x, y], i) => { if (i) acc += Math.hypot(x - route[i - 1][0], y - route[i - 1][1]); lens.push(acc); });
        lens.route = route;
      }
      const total = lens[lens.length - 1] || 1;
      const dt = lastT ? Math.min(50, now - lastT) : 16;
      lastT = now;
      truck = (truck + dt * 0.09) % total;
      let i = lens.findIndex((L) => L >= truck);
      i = Math.max(1, i);
      const f = (truck - lens[i - 1]) / Math.max(1e-6, lens[i] - lens[i - 1]);
      const [ax, ay] = route[i - 1], [bx, by] = route[i];
      const tx = ax + (bx - ax) * f, ty = ay + (by - ay) * f, ang = Math.atan2(by - ay, bx - ax);
      g.save();
      g.translate(tx, ty);
      g.rotate(ang);
      g.fillStyle = '#fff';
      g.beginPath(); if (g.roundRect) g.roundRect(-9, -5, 18, 10, 3); else g.rect(-9, -5, 18, 10); g.fill();
      g.restore();
      g.font = '500 10px "JetBrains Mono", monospace';
      g.fillStyle = 'rgba(221,224,230,.8)';
      g.fillText('DEPOT', route[0][0] + 10, route[0][1] + 4);
      g.fillStyle = C.gold;
      g.textAlign = 'right';
      g.fillText('DELIVERY', route[route.length - 1][0] - 10, route[route.length - 1][1] + 14);
      g.textAlign = 'left';
      if (!reduced) k.frame(draw);
    };
    k.on(canvas, 'pointermove', () => { canvas.style.cursor = 'crosshair'; }, { once: true });
    k.on(canvas, 'click', (e) => {
      const p = local(canvas, e);
      hazards.push({ x: clamp(Math.floor(p.x / cw), 0, cols - 1), y: clamp(Math.floor(p.y / ch), 0, rows - 1) });
      if (hazards.length > 6) hazards.shift();
      paint();
    });
    k.on(bar.querySelector('.play-btn'), 'click', () => { hazards = []; paint(); });
    let rt;
    k.on(window, 'resize', () => { clearTimeout(rt); rt = setTimeout(() => { ({ g, w, h } = fit(canvas)); layout(); }, 200); });
    layout();
    return k.stop;
  };

  /* ---------- Darklytics: the real shelves, sortable ---------- */
  const AISLES = [['Dry fruits & nuts', 54, 342, 250], ['Snacks & munchies', 186, 1303, 108], ['Staples & grains', 76, 538, 151], ['Fruits & vegetables', 202, 2126, 175], ['Bakery & biscuits', 96, 1245, 83], ['Sweets & chocolates', 84, 1880, 150], ['Dairy, bread & eggs', 76, 2062, 119], ['Beverages', 26, 1473, 169]];
  const darklytics = (canvas, bar) => {
    const k = kit(canvas);
    let { g, w, h } = fit(canvas);
    const COLS = 34;
    const hot = AISLES.map(([, out, n], a) => {
      const r = rng(610789 + a), set = new Set(), want = Math.max(1, Math.round((out / n) * COLS));
      while (set.size < want) set.add(Math.floor(r() * COLS));
      return set;
    });
    let order = AISLES.map((_, i) => i), place = AISLES.map((_, i) => i), from = place.slice(), t0 = 0, hover = -1, mode = 'out';
    bar.innerHTML = `<p class="play-read" aria-live="polite"></p>
      <div class="play-seg" role="group" aria-label="Sort the aisles">
        <button class="play-btn" type="button" data-sort="out" aria-pressed="true">Most sold out</button>
        <button class="play-btn" type="button" data-sort="price" aria-pressed="false">Priciest</button>
        <button class="play-btn" type="button" data-sort="size" aria-pressed="false">Most listings</button>
      </div>`;
    const read = bar.querySelector('.play-read');
    const report = () => {
      if (hover < 0) { read.innerHTML = 'Hover or tap an aisle for its numbers. <b>8</b> aisles from the live storefront.'; return; }
      const [name, out, n, med] = AISLES[hover];
      read.innerHTML = `<b>${name}</b> · <b>${out.toLocaleString('en-IN')}</b> of <b>${n.toLocaleString('en-IN')}</b> listings sold out (<b>${((out / n) * 100).toFixed(1)}%</b>) · median price <b>₹${med}</b>`;
    };
    const geo = () => ({ top: h * 0.1, gap: (h * 0.8) / (AISLES.length - 1), left: Math.min(170, w * 0.32), right: w - 64 });
    const yOf = (i, now) => {
      const { top, gap } = geo();
      const p = reduced ? 1 : clamp((now - t0) / 650, 0, 1), e = 1 - Math.pow(1 - p, 3);
      return top + (from[i] + (place[i] - from[i]) * e) * gap;
    };
    const draw = (now) => {
      g.fillStyle = C.bg;
      g.fillRect(0, 0, w, h);
      const { left, right, gap } = geo();
      const step = (right - left) / (COLS - 1), rad = Math.min(step, gap) * 0.28;
      AISLES.forEach(([name, out, n], i) => {
        const y = yOf(i, now);
        if (i === hover) { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, y - gap / 2, w, gap); }
        g.fillStyle = i === hover ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.3)';
        g.beginPath();
        for (let c = 0; c < COLS; c++) if (!hot[i].has(c)) dot(g, left + c * step, y, rad);
        g.fill();
        g.fillStyle = C.red;
        g.beginPath();
        hot[i].forEach((c) => dot(g, left + c * step, y, rad * 1.25));
        g.fill();
        g.font = '500 11px "JetBrains Mono", monospace';
        g.fillStyle = i === hover ? '#fff' : 'rgba(221,224,230,.78)';
        g.textAlign = 'left';
        g.fillText(name, 12, y + 4);
        g.fillStyle = C.red;
        g.textAlign = 'right';
        g.fillText(((out / n) * 100).toFixed(1) + '%', w - 12, y + 4);
        g.textAlign = 'left';
      });
      if (!reduced && now - t0 < 700) k.frame(draw);
    };
    const sortBy = (m) => {
      mode = m;
      const key = { out: (a) => -(a[1] / a[2]), price: (a) => -a[3], size: (a) => -a[2] }[m];
      order = AISLES.map((_, i) => i).sort((a, b) => key(AISLES[a]) - key(AISLES[b]));
      const now = performance.now();
      from = AISLES.map((_, i) => (yOf(i, now) - geo().top) / geo().gap);
      order.forEach((ai, slot) => (place[ai] = slot));
      t0 = now;
      bar.querySelectorAll('[data-sort]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === m)));
      k.frame(draw);
    };
    const rowAt = (y) => {
      const { top, gap } = geo();
      const slot = Math.round((y - top) / gap);
      return slot >= 0 && slot < AISLES.length && Math.abs(y - (top + slot * gap)) < gap / 2 ? order[slot] : -1;
    };
    const point = (e) => { const hv = rowAt(local(canvas, e).y); if (hv !== hover) { hover = hv; report(); k.frame(draw); } };
    k.on(canvas, 'pointermove', point);
    k.on(canvas, 'click', point);
    k.on(canvas, 'pointerleave', () => { hover = -1; report(); k.frame(draw); });
    bar.querySelectorAll('[data-sort]').forEach((b) => k.on(b, 'click', () => sortBy(b.dataset.sort)));
    let rt;
    k.on(window, 'resize', () => { clearTimeout(rt); rt = setTimeout(() => { ({ g, w, h } = fit(canvas)); k.frame(draw); }, 200); });
    report();
    k.frame(draw);
    return k.stop;
  };

  const MODS = { lifeline, broadbridge, upi, saferoute, darklytics };
  window.LINE_PLAY = {
    mount(key, canvas, bar) {
      const fn = MODS[key];
      if (!fn || !canvas || !bar) return null;
      bar.innerHTML = '';
      try { return fn(canvas, bar); } catch (e) { bar.innerHTML = ''; return null; }
    },
  };
})();
