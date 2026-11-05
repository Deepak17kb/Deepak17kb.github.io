/* =========================================================
   Darklytics chart: what sold out first.
   One dot per real listing, from the day of Blinkit collected by hand in Bhubaneswar
   (10 Jul 2026, rows tagged `observed` in quickcommerce-mi, site_dist/listings.parquet).
   Left to right is price; the bright dots were out of stock. Aisles are sorted by how much sold out.
   The data is a price histogram per aisle, so the file stays small: a dot's exact spot inside
   its price bin is seeded jitter, its bin and its stock status are real.
   ========================================================= */
(() => {
  const box = document.querySelector('.visual--darklytics');
  const canvas = box && box.querySelector('canvas');
  if (!canvas) return;
  const AISLES = [{"name":"Dry fruits & nuts","n":342,"out":54,"median":250,"a":[0,0,0,0,0,0,0,0,0,0,0,3,6,0,1,14,0,1,15,6,14,0,12,6,16,10,15,8,12,17,21,6,21,35,8,10,12,1,3,1,1,6,2,4,0,1,0,0,0,0,0,0,0,0,0,0],"b":[0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,1,2,1,2,1,1,2,3,2,5,3,3,0,2,2,1,1,7,4,3,0,1,0,2,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0]},{"name":"Snacks & munchies","n":1303,"out":186,"median":108,"a":[0,0,0,0,0,2,9,5,7,7,6,12,48,37,113,67,96,55,56,25,46,47,116,71,58,38,39,12,21,11,35,4,5,10,21,7,3,9,6,7,0,0,2,1,3,0,0,0,0,0,0,0,0,0,0,0],"b":[0,0,0,0,0,0,0,0,0,0,2,1,4,0,2,4,10,8,11,3,6,22,39,3,25,1,8,5,2,5,6,1,5,1,4,0,2,1,0,0,1,0,3,0,1,0,0,0,0,0,0,0,0,0,0,0]},{"name":"Staples & grains","n":538,"out":76,"median":151,"a":[0,0,0,1,0,0,1,0,0,5,4,1,7,9,9,14,10,9,21,21,25,17,35,21,19,19,18,7,11,20,4,12,13,20,14,18,15,7,9,12,5,8,11,4,3,2,0,0,0,1,0,0,0,0,0,0],"b":[0,0,0,0,0,0,0,0,0,1,1,0,3,2,2,4,11,4,5,3,6,2,2,2,4,0,0,1,2,3,0,5,1,2,1,1,2,2,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0]},{"name":"Fruits & vegetables","n":2126,"out":202,"median":175,"a":[0,0,0,5,5,6,6,11,18,24,15,36,45,45,98,43,37,35,59,40,78,61,65,77,132,54,76,23,82,27,77,54,63,88,50,68,64,21,40,38,34,31,10,33,12,9,4,9,1,3,4,4,1,3,0,0],"b":[0,0,0,0,0,0,0,0,1,0,0,0,4,3,5,4,2,6,9,5,4,9,6,15,4,8,11,2,11,5,4,9,14,9,4,6,10,3,5,9,2,6,0,1,3,1,0,0,0,1,0,1,0,0,0,0]},{"name":"Bakery & biscuits","n":1245,"out":96,"median":83,"a":[2,0,0,1,0,8,21,14,35,55,7,50,57,28,78,41,66,73,56,55,78,37,50,42,52,27,65,17,37,23,28,8,21,2,7,4,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0],"b":[0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,3,5,9,5,10,4,2,4,9,12,5,10,0,5,1,8,2,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"name":"Sweets & chocolates","n":1880,"out":84,"median":150,"a":[0,0,0,0,1,2,1,6,7,17,11,34,40,45,93,26,78,41,51,51,116,73,74,95,103,63,143,101,78,107,73,29,56,39,20,11,30,11,8,6,11,9,4,10,11,7,1,1,1,1,0,0,0,0,0,0],"b":[0,0,0,0,0,0,0,0,0,0,0,0,0,3,7,0,1,0,1,4,6,5,1,3,5,2,4,5,6,12,2,0,0,1,1,0,1,0,3,0,0,0,2,8,0,1,0,0,0,0,0,0,0,0,0,0]},{"name":"Dairy, bread & eggs","n":2062,"out":76,"median":119,"a":[5,0,0,5,18,7,36,22,68,69,14,69,79,29,92,31,99,48,64,73,92,52,120,70,90,41,104,42,58,61,67,46,41,33,13,35,27,16,27,13,20,19,16,15,10,11,5,2,4,2,1,2,1,0,2,0],"b":[0,0,0,0,0,0,0,0,1,3,1,1,0,0,3,0,3,0,0,2,0,1,1,1,17,2,1,0,0,0,0,0,0,1,5,0,7,4,3,2,5,4,1,5,0,0,1,0,0,0,0,0,0,0,0,1]},{"name":"Beverages","n":1473,"out":26,"median":169,"a":[1,0,0,0,0,1,5,0,2,1,2,12,39,60,14,26,41,39,69,55,67,28,61,89,107,38,52,47,65,66,82,51,78,34,26,27,40,18,25,10,17,13,4,7,3,5,8,4,3,1,3,1,0,0,0,0],"b":[0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,4,1,1,0,0,0,5,2,3,2,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0]}];
  const BINS = 56;
  const LOG_LO = 1, LOG_HI = Math.log10(5000); // ₹10 to ₹5,000
  const TICKS = [10, 100, 1000];
  const FONT = '"Inter Tight", system-ui, sans-serif';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const read = box.querySelector('.dk__read');
  const resting = read.textContent;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); // on the CPU: 11,000 tiny squares a frame are quick there

  let W = 0, H = 0, dpr = 1, rowH = 0, top = 0, left = 0, right = 0, scale = 1;
  let dots = [], hover = -1, raf = 0, t0 = 0, played = false, progress = 1;
  let DOT = '', HOT = '';

  // seeded, so every visit draws the same cloud
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const priceX = (price) => left + ((Math.log10(price) - LOG_LO) / (LOG_HI - LOG_LO)) * (right - left);

  function layout() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    if (!W || !H) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    left = 2; right = W - 2; top = 2;
    scale = Math.max(0.68, Math.min(1, W / 640));
    rowH = (H - top - 20) / AISLES.length;
    const rand = rng(466);
    const bell = () => rand() + rand() - 1; // thickest in the middle, in -1..1
    dots = [];
    AISLES.forEach((a, row) => {
      const peak = Math.max(...a.a.map((v, i) => v + a.b[i]));
      const cy = top + rowH * row + rowH * 0.68;
      const reach = rowH * 0.3;
      for (let i = 0; i < BINS; i++) {
        const total = a.a[i] + a.b[i];
        const spread = Math.max(0.22, Math.sqrt(total / peak)); // busy prices spread wider, so each aisle reads as a soft cloud
        for (let k = 0; k < total; k++) {
          const x = left + ((i + rand()) / BINS) * (right - left);
          dots.push({ row, x, y: cy + bell() * reach * spread, out: k < a.b[i], delay: (x / W) * 0.42 + rand() * 0.16 });
        }
      }
    });
    dots.sort((p, q) => p.out - q.out); // sold out on top
    return true;
  }

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // the palette, read fresh: cheap to expensive runs from the first stop to the second
    const css = getComputedStyle(document.documentElement);
    HOT = css.getPropertyValue('--red').trim();
    DOT = ctx.createLinearGradient(left, 0, right, 0);
    DOT.addColorStop(0, css.getPropertyValue('--b1').trim());
    DOT.addColorStop(1, css.getPropertyValue('--b2').trim());

    // price scale
    ctx.font = `500 11px ${FONT}`;
    ctx.textBaseline = 'alphabetic';
    TICKS.forEach((tick, i) => {
      const x = priceX(tick);
      ctx.fillStyle = 'rgba(255, 255, 255, .1)';
      ctx.fillRect(Math.round(x), top, 1, H - top - 18);
      ctx.fillStyle = 'rgba(255, 255, 255, .86)';
      ctx.textAlign = i ? 'center' : 'left';
      ctx.fillText('₹' + tick.toLocaleString('en-IN'), x, H - 3);
    });

    // aisle names and how much of each sold out
    const textOn = Math.min(1, progress * 2);
    AISLES.forEach((a, row) => {
      const y = top + rowH * row + 13;
      const dim = hover >= 0 && hover !== row;
      ctx.globalAlpha = (dim ? 0.4 : 1) * textOn;
      ctx.font = `500 13px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F2F5FF';
      ctx.fillText(a.name, left, y);
      ctx.font = `600 14px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = HOT;
      ctx.fillText(((100 * a.out) / a.n).toFixed(1) + '%', right, y);
    });
    ctx.globalAlpha = 1;

    // dots, one path per look: thousands of arcs would be too slow, tiny squares look the same
    const paint = (test, size, colour, alpha) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colour;
      ctx.beginPath();
      for (const d of dots) {
        if (!test(d)) continue;
        const t = easeOut(Math.min(1, Math.max(0, (progress - d.delay) / 0.42)));
        if (!t) continue;
        const cy = top + rowH * d.row + rowH * 0.68;
        const s = size * scale;
        ctx.rect(left + (d.x - left) * t - s / 2, cy + (d.y - cy) * t - s / 2, s, s);
      }
      ctx.fill();
    };
    const shown = (d) => hover < 0 || hover === d.row;
    const lit = progress > 0.8; // sold-out dots catch fire at the very end
    const keep = (d) => !d.out || !lit;
    if (hover >= 0) paint((d) => !shown(d), 1.6, DOT, 0.16);
    paint((d) => shown(d) && keep(d), 1.9, DOT, 0.62);
    if (lit) {
      const pop = easeOut((progress - 0.8) / 0.2);
      paint((d) => d.out && shown(d), 1.9 + 1.5 * pop, HOT, pop);
      if (hover >= 0) paint((d) => d.out && !shown(d), 2, HOT, 0.35);
    }
    ctx.globalAlpha = 1;
  }

  function play() {
    if (reduced) { progress = 1; draw(); return; }
    cancelAnimationFrame(raf);
    t0 = performance.now();
    const frame = (now) => {
      progress = Math.min(1, (now - t0) / 1900);
      draw();
      if (progress < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  /* ---------- Point at an aisle to read it ---------- */
  const setHover = (row) => {
    if (row === hover) return;
    hover = row;
    if (row < 0) read.textContent = resting;
    else {
      const a = AISLES[row];
      read.textContent = `${a.name}: ${a.out.toLocaleString('en-IN')} of ${a.n.toLocaleString('en-IN')} listings sold out. Median price ₹${a.median}.`;
    }
    if (progress === 1) draw();
  };
  const rowAt = (e) => {
    const r = canvas.getBoundingClientRect();
    const row = Math.floor((e.clientY - r.top - top) / rowH);
    return row >= 0 && row < AISLES.length ? row : -1;
  };
  canvas.addEventListener('pointermove', (e) => setHover(rowAt(e)));
  canvas.addEventListener('pointerdown', (e) => setHover(rowAt(e)));
  canvas.addEventListener('pointerleave', () => setHover(-1));

  /* ---------- Lifecycle: pour the dots in each time the chart comes into view ---------- */
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const redraw = () => { if (layout()) { progress = played ? 1 : progress; draw(); } };
  progress = reduced ? 1 : 0;
  fonts.then(() => {
    redraw();
    new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    new ResizeObserver(redraw).observe(canvas);
    new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) { if (played) { played = false; cancelAnimationFrame(raf); progress = reduced ? 1 : 0; draw(); } return; }
      if (!played) { played = true; play(); }
    }, { threshold: 0.35 }).observe(canvas);
  });
})();
