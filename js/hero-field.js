/* =========================================================
   Hero backdrop: flowing strands.
   4,500 particles drift through a smooth noise field and each frame draws a
   1px line from where it was to where it is, at 5% opacity. The canvas is
   never cleared, so wherever paths bunch together the strokes pile up into
   brighter strands. It starts drawing under the intro loader, so the field is
   already dense when the loader fades. Desktop layout only (861px+), off for
   reduced motion; the canvas pauses whenever the hero is off-screen.
   ========================================================= */
(() => {
  const box = document.querySelector('.hero__field');
  const canvas = box && box.querySelector('canvas');
  if (!canvas || !canvas.getContext) return;
  // same breakpoint as the hero layout: below it the photo is a see-through watermark, so nothing may run behind it
  const wide = window.matchMedia('(min-width: 861px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const COUNT = 4500;
  const CELL = 10; // field resolution, px
  const PAD = 100; // particles live in a margin around the canvas too
  const SPEED = 2.2;
  const PULL = 3;
  const ALPHA = 0.05;
  const BATCHES = 450; // many small strokes: where strands bunch up in the same frame they still add up, as with one stroke each
  // One fixed seed: the same field every visit, chosen offline from 600 candidates as the closest to the reference
  // (strands sweeping down and to the right, one bright ribbon through the left of the hero).
  const SEED = 466;
  const COLORS = { dark: '46, 150, 112', light: '150, 184, 165' }; // forest green, leaning to the sage of the car in the reference
  const THREADS = { dark: '226, 28, 52', light: '226, 150, 160' }; // one stroke batch in ten is crimson

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, W2 = 0, H2 = 0, cols = 0, rows = 0, dpr = 1;
  let fx = null, fy = null; // field vectors per cell
  let px, py, qx, qy, vx, vy, ax, ay; // particle position, previous position, velocity, pull
  let ready = false, building = 0, raf = 0, onScreen = true;
  let strand = '', thread = '';

  /* ---------- Value noise, 4 octaves, smooth (cosine) interpolation; mirrored at 0 ---------- */
  const SIZE = 4095;
  const table = new Float32Array(SIZE + 1);
  let rand = Math.random;
  const seeded = (a) => () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const reseed = () => { rand = seeded(SEED); for (let i = 0; i <= SIZE; i++) table[i] = rand(); };
  const ease = (t) => 0.5 * (1 - Math.cos(t * Math.PI));
  function noise(x, y) {
    x = Math.abs(x); y = Math.abs(y);
    let xi = Math.floor(x), yi = Math.floor(y);
    let xf = x - xi, yf = y - yi;
    let sum = 0, amp = 0.5;
    for (let o = 0; o < 4; o++) {
      const at = xi + (yi << 4);
      const rx = ease(xf), ry = ease(yf);
      let a = table[at & SIZE];
      a += rx * (table[(at + 1) & SIZE] - a);
      let b = table[(at + 16) & SIZE];
      b += rx * (table[(at + 17) & SIZE] - b);
      sum += (a + ry * (b - a)) * amp;
      amp *= 0.5;
      xi <<= 1; xf *= 2; yi <<= 1; yf *= 2;
      if (xf >= 1) { xi++; xf--; }
      if (yf >= 1) { yi++; yf--; }
    }
    return sum;
  }

  // Each cell points from the highest to the lowest noise value on a small circle around it,
  // scaled by how much the noise changes there: particles slide "downhill" through the field.
  const RING = 24;
  const ringCos = Float32Array.from({ length: RING }, (_, i) => Math.cos((i / RING) * Math.PI * 2) * 0.1);
  const ringSin = Float32Array.from({ length: RING }, (_, i) => Math.sin((i / RING) * Math.PI * 2) * 0.1);
  function cellVector(c, r, k) {
    const x = 0.003 * c, y = 0.003 * r;
    let hi = -1, lo = 2, hx = 0, hy = 0, lx = 0, ly = 0;
    for (let i = 0; i < RING; i++) {
      const sx = x + ringCos[i], sy = y + ringSin[i];
      const n = noise(sx, sy);
      if (n > hi) { hi = n; hx = sx; hy = sy; }
      if (n < lo) { lo = n; lx = sx; ly = sy; }
    }
    let dx = lx - hx, dy = ly - hy;
    const len = Math.hypot(dx, dy) || 1;
    fx[k] = (dx / len) * (hi - lo);
    fy[k] = (dy / len) * (hi - lo);
  }

  /* ---------- Set-up: size, field (built a slice per frame), particles ---------- */
  function setup() {
    cancelAnimationFrame(raf);
    raf = 0;
    ready = false;
    W = canvas.offsetWidth; // layout size: the drift's scale() must not leak into the canvas size
    H = canvas.offsetHeight;
    if (!W || !H) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    W2 = W + PAD * 2;
    H2 = H + PAD * 2;
    cols = Math.ceil(W2 / CELL) + 1;
    rows = Math.ceil(H2 / CELL) + 1;
    fx = new Float32Array(cols * rows);
    fy = new Float32Array(cols * rows);
    reseed();
    px = new Float32Array(COUNT); py = new Float32Array(COUNT);
    qx = new Float32Array(COUNT); qy = new Float32Array(COUNT);
    vx = new Float32Array(COUNT); vy = new Float32Array(COUNT);
    ax = new Float32Array(COUNT); ay = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      px[i] = qx[i] = rand() * W2;
      py[i] = qy[i] = rand() * H2;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    strand = `rgba(${COLORS[theme]}, ${ALPHA})`;
    thread = `rgba(${THREADS[theme]}, ${ALPHA})`;
    ctx.lineWidth = 1;
    // the field takes ~100k noise samples; spread it over frames so the intro never stutters
    const job = ++building;
    let k = 0;
    const total = cols * rows;
    const slice = () => {
      if (job !== building) return;
      const end = Math.min(total, k + 2400);
      for (; k < end; k++) cellVector(k % cols, (k / cols) | 0, k);
      if (k < total) requestAnimationFrame(slice);
      else { ready = true; start(); }
    };
    requestAnimationFrame(slice);
  }

  /* ---------- Each frame: move every particle, draw its step ---------- */
  function frame() {
    raf = 0;
    if (!ready || !onScreen) return;
    for (let i = 0; i < COUNT; i++) {
      const cx = Math.min(cols - 1, Math.max(0, (px[i] / CELL) | 0));
      const cy = Math.min(rows - 1, Math.max(0, (py[i] / CELL) | 0));
      const k = cy * cols + cx;
      qx[i] = px[i]; qy[i] = py[i];
      px[i] = (((px[i] + vx[i]) % W2) + W2) % W2;
      py[i] = (((py[i] + vy[i]) % H2) + H2) % H2;
      let nx = vx[i] + ax[i], ny = vy[i] + ay[i];
      const len = Math.hypot(nx, ny);
      if (len) { nx = (nx / len) * SPEED; ny = (ny / len) * SPEED; }
      vx[i] = nx; vy[i] = ny;
      ax[i] = fx[k] * PULL; ay[i] = fy[k] * PULL;
    }
    ctx.setTransform(dpr, 0, 0, dpr, -PAD * dpr, -PAD * dpr);
    const per = Math.ceil(COUNT / BATCHES);
    for (let b = 0; b < BATCHES; b++) {
      ctx.strokeStyle = b % 10 ? strand : thread;
      ctx.beginPath();
      for (let i = b * per, end = Math.min(COUNT, i + per); i < end; i++) {
        const dx = px[i] - qx[i], dy = py[i] - qy[i];
        if (dx * dx + dy * dy < 100) { ctx.moveTo(qx[i], qy[i]); ctx.lineTo(px[i], py[i]); } // skip the jump when a particle wraps
      }
      ctx.stroke();
    }
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (ready && onScreen && !raf) raf = requestAnimationFrame(frame); };

  /* ---------- Lifecycle ---------- */
  const boot = () => {
    if (wide.matches) { box.hidden = false; setup(); }
    else { box.hidden = true; building++; ready = false; cancelAnimationFrame(raf); raf = 0; }
  };
  boot();
  wide.addEventListener('change', boot);
  // a new size or theme starts a fresh field, like a fresh page load
  let lastW = innerWidth, lastH = innerHeight, timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 120) return; // mobile toolbars
      lastW = innerWidth; lastH = innerHeight;
      if (wide.matches) setup();
    }, 250);
  });
  new MutationObserver(() => wide.matches && setup()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) start();
  }).observe(box);
})();
