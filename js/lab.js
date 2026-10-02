/* =========================================================
   Path Lab — paint walls & mud, drag the pins, and race
   A*, Dijkstra, BFS and Greedy best-first on a grid.
   Plain canvas, no dependencies; redraws only when needed.
   ========================================================= */
(() => {
  const app = document.querySelector('.lab__app');
  if (!app) return;

  const $ = (s) => app.querySelector(s);
  const $$ = (s) => [...app.querySelectorAll(s)];
  const stage = $('.lab__stage');
  const canvas = $('.lab__canvas');
  const ctx = canvas.getContext('2d');
  const statusEl = $('.lab__status');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toast = (msg) => window.DKB && window.DKB.toast(msg);

  const EMPTY = 0, WALL = 1, MUD = 2;
  const MUD_COST = 5;
  const STEPS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const NAMES = { astar: 'A*', dijkstra: 'Dijkstra', bfs: 'BFS', greedy: 'Greedy' };

  let cols = 0, rows = 0, size = 0, dpr = 1, width = 0;
  let grid = new Uint8Array(0);
  let start = 0, end = 0;
  let algo = 'astar';
  let brush = 'wall';
  let result = null;   // search shown on the canvas (null until the first run)
  let anim = null;     // { t0, visitDur, pathDur } while the run is playing
  let hover = -1;
  let drag = null;     // 'start' | 'end' | 'paint'
  let paintValue = WALL;
  let lastCell = -1;
  let dirty = true;    // grid changed → re-run searches on the next frame
  let colors = {};
  let raf = 0;

  /* ---------- Search ---------- */
  // Binary min-heap ordered by (priority, tie-break, insertion order)
  function makeHeap() {
    const a = [];
    let seq = 0;
    const less = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
    return {
      get size() { return a.length; },
      push(node, p, t) {
        a.push([p, t, seq++, node]);
        let i = a.length - 1;
        while (i > 0) {
          const up = (i - 1) >> 1;
          if (less(a[i], a[up]) >= 0) break;
          [a[i], a[up]] = [a[up], a[i]];
          i = up;
        }
      },
      pop() {
        const top = a[0];
        const last = a.pop();
        if (a.length) {
          a[0] = last;
          for (let i = 0; ;) {
            const l = 2 * i + 1, r = l + 1;
            let m = i;
            if (l < a.length && less(a[l], a[m]) < 0) m = l;
            if (r < a.length && less(a[r], a[m]) < 0) m = r;
            if (m === i) break;
            [a[i], a[m]] = [a[m], a[i]];
            i = m;
          }
        }
        return top[3];
      },
    };
  }

  function search(kind) {
    const t0 = performance.now();
    const n = cols * rows;
    const dist = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const visited = [];
    const ex = end % cols, ey = (end / cols) | 0;
    const h = (i) => Math.abs((i % cols) - ex) + Math.abs(((i / cols) | 0) - ey);
    const heap = makeHeap();
    dist[start] = 0;
    heap.push(start, 0, 0);

    while (heap.size) {
      const u = heap.pop();
      if (closed[u]) continue;
      closed[u] = 1;
      visited.push(u);
      if (u === end) break;
      const ux = u % cols, uy = (u / cols) | 0;
      for (const [sx, sy] of STEPS) {
        const x = ux + sx, y = uy + sy;
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        const v = y * cols + x;
        if (closed[v] || grid[v] === WALL) continue;
        // BFS counts steps and is blind to mud; everyone else pays for it
        const d = dist[u] + (kind !== 'bfs' && grid[v] === MUD ? MUD_COST : 1);
        if (kind === 'greedy') {
          if (dist[v] !== Infinity) continue; // first discovery wins
          dist[v] = d; prev[v] = u;
          heap.push(v, h(v), 0);
        } else if (d < dist[v]) {
          dist[v] = d; prev[v] = u;
          if (kind === 'astar') heap.push(v, d + h(v), h(v));
          else heap.push(v, d, 0);
        }
      }
    }

    const path = [];
    if (closed[end]) for (let i = end; i !== -1; i = prev[i]) path.push(i);
    path.reverse();
    let cost = 0;
    for (let k = 1; k < path.length; k++) cost += grid[path[k]] === MUD ? MUD_COST : 1;
    return { kind, visited, path, cost, found: path.length > 0, ms: performance.now() - t0 };
  }

  /* ---------- Race board ---------- */
  const cards = $$('.algo');
  function race() {
    const runs = {};
    for (const k of Object.keys(NAMES)) runs[k] = search(k);
    const best = runs.dijkstra.found ? runs.dijkstra.cost : null;
    const most = Math.max(1, ...Object.values(runs).map((r) => r.visited.length));
    cards.forEach((card) => {
      const r = runs[card.dataset.algo];
      card.querySelector('[data-v]').textContent = r.visited.length;
      card.querySelector('[data-c]').textContent = r.found ? r.cost : '—';
      card.querySelector('.algo__bar i').style.transform = `scaleX(${r.visited.length / most})`;
      const flag = card.querySelector('.algo__flag');
      const optimal = r.found && r.cost === best;
      flag.textContent = !r.found ? 'no path' : optimal ? 'optimal' : `+${r.cost - best} cost`;
      flag.classList.toggle('is-good', optimal);
      flag.classList.toggle('is-bad', r.found && !optimal);
    });
    return runs;
  }

  function status() {
    if (!result) {
      statusEl.innerHTML = 'Drag the pins, paint the grid, then pick an algorithm.';
    } else if (!result.found) {
      statusEl.innerHTML = `<b>${NAMES[result.kind]}</b> explored <b>${result.visited.length}</b> cells. No route: the pins are walled off.`;
    } else {
      statusEl.innerHTML =
        `<b>${NAMES[result.kind]}</b> explored <b>${result.visited.length}</b> cells · ` +
        `path <b>${result.path.length - 1}</b> steps · cost <b>${result.cost}</b> · <b>${result.ms.toFixed(2)}</b> ms`;
    }
  }

  // Re-run everything after an edit. Once something has been run, the canvas stays live.
  function recompute() {
    dirty = false;
    const runs = race();
    if (result) result = runs[algo];
    status();
  }

  function run(animate = !reduced) {
    dirty = false;
    const runs = race();
    result = runs[algo];
    status();
    anim = animate
      ? {
          t0: performance.now(),
          visitDur: Math.min(1600, Math.max(450, result.visited.length * 3.2)),
          pathDur: Math.min(900, Math.max(300, result.path.length * 14)),
        }
      : null;
    if (!result.found) toast('No path. The pins are walled off ✕');
    request();
  }

  /* ---------- Grid set-up ---------- */
  function placePins() {
    const pr = (rows >> 1) | 1; // odd row so pins sit on maze cells
    start = pr * cols + 1;
    end = pr * cols + cols - 2;
  }

  // Demo: a thick wall with a far gap up top and a muddy shortcut below.
  // BFS wades through the mud (fewer steps); Dijkstra and A* pay less by going around.
  function seed() {
    grid = new Uint8Array(cols * rows);
    placePins();
    const mid = cols >> 1;
    const pr = (rows >> 1) | 1;
    for (let y = 0; y < rows; y++) {
      for (let x = mid - 1; x <= mid + 1; x++) {
        const gap = y === 1 || y === 2;
        const mud = y === pr + 4 || y === pr + 5;
        grid[y * cols + x] = gap ? EMPTY : mud ? MUD : WALL;
      }
    }
    result = null;
    anim = null;
    dirty = true;
  }

  // Recursive-backtracker maze, then knock out some walls for loops and spill a little mud
  function maze() {
    grid.fill(WALL);
    placePins();
    const stack = [[1, 1]];
    grid[cols + 1] = EMPTY;
    const jumps = [[0, -2], [2, 0], [0, 2], [-2, 0]];
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const open = jumps.filter(([jx, jy]) => {
        const nx = x + jx, ny = y + jy;
        return nx > 0 && ny > 0 && nx < cols - 1 && ny < rows - 1 && grid[ny * cols + nx] === WALL;
      });
      if (!open.length) { stack.pop(); continue; }
      const [jx, jy] = open[(Math.random() * open.length) | 0];
      grid[(y + jy / 2) * cols + x + jx / 2] = EMPTY;
      grid[(y + jy) * cols + x + jx] = EMPTY;
      stack.push([x + jx, y + jy]);
    }
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const i = y * cols + x;
        if (grid[i] === WALL && x % 2 !== y % 2 && Math.random() < 0.12) grid[i] = EMPTY;
        else if (grid[i] === EMPTY && Math.random() < 0.07) grid[i] = MUD;
      }
    }
    grid[start] = grid[end] = EMPTY;
    dirty = true;
  }

  function layout() {
    const w = stage.clientWidth;
    if (!w || w === width) return;
    width = w;
    const small = w < 640;
    let c = Math.floor(w / (small ? 20 : 26));
    if (c % 2 === 0) c -= 1;
    const r = small ? 21 : 19;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = w / c;
    canvas.style.height = r * size + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(r * size * dpr);
    if (c !== cols || r !== rows) {
      cols = c;
      rows = r;
      seed();
    }
    request();
  }

  /* ---------- Drawing ---------- */
  function readColors() {
    const cs = getComputedStyle(app);
    const v = (n) => cs.getPropertyValue(n).trim();
    colors = { bg: v('--card'), ink: v('--ink'), paper: v('--paper'), accent: v('--accent'), line: v('--line'), muted: v('--muted') };
  }

  const cx = (i) => (i % cols + 0.5) * size;
  const cy = (i) => (((i / cols) | 0) + 0.5) * size;

  function draw(now) {
    const W = cols * size, H = rows * size;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);

    // grid lines
    ctx.beginPath();
    for (let x = 1; x < cols; x++) { const p = Math.round(x * size) + 0.5; ctx.moveTo(p, 0); ctx.lineTo(p, H); }
    for (let y = 1; y < rows; y++) { const p = Math.round(y * size) + 0.5; ctx.moveTo(0, p); ctx.lineTo(W, p); }
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.stroke();

    // mud
    ctx.fillStyle = colors.muted;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] !== MUD) continue;
      const x = (i % cols) * size, y = ((i / cols) | 0) * size;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(x, y, size, size);
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(x + size * 0.3, y + size * 0.35, size * 0.08, 0, 7);
      ctx.arc(x + size * 0.68, y + size * 0.68, size * 0.08, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // explored cells: pop in bright, then settle
    let pathShown = 0;
    if (result) {
      const V = result.visited;
      let shown = V.length;
      pathShown = 1;
      if (anim) {
        const t = now - anim.t0;
        shown = Math.min(V.length, Math.floor((t / anim.visitDur) * V.length));
        pathShown = t > anim.visitDur ? Math.min(1, (t - anim.visitDur) / anim.pathDur) : 0;
      }
      ctx.fillStyle = colors.accent;
      for (let k = 0; k < shown; k++) {
        const i = V[k];
        if (i === start || i === end) continue;
        const age = anim ? now - (anim.t0 + (k / V.length) * anim.visitDur) : 1e9;
        const s = size * (0.5 + 0.5 * Math.min(1, age / 180));
        ctx.globalAlpha = 0.14 + 0.5 * Math.max(0, 1 - age / 500);
        ctx.fillRect(cx(i) - s / 2, cy(i) - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }

    // walls
    ctx.fillStyle = colors.ink;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === WALL) ctx.fillRect((i % cols) * size, ((i / cols) | 0) * size, size + 0.5, size + 0.5);
    }

    // path, drawn as a line with a runner at its head
    if (result && result.path.length > 1 && pathShown > 0) {
      const P = result.path;
      const segs = P.length - 1;
      const upto = pathShown * segs;
      const whole = Math.floor(upto);
      ctx.beginPath();
      ctx.moveTo(cx(P[0]), cy(P[0]));
      for (let k = 1; k <= whole; k++) ctx.lineTo(cx(P[k]), cy(P[k]));
      let hx = cx(P[whole]), hy = cy(P[whole]);
      if (whole < segs) {
        const f = upto - whole;
        hx += (cx(P[whole + 1]) - hx) * f;
        hy += (cy(P[whole + 1]) - hy) * f;
        ctx.lineTo(hx, hy);
      }
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = Math.max(3, size * 0.28);
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.stroke();
      if (pathShown < 1) {
        ctx.fillStyle = colors.ink;
        ctx.beginPath();
        ctx.arc(hx, hy, size * 0.3, 0, 7);
        ctx.fill();
      }
    }

    // brush preview
    if (hover >= 0 && !drag && hover !== start && hover !== end) {
      const x = (hover % cols) * size, y = ((hover / cols) | 0) * size;
      ctx.strokeStyle = colors.ink;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
      ctx.globalAlpha = 1;
    }

    // pins
    const pin = (i, fill, ring) => {
      const big = hover === i || drag === (i === start ? 'start' : 'end');
      const r = size * (big ? 0.44 : 0.36);
      ctx.beginPath();
      ctx.arc(cx(i), cy(i), r, 0, 7);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = ring;
      ctx.stroke();
    };
    pin(start, colors.ink, colors.bg);
    pin(end, colors.accent, colors.bg);
    ctx.beginPath();
    ctx.arc(cx(end), cy(end), size * 0.12, 0, 7);
    ctx.fillStyle = colors.bg;
    ctx.fill();
  }

  function request() {
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    if (dirty) recompute();
    draw(now);
    if (anim) {
      if (now - anim.t0 > anim.visitDur + anim.pathDur) anim = null;
      request();
    }
  }

  /* ---------- Pointer: paint cells, drag pins ---------- */
  const cellAt = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * cols);
    const y = Math.floor(((e.clientY - r.top) / r.height) * rows);
    return x < 0 || y < 0 || x >= cols || y >= rows ? -1 : y * cols + x;
  };
  const setCursor = (i) => {
    canvas.style.cursor = drag === 'start' || drag === 'end' ? 'grabbing' : i === start || i === end ? 'grab' : 'crosshair';
  };
  const changed = () => {
    anim = null; // editing mid-animation jumps straight to the live result
    dirty = true;
    request();
  };
  const paint = (i) => {
    if (i === start || i === end || grid[i] === paintValue) return;
    grid[i] = paintValue;
    changed();
  };
  // Bresenham, so fast strokes don't leave gaps
  const stroke = (a, b) => {
    let x0 = a % cols, y0 = (a / cols) | 0;
    const x1 = b % cols, y1 = (b / cols) | 0;
    const ddx = Math.abs(x1 - x0), ddy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = ddx + ddy;
    for (;;) {
      paint(y0 * cols + x0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= ddy) { err += ddy; x0 += sx; }
      if (e2 <= ddx) { err += ddx; y0 += sy; }
    }
  };
  const movePin = (i) => {
    if (grid[i] === WALL || i === start || i === end) return;
    if (drag === 'start') start = i;
    else end = i;
    changed();
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const i = cellAt(e);
    if (i < 0) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    lastCell = i;
    if (i === start || i === end) {
      drag = i === start ? 'start' : 'end';
    } else {
      drag = 'paint';
      const target = brush === 'wall' ? WALL : brush === 'mud' ? MUD : EMPTY;
      paintValue = grid[i] === target ? EMPTY : target; // stroking over the same type erases
      paint(i);
    }
    setCursor(i);
    request();
  });
  canvas.addEventListener('pointermove', (e) => {
    const i = cellAt(e);
    if (!drag) {
      if (i !== hover) { hover = i; setCursor(i); request(); }
      return;
    }
    if (i < 0 || i === lastCell) return;
    if (drag === 'paint') stroke(lastCell, i);
    else movePin(i);
    lastCell = i;
  });
  const endDrag = () => {
    drag = null;
    setCursor(hover);
    request();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => {
    if (drag) return;
    hover = -1;
    request();
  });

  /* ---------- Controls ---------- */
  const press = (group, btn) => group.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  const brushes = $$('[data-brush]');
  brushes.forEach((b) => b.addEventListener('click', () => { brush = b.dataset.brush; press(brushes, b); }));
  cards.forEach((b) => b.addEventListener('click', () => { algo = b.dataset.algo; press(cards, b); run(); }));
  $('[data-lab="run"]').addEventListener('click', () => run());
  $('[data-lab="maze"]').addEventListener('click', () => { maze(); run(); });
  $('[data-lab="clear"]').addEventListener('click', () => {
    grid.fill(EMPTY);
    result = null;
    anim = null;
    dirty = true;
    request();
  });

  /* ---------- Boot ---------- */
  readColors();
  layout();
  let resizeTimer;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 120);
  }).observe(stage);
  // Theme switch: repaint right away so the view-transition snapshot has the new colours
  new MutationObserver(() => {
    readColors();
    if (dirty) recompute();
    draw(performance.now());
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // First time the lab is properly on screen, play a demo run
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    if (!result) run();
  }, { threshold: 0.45 });
  io.observe(stage);
})();
