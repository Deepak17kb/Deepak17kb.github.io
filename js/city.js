/* =========================================================
   The Deepak Line: the skyline.
   The stack as a night city: one tower per tool, as tall as the number of
   projects that run on it. Pick a project and its train threads its towers.
   Draws only while on screen, with flat fills (no per-frame gradients).
   ========================================================= */
(() => {
  'use strict';

  const host = document.querySelector('.city');
  if (!host) return;
  const cv = host.querySelector('.city__cv');
  const card = host.querySelector('.city__card');
  const chips = host.querySelector('.city__lines');
  const alt = host.querySelector('.city__alt');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // what each project was built with, as its case file lists it
  const PROJECTS = [
    ['Darklytics', ['Python', 'pandas', 'LightGBM', 'DuckDB', 'JavaScript']],
    ['BroadBridge', ['TypeScript', 'React', 'Node', 'Claude', 'Groq', 'Monte Carlo']],
    ['UPI Risk Desk', ['Python', 'pandas', 'NetworkX', 'SQLite', 'ECharts', 'Claude']],
    ['NER SafeRoute', ['Python', 'FastAPI', 'React', 'Leaflet', 'PostGIS', 'scikit-learn', 'OSRM']],
    ['LifeLine', ['C++17', 'React', 'REST', 'Graph algorithms']],
    ['KrishiMitra', ['Node', 'Express', 'Gemini API']],
    ['Global Jobs Analytics', ['Power BI', 'DAX', 'Power Query']],
    ['Deadlock Detector', ['JavaScript', 'Graph algorithms']],
    ['Echo Voice Studio', ['Python', 'Pyodide', 'SQLite', 'JavaScript', 'Web Speech API']],
  ];
  // districts: [name, x, y, lots per row, towers]
  const DISTRICTS = [
    ['AI', 0, 0, 2, ['Claude', 'Groq', 'Gemini API']],
    ['Machine learning', 4.2, 0, 2, ['LightGBM', 'scikit-learn', 'Monte Carlo']],
    ['Algorithms', 8.4, 0, 2, ['Graph algorithms', 'NetworkX', 'C++17', 'OSRM']],
    ['Data', 0, 4.6, 3, ['Python', 'pandas', 'DuckDB', 'SQLite', 'PostGIS']],
    ['Analytics', 5.6, 4.6, 2, ['Power BI', 'DAX', 'Power Query', 'ECharts']],
    ['Apps', 9.8, 4.6, 4, ['JavaScript', 'TypeScript', 'React', 'Node', 'Express', 'FastAPI', 'REST', 'Leaflet', 'Pyodide', 'Web Speech API']],
  ];
  const LOT = 1.5, HW = 0.42;
  const towers = [];
  DISTRICTS.forEach(([dname, ox, oy, per, names], di) => names.forEach((name, i) => {
    const used = PROJECTS.filter(([, s]) => s.includes(name)).map(([p]) => p);
    towers.push({ name, district: dname, di, x: ox + (i % per) * LOT + 0.5, y: oy + Math.floor(i / per) * LOT + 0.5, used, n: used.length, H: 1 + used.length * 1.35, k: towers.length });
  }));
  const CX = 7.8, CY = 4.6;
  const pads = DISTRICTS.map(([dname, ox, oy, per, names]) => {
    const rows = Math.ceil(names.length / per);
    return { name: dname, x0: ox - 0.15, y0: oy - 0.15, x1: ox + (per - 1) * LOT + 1.15, y1: oy + (rows - 1) * LOT + 1.15 };
  });
  // a stable pattern of lit windows for each tower
  const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  // a text version of the city for screen readers
  if (alt) {
    alt.innerHTML = '<p>My tools by how many of my projects use them:</p><ul>' + towers.slice().sort((a, b) => b.n - a.n)
      .map((t) => `<li>${esc(t.name)}: ${t.n} project${t.n === 1 ? '' : 's'} (${esc(t.used.join(', '))})</li>`).join('') + '</ul>';
  }

  let g, w = 0, h = 0, s = 1, cx = 0, cy = 0, d = 1;
  // the camera faces the long side of the city, so it spreads across the frame
  const HOME = -0.78, LO = -1.3, HI = -0.25;
  let th = HOME, spin = 0, sway = 0, drag = null, lastInput = -1e9, t0 = 0, raf = 0, on = false, grown = reduced;
  let pick = -1, project = -1, tourAt = 0, trainU = 0, trainDir = 1, lastNow = 0;
  let route = [];
  const stars = [];
  const glow = document.createElement('canvas');
  const fit = () => {
    d = Math.min(1.25, window.devicePixelRatio || 1);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = Math.round(w * d); cv.height = Math.round(h * d);
    g = cv.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    s = 0; // refitted on the next frame
    stars.length = 0;
    for (let i = 0; i < 90; i++) stars.push([hash(i, 1, 7) * w, hash(i, 2, 7) * h * 0.55, hash(i, 3, 7)]);
    glow.width = glow.height = 64;
    const q = glow.getContext('2d'), gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,42,70,.55)'); gr.addColorStop(1, 'rgba(255,42,70,0)');
    q.fillStyle = gr; q.fillRect(0, 0, 64, 64);
  };
  let cos = 1, sin = 0;
  const P = (x, y, z) => {
    const dx = x - CX, dy = y - CY, xr = dx * cos - dy * sin, yr = dx * sin + dy * cos;
    return [cx + (xr - yr) * 0.866 * s, cy + (xr + yr) * 0.5 * s - z * s * 0.92, xr + yr];
  };
  const poly = (pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
  const NORMALS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const LIGHT = [-0.55, -0.83];
  const easeBack = (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const hulls = [];

  const hot = () => (project >= 0 ? new Set(PROJECTS[project][1]) : null);
  const drawTower = (t, H, set) => {
    const lit = set ? set.has(t.name) : false;
    const dim = set && !lit;
    const c = [[t.x - HW, t.y - HW], [t.x + HW, t.y - HW], [t.x + HW, t.y + HW], [t.x - HW, t.y + HW]];
    const B = c.map(([x, y]) => P(x, y, 0)), T = c.map(([x, y]) => P(x, y, H));
    g.globalAlpha = dim ? 0.32 : 1;
    for (let k = 0; k < 4; k++) {
      const [nx, ny] = NORMALS[k];
      const facing = (nx * cos - ny * sin) + (nx * sin + ny * cos);
      if (facing <= 0.02) continue;
      const a = k, b = (k + 1) % 4;
      const shade = 0.5 + 0.5 * (nx * LIGHT[0] + ny * LIGHT[1]);
      const v = Math.round(18 + shade * 20 + (lit ? 8 : 0));
      g.fillStyle = `rgb(${v},${v + 2},${v + 8})`;
      poly([B[a], B[b], T[b], T[a]]);
      g.fill();
      // windows: two columns a floor, lit in a pattern of their own
      const floors = Math.floor((H - 0.32) / 0.42);
      const buckets = [[], [], []];
      for (let f = 0; f < floors; f++) for (let j = 0; j < 2; j++) {
        const r = hash(t.k, k * 40 + f, j);
        const bucket = lit ? 2 : r < 0.45 ? 0 : r < 0.8 ? 1 : 2;
        const u0 = j ? 0.58 : 0.16, u1 = j ? 0.84 : 0.42, z0 = 0.28 + f * 0.42, z1 = z0 + 0.2;
        const at = (u, z) => [B[a][0] + (B[b][0] - B[a][0]) * u, B[a][1] + (B[b][1] - B[a][1]) * u - z * s * 0.92];
        buckets[bucket].push([at(u0, z0), at(u1, z0), at(u1, z1), at(u0, z1)]);
      }
      ['rgba(255,255,255,.05)', 'rgba(255,255,255,.42)', lit ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.78)'].forEach((col, bi) => {
        if (!buckets[bi].length) return;
        g.fillStyle = col;
        g.beginPath();
        buckets[bi].forEach((q) => { g.moveTo(q[0][0], q[0][1]); g.lineTo(q[1][0], q[1][1]); g.lineTo(q[2][0], q[2][1]); g.lineTo(q[3][0], q[3][1]); g.closePath(); });
        g.fill();
      });
    }
    const tv = lit ? 66 : 46;
    g.fillStyle = `rgb(${tv},${tv + 3},${tv + 12})`;
    poly(T);
    g.fill();
    if (lit || t.k === pick) {
      g.strokeStyle = 'rgba(255,255,255,.7)';
      g.lineWidth = 1.2;
      poly(T);
      g.stroke();
    }
    g.globalAlpha = 1;
    return B.concat(T);
  };
  // convex hull of a tower's corners, for picking it under the pointer
  const hull = (pts) => {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  };
  const inside = (hl, x, y) => {
    let sign = 0;
    for (let i = 0; i < hl.length; i++) {
      const a = hl[i], b = hl[(i + 1) % hl.length];
      const c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
      if (c === 0) continue;
      if (!sign) sign = Math.sign(c);
      else if (Math.sign(c) !== sign) return false;
    }
    return true;
  };

  // the train visits a project's towers nearest-first, so its route stays the same as the city turns
  const plan = () => {
    route = [];
    if (project < 0) return;
    const set = new Set(PROJECTS[project][1]);
    const left = towers.filter((t) => set.has(t.name));
    let cur = left.reduce((a, b) => (a.x + a.y <= b.x + b.y ? a : b));
    while (cur) {
      route.push(cur);
      left.splice(left.indexOf(cur), 1);
      cur = left.reduce((best, t) => (!best || Math.hypot(t.x - cur.x, t.y - cur.y) < Math.hypot(best.x - cur.x, best.y - cur.y) ? t : best), null);
    }
    trainU = 0;
    trainDir = 1;
  };

  const say = () => {
    if (pick >= 0) {
      const t = towers[pick];
      card.innerHTML = `<strong>${esc(t.name)}</strong><span>${esc(t.district)} district</span><p>Runs <b>${t.n}</b> of my projects: ${esc(t.used.join(', '))}.</p>`;
    } else if (project >= 0) {
      const [name, stack] = PROJECTS[project];
      card.innerHTML = `<strong>${esc(name)}</strong><span>Express service</span><p>Built on <b>${stack.length}</b> towers: ${esc(stack.join(' · '))}.</p>`;
    } else {
      const top = towers.reduce((a, b) => (b.n > a.n ? b : a));
      card.innerHTML = `<strong>The whole city</strong><span>${towers.length} tools · ${DISTRICTS.length} districts</span><p><b>${esc(top.name)}</b> stands tallest: <b>${top.n}</b> of my projects run on it. Hover a tower, or pick a project below.</p>`;
    }
  };
  const choose = (i, fromUser) => {
    project = i;
    if (fromUser) lastInput = performance.now();
    chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.p) === i)));
    plan();
    say();
    frame();
  };

  const draw = (now) => {
    const dt = lastNow ? Math.min(50, now - lastNow) / 1000 : 0;
    lastNow = now;
    const idle = now - lastInput > 3500;
    if (!drag) {
      if (Math.abs(spin) > 0.0005) { th = clamp(th + spin, LO, HI); spin *= 0.92; }
      else if (idle && !reduced) {
        // left alone, the camera sways gently around its best angle
        sway += dt * 0.16;
        th += (HOME + 0.26 * Math.sin(sway) - th) * Math.min(1, dt * 0.8);
      }
    }
    // a project tour plays while nobody touches it
    if (!reduced && now - lastInput > 8000 && now > tourAt) {
      tourAt = now + 4600;
      choose((project + 1) % PROJECTS.length, false);
    }
    cos = Math.cos(th); sin = Math.sin(th);
    // fit the towers to the frame at this angle, leaving room above for names
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    towers.forEach((t) => [[-HW, -HW], [HW, -HW], [HW, HW], [-HW, HW]].forEach(([ox, oy]) => {
      const dx = t.x + ox - CX, dy = t.y + oy - CY, xr = dx * cos - dy * sin, yr = dx * sin + dy * cos;
      const X = (xr - yr) * 0.866, Y = (xr + yr) * 0.5;
      x0 = Math.min(x0, X); x1 = Math.max(x1, X);
      y0 = Math.min(y0, Y - (t.H + 1.6) * 0.92); y1 = Math.max(y1, Y);
    }));
    const narrow = w < 600, padX = narrow ? 18 : 60, padT = narrow ? 20 : 40, padB = narrow ? 34 : 56;
    const ns = Math.min((w - 2 * padX) / (x1 - x0), (h - padT - padB) / (y1 - y0));
    const ncx = w / 2 - (ns * (x0 + x1)) / 2, ncy = padT + (h - padT - padB) / 2 - (ns * (y0 + y1)) / 2;
    if (!s) { s = ns; cx = ncx; cy = ncy; }
    else { const k = Math.min(1, dt * 4); s += (ns - s) * k; cx += (ncx - cx) * k; cy += (ncy - cy) * k; }
    g.fillStyle = '#050507';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.beginPath();
    stars.forEach(([x, y, r]) => { g.moveTo(x + 0.6 + r, y); g.arc(x, y, 0.6 + r * 0.8, 0, Math.PI * 2); });
    g.fill();
    // the ground, the district pads and their names
    g.fillStyle = '#0B0C12';
    poly([P(-1.6, -1.6, 0), P(17, -1.6, 0), P(17, 10.6, 0), P(-1.6, 10.6, 0)]);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.06)';
    g.lineWidth = 1;
    g.stroke();
    pads.forEach((p) => { g.fillStyle = '#101219'; poly([P(p.x0, p.y0, 0), P(p.x1, p.y0, 0), P(p.x1, p.y1, 0), P(p.x0, p.y1, 0)]); g.fill(); });
    g.font = '500 10.5px "JetBrains Mono", monospace';
    g.textAlign = 'center';
    g.fillStyle = 'rgba(221,224,230,.55)';
    pads.forEach((p) => {
      const corner = [[p.x0, p.y1], [p.x1, p.y1], [p.x1, p.y0], [p.x0, p.y0]].map(([x, y]) => P(x, y, 0)).reduce((a, b) => (b[1] > a[1] ? b : a));
      g.fillText(p.name.toUpperCase(), corner[0], corner[1] + 16);
    });
    // towers, back to front; on arrival they rise out of the ground with a bounce
    const set = hot();
    const order = towers.map((t) => ({ t, z: P(t.x, t.y, 0)[2] })).sort((a, b) => a.z - b.z);
    let growing = false;
    order.forEach(({ t }) => {
      let H = t.H;
      if (!grown) {
        const p = clamp((now - t0 - t.k * 45) / 900, 0, 1);
        if (p < 1) growing = true;
        H = Math.max(0.02, t.H * easeBack(p));
      }
      hulls[t.k] = hull(drawTower(t, H, set));
    });
    if (!growing) grown = true;
    // the elevated line and its train
    if (route.length > 1) {
      const pts = route.map((t) => P(t.x, t.y, t.H + 0.75));
      g.strokeStyle = 'rgba(255,255,255,.22)';
      g.lineWidth = 1;
      g.beginPath();
      route.forEach((t, i) => { const r = P(t.x, t.y, t.H); g.moveTo(r[0], r[1]); g.lineTo(pts[i][0], pts[i][1]); });
      g.stroke();
      g.lineCap = 'round';
      g.lineJoin = 'round';
      const rail = () => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); };
      g.strokeStyle = 'rgba(255,42,70,.22)';
      g.lineWidth = 9;
      rail(); g.stroke();
      g.strokeStyle = '#FF2A46';
      g.lineWidth = 2.6;
      rail(); g.stroke();
      g.fillStyle = '#fff';
      g.beginPath(); pts.forEach((p) => { g.moveTo(p[0] + 3, p[1]); g.arc(p[0], p[1], 3, 0, Math.PI * 2); }); g.fill();
      const lens = [0];
      for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const total = lens[lens.length - 1] || 1;
      if (!reduced) {
        trainU += (dt * 160 * trainDir) / total;
        if (trainU > 1) { trainU = 1; trainDir = -1; }
        if (trainU < 0) { trainU = 0; trainDir = 1; }
      }
      const at = trainU * total;
      let i = 1;
      while (i < lens.length - 1 && lens[i] < at) i++;
      const f = (at - lens[i - 1]) / Math.max(1e-6, lens[i] - lens[i - 1]);
      const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f;
      const ang = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]) + (trainDir < 0 ? Math.PI : 0);
      g.drawImage(glow, x - 26, y - 26, 52, 52);
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      g.fillStyle = '#FF2A46';
      g.beginPath(); if (g.roundRect) g.roundRect(-12, -4.5, 24, 9, 4.5); else g.rect(-12, -4.5, 24, 9); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(9, 0, 2, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    // names over the towers that matter right now
    g.font = '500 11px "JetBrains Mono", monospace';
    g.textAlign = 'center';
    towers.forEach((t) => {
      if (!(set && set.has(t.name)) && t.k !== pick) return;
      const [x, y] = P(t.x, t.y, t.H + (route.length > 1 ? 1.4 : 0.6));
      const label = t.name.toUpperCase(), tw = g.measureText(label).width + 14;
      g.fillStyle = 'rgba(5,5,7,.82)';
      g.fillRect(x - tw / 2, y - 15, tw, 20);
      g.fillStyle = '#fff';
      g.fillText(label, x, y - 1);
    });
    g.textAlign = 'left';
  };
  // the city moves slowly, so about ninety pictures a second is plenty, even on a 165 Hz screen; on touch devices, forty-five
  const CAP = matchMedia('(pointer: coarse)').matches ? 21 : 10.5;
  let shown = 0;
  const loop = (now) => {
    raf = 0;
    if (!on) return;
    if (now - shown >= CAP) { shown = now; draw(now); }
    raf = requestAnimationFrame(loop);
  };
  const frame = () => { if (!raf) raf = requestAnimationFrame(loop); };

  // pointer: drag to turn the city, hover or tap a tower to read it
  const local = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) * w) / r.width, ((e.clientY - r.top) * h) / r.height]; };
  const pickAt = (x, y) => {
    let found = -1, best = -Infinity;
    towers.forEach((t) => { const hl = hulls[t.k]; if (hl && inside(hl, x, y)) { const z = P(t.x, t.y, 0)[2]; if (z > best) { best = z; found = t.k; } } });
    return found;
  };
  cv.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, moved: 0 };
    lastInput = performance.now();
    spin = 0;
  });
  cv.addEventListener('pointermove', (e) => {
    const [x, y] = local(e);
    if (drag && (e.buttons || e.pointerType === 'touch')) {
      const dx = e.clientX - drag.x;
      drag.x = e.clientX;
      drag.moved += Math.abs(dx);
      th = clamp(th + dx * 0.006, LO, HI);
      spin = dx * 0.006;
      lastInput = performance.now();
      if (drag.moved > 6 && e.pointerType !== 'mouse') cv.setPointerCapture(e.pointerId);
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const k = pickAt(x, y);
    if (k !== pick) { pick = k; cv.style.cursor = k >= 0 ? 'pointer' : 'grab'; say(); }
  });
  const release = (e) => {
    if (drag && drag.moved < 6) {
      const [x, y] = local(e);
      const k = pickAt(x, y);
      pick = k === pick && e.pointerType !== 'mouse' ? -1 : k;
      lastInput = performance.now();
      say();
    }
    drag = null;
  };
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', () => { drag = null; });
  cv.addEventListener('pointerleave', () => { if (!drag) { pick = -1; say(); } });

  chips.innerHTML = `<button type="button" data-p="-1" aria-pressed="true">Whole city</button>` +
    PROJECTS.map(([name], i) => `<button type="button" data-p="${i}" aria-pressed="false">${esc(name)}</button>`).join('');
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-p]');
    if (b) choose(Number(b.dataset.p), true);
  });

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (cv.clientWidth !== w || cv.clientHeight !== h) { fit(); frame(); } }, 200); });
  new IntersectionObserver(([e]) => {
    on = e.isIntersecting;
    if (on) {
      if (!w) fit();
      if (!t0) { t0 = performance.now(); lastInput = t0 - 5000; tourAt = t0 + 2600; }
      lastNow = 0;
      frame();
    }
  }, { rootMargin: '0px 0px -5% 0px' }).observe(cv);
  say();
})();
