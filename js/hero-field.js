/* =========================================================
   Hero backdrop: flowing strands.
   4,500 particles drift through a smooth noise field and each step draws a
   1px line from where it was to where it is, at low opacity, never cleared, so
   wherever paths bunch together the strokes pile up into brighter strands.
   The whole picture is painted once on its own thread and arrives as an image,
   so it never costs the page a frame. Desktop layout only (861px+), off for
   reduced motion; without Web Workers the hero simply goes without it.
   ========================================================= */
(() => {
  const box = document.querySelector('.hero__field');
  const canvas = box && box.querySelector('canvas');
  if (!canvas || !canvas.getContext) return;
  // same breakpoint as the hero layout: below it the photo fills the lower half, so nothing runs behind it
  const wide = window.matchMedia('(min-width: 861px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !window.Worker || !window.OffscreenCanvas) return;

  // this runs on the other thread: everything it uses lives inside it
  const painter = () => {
    const COUNT = 4500;
    const CELL = 10; // field resolution, px
    const PAD = 100; // particles live in a margin around the canvas too
    const SPEED = 2.2;
    const PULL = 3;
    const ALPHA = 0.03; // the hero is black in both themes
    const BATCHES = 45; // small strokes, so strands that bunch up in the same step still add up
    const STEPS = 360;
    // One fixed seed: the same field every visit, chosen offline from 600 candidates as the closest to the reference
    // (strands sweeping down and to the right, one bright ribbon through the left of the hero).
    const SEED = 466;

    /* ---------- Value noise, 4 octaves, smooth (cosine) interpolation; mirrored at 0 ---------- */
    const SIZE = 4095;
    const table = new Float32Array(SIZE + 1);
    const seeded = (a) => () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const ease = (t) => 0.5 * (1 - Math.cos(t * Math.PI));
    const noise = (x, y) => {
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
    };

    // Each cell points from the highest to the lowest noise value on a small circle around it,
    // scaled by how much the noise changes there: particles slide "downhill" through the field.
    const RING = 24;
    const ringCos = Float32Array.from({ length: RING }, (_, i) => Math.cos((i / RING) * Math.PI * 2) * 0.1);
    const ringSin = Float32Array.from({ length: RING }, (_, i) => Math.sin((i / RING) * Math.PI * 2) * 0.1);

    self.onmessage = ({ data: { job, W, H, dpr, stops } }) => {
      const rand = seeded(SEED);
      for (let i = 0; i <= SIZE; i++) table[i] = rand();
      const W2 = W + PAD * 2, H2 = H + PAD * 2;
      const cols = Math.ceil(W2 / CELL) + 1, rows = Math.ceil(H2 / CELL) + 1;
      const fx = new Float32Array(cols * rows), fy = new Float32Array(cols * rows);
      for (let k = 0; k < cols * rows; k++) {
        const x = 0.003 * (k % cols), y = 0.003 * ((k / cols) | 0);
        let hi = -1, lo = 2, hx = 0, hy = 0, lx = 0, ly = 0;
        for (let i = 0; i < RING; i++) {
          const sx = x + ringCos[i], sy = y + ringSin[i];
          const n = noise(sx, sy);
          if (n > hi) { hi = n; hx = sx; hy = sy; }
          if (n < lo) { lo = n; lx = sx; ly = sy; }
        }
        const dx = lx - hx, dy = ly - hy, len = Math.hypot(dx, dy) || 1;
        fx[k] = (dx / len) * (hi - lo);
        fy[k] = (dy / len) * (hi - lo);
      }
      const px = new Float32Array(COUNT), py = new Float32Array(COUNT), qx = new Float32Array(COUNT), qy = new Float32Array(COUNT);
      const vx = new Float32Array(COUNT), vy = new Float32Array(COUNT), ax = new Float32Array(COUNT), ay = new Float32Array(COUNT);
      for (let i = 0; i < COUNT; i++) { px[i] = qx[i] = rand() * W2; py[i] = qy[i] = rand() * H2; }

      const paper = new OffscreenCanvas(Math.round(W * dpr), Math.round(H * dpr));
      const ink = paper.getContext('2d', { willReadFrequently: true }); // on the CPU: gradient strokes on the graphics card stall every tab, about 1.5ms each
      ink.setTransform(dpr, 0, 0, dpr, -PAD * dpr, -PAD * dpr);
      ink.lineWidth = 1;
      // the palette runs across the field; one stroke batch in ten runs a touch brighter
      const across = (alpha) => {
        const g = ink.createLinearGradient(0, 0, W2, H2 * 0.4);
        stops.forEach((hex, i) => {
          const h = hex.replace('#', '');
          g.addColorStop(i / 2, `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${alpha})`);
        });
        return g;
      };
      const strand = across(ALPHA), thread = across(ALPHA * 1.5);
      const per = Math.ceil(COUNT / BATCHES);
      for (let step = 0; step < STEPS; step++) {
        for (let i = 0; i < COUNT; i++) {
          const k = Math.min(rows - 1, Math.max(0, (py[i] / CELL) | 0)) * cols + Math.min(cols - 1, Math.max(0, (px[i] / CELL) | 0));
          qx[i] = px[i]; qy[i] = py[i];
          px[i] = (((px[i] + vx[i]) % W2) + W2) % W2;
          py[i] = (((py[i] + vy[i]) % H2) + H2) % H2;
          let nx = vx[i] + ax[i], ny = vy[i] + ay[i];
          const len = Math.hypot(nx, ny);
          if (len) { nx = (nx / len) * SPEED; ny = (ny / len) * SPEED; }
          vx[i] = nx; vy[i] = ny;
          ax[i] = fx[k] * PULL; ay[i] = fy[k] * PULL;
        }
        for (let b = 0; b < BATCHES; b++) {
          ink.strokeStyle = b % 10 ? strand : thread;
          ink.beginPath();
          for (let i = b * per, end = Math.min(COUNT, i + per); i < end; i++) {
            const dx = px[i] - qx[i], dy = py[i] - qy[i];
            if (dx * dx + dy * dy < 100) { ink.moveTo(qx[i], qy[i]); ink.lineTo(px[i], py[i]); } // skip the jump when a particle wraps
          }
          ink.stroke();
        }
      }
      // the strands fade out towards the text: baked in, because a live mask over a drifting canvas is redone every frame
      const w = paper.width, h = paper.height, reach = w * 0.985 + h * 0.174, x = w / 2 - (0.985 * reach) / 2, y = h / 2 - (0.174 * reach) / 2;
      const away = ink.createLinearGradient(x, y, x + 0.985 * reach, y + 0.174 * reach);
      away.addColorStop(0.34, 'rgba(0, 0, 0, .14)');
      away.addColorStop(0.62, '#000');
      ink.setTransform(1, 0, 0, 1, 0, 0);
      ink.globalCompositeOperation = 'destination-in';
      ink.fillStyle = away;
      ink.fillRect(0, 0, w, h);
      const image = paper.transferToImageBitmap();
      self.postMessage({ job, image }, [image]);
    };
  };

  const worker = new Worker(URL.createObjectURL(new Blob([`(${painter})()`], { type: 'text/javascript' })));
  const ctx = canvas.getContext('2d');
  let job = 0;
  worker.onmessage = ({ data }) => {
    if (data.job === job) {
      canvas.width = data.image.width;
      canvas.height = data.image.height;
      ctx.drawImage(data.image, 0, 0);
      box.classList.add('is-on');
    }
    data.image.close();
  };
  const paint = () => {
    const W = canvas.offsetWidth, H = canvas.offsetHeight; // layout size: the drift's scale() must not leak into it
    if (!W || !H) return;
    const css = getComputedStyle(document.documentElement);
    box.classList.remove('is-on');
    worker.postMessage({ job: ++job, W, H, dpr: Math.min(window.devicePixelRatio || 1, 2), stops: ['--b1', '--b2', '--b3'].map((n) => css.getPropertyValue(n).trim()) });
  };

  /* ---------- Lifecycle ---------- */
  const boot = () => {
    box.hidden = !wide.matches;
    if (wide.matches) paint();
  };
  boot();
  wide.addEventListener('change', boot);
  // a new size or theme paints a fresh field
  let lastW = innerWidth, lastH = innerHeight, timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 120) return; // mobile toolbars
      lastW = innerWidth; lastH = innerHeight;
      if (wide.matches) paint();
    }, 250);
  });
  new MutationObserver(() => wide.matches && paint()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
