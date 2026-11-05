/* =========================================================
   The photo, suited up, in three layers, the way a nano suit forms.
   First liquid metal floods out of the tie and over the jacket. Then hexagonal plates form on top
   of it, each crawling out from under the plate before it, and lock. Then the plates resolve into
   the photo. The head stays in the dark until the suit is done, then fades up.
   Scrolling runs all of it backwards: the suit folds away into the tie.
   At rest the real <img> is what you see. Only the edges of the jacket keep shedding plates,
   a ripple crosses the suit when the line beside the name changes, and plates light up under the cursor.

   No plate is ever placed on the head or neck: the face only ever fades.
   Without WebGL, or with reduced motion, the photo is simply the photo.
   ========================================================= */

// liquid metal: what a polished, moving surface reflects, in the page's own colours. n is the surface's tilt.
window.DKB_CHROME = `
  vec3 tint(float g) { g = abs(fract(g) * 2. - 1.); return g < .5 ? mix(u_c1, u_c2, g * 2.) : mix(u_c2, u_c3, g * 2. - 1.); }
  vec3 chrome(vec2 n, float pos) {
    vec3 N = normalize(vec3(n, 1.));
    // dark polished steel in a dark room, with a few long lights in it
    float env = N.y * 1.25 + N.x * .55 + pos;
    float s = .5 + .5 * sin(env * 6.283);
    float lights = s * s * s * s * s * s;
    vec3 steel = vec3(.04, .045, .08) + vec3(.1, .11, .16) * smoothstep(.2, .9, s);
    float edge = pow(1. - N.z, 2.);
    float spec = pow(max(dot(N, normalize(vec3(-.3, -.5, 1.))), 0.), 120.);
    return steel + tint(env * .5) * lights * 1.2 + tint(pos + .3) * edge * .85 + vec3(spec * 1.8);
  }`;

(() => {
  const root = document.documentElement;
  const box = document.querySelector('.hero__face');
  const img = box && box.querySelector('.hero__cutout');
  if (!img || !window.gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero__suit';
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true });
  if (!gl) return;

  const ASPECT = 1087 / 1199;
  const TIE = [0.52, 0.72];
  const CELL = 1 / 52; // a plate's radius, as a share of the photo's width
  const MARGIN = 84; // room around the photo for loose plates, px
  // how far a spot is from the head and the open neck of the shirt: under 0 is off limits
  const clearOfHead = (u, v) => Math.min((Math.hypot((u - 0.515) / 0.25, (v - 0.25) / 0.29) - 1) * 0.25, v - 0.585 + 1.15 * Math.abs(u - 0.515));

  // where the photo sits inside its box (object-fit: contain, standing on the bottom edge)
  const rect = () => {
    const b = box.getBoundingClientRect();
    const h = Math.min(b.height, b.width / ASPECT), w = h * ASPECT;
    return { x: b.left + (b.width - w) / 2, y: b.bottom - h, w, h };
  };

  const VERT = `
  precision highp float;
  attribute vec2 a_home, a_from;
  attribute vec4 a_data; // when it arrives, two seeds, whether it may come loose
  uniform vec2 u_res, u_ptr;
  uniform vec4 u_img;
  uniform vec3 u_c1, u_c2, u_c3, u_red, u_gold;
  uniform float u_wave, u_fill, u_loose, u_ripple, u_time, u_dpr, u_cell;
  varying vec2 v_uv; varying vec3 v_c; varying float v_flip, v_fill, v_hot, v_rim;
  const float PI = 3.14159265;
  vec2 px(vec2 uv) { return u_img.xy + uv * u_img.zw; }
  void main() {
    float order = a_data.x, s1 = a_data.y, s2 = a_data.z, loose = a_data.w;
    float s = clamp((u_wave * 1.14 - order) / .14, 0., 1.); // 0 waiting, 1 locked
    float e = 1. - pow(1. - s, 3.);
    vec2 p = mix(px(a_from), px(a_home), e);
    float flip = sin(s * PI * .5);
    float size = .35 + .65 * e;
    float hot = s > 0. ? sin(min(s * 1.2, 1.) * PI) : 0.; // bright metal as it arrives, then it turns into the photo
    float fill = step(.001, s) * u_fill;
    float rim = 0.;
    float g = clamp(a_home.x * .62 + order * .38 + .12 * sin(u_time * .4 + order * 6.), 0., 1.);
    float w = (order - u_ripple) * 11.;
    if (u_ripple >= 0.) rim = exp(-w * w) * .55;
    vec2 d = p - u_ptr;
    rim = max(rim, (1. - smoothstep(30., 130., length(d))) * .75 * step(.999, u_wave));
    if (loose > .5 && u_loose > .001) { // this plate lifts off the jacket, turns to light and goes
      float k = fract(u_time * (.04 + .05 * s2) + s1 * 9.);
      float out_ = a_home.x < .5 ? -1. : 1.;
      p += vec2(out_ * (.5 + .8 * s2), -.55 - .5 * s1) * u_img.w * .15 * k * k;
      p.x += sin(u_time * .8 + s1 * 40.) * 4. * k;
      float show = smoothstep(0., .06, k) * (1. - smoothstep(.5, .96, k)) * u_loose;
      flip = max(.12, abs(cos(k * PI * (1. + 2. * s2))));
      fill = max(fill, show * (1. - smoothstep(.1, .42, k)));
      hot = max(hot, show * smoothstep(.06, .4, k));
      rim = max(rim, show * .8);
      size = 1. - k * .4;
    }
    if (fill + hot + rim < .004) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; return; }
    v_uv = a_home; v_flip = flip; v_fill = fill; v_hot = hot; v_rim = rim;
    v_c = g < .5 ? mix(u_c1, u_c2, g * 2.) : mix(u_c2, u_c3, g * 2. - 1.);
    if (s1 < .2) v_c = u_red; // one plate in five is red and some are gold, whole, never a blend
    else if (s1 < .33) v_c = u_gold;
    gl_Position = vec4(p.x / u_res.x * 2. - 1., 1. - p.y / u_res.y * 2., 0., 1.);
    gl_PointSize = 2. * u_cell * u_img.z * size * u_dpr;
  }`;
  const FRAG = `
  precision mediump float;
  uniform sampler2D u_tex;
  uniform vec2 u_span;
  varying vec2 v_uv; varying vec3 v_c; varying float v_flip, v_fill, v_hot, v_rim;
  void main() {
    vec2 q = (gl_PointCoord - .5) * 2.;
    q.x /= max(v_flip, .08); // the plate turns to face you
    float d = max(abs(q.x), abs(q.x) * .5 + abs(q.y) * .866);
    if (d > .89) discard;
    vec4 ph = texture2D(u_tex, v_uv + (gl_PointCoord - .5) * u_span);
    float rim = smoothstep(.56, .82, d);
    vec3 metal = v_c * (.42 + .78 * rim);
    vec4 c = ph * v_fill;
    c = mix(c, vec4(metal * ph.a, ph.a), v_hot);
    float lit = (rim * .9 + .1) * v_rim * ph.a;
    c += vec4(v_c * lit, lit * .55);
    gl_FragColor = c * (1. - smoothstep(.865, .89, d));
  }`;
  // the first layer: a sheet over the photo. u_field holds, for each spot of the jacket, when the liquid gets
  // there (r), the ripples on its surface (g), and whether it may go there at all (b: never the head)
  const LIQUID_VERT = `
  precision highp float;
  attribute vec2 a_q;
  uniform vec2 u_res;
  uniform vec4 u_img;
  varying vec2 v_uv;
  void main() {
    v_uv = a_q;
    vec2 p = u_img.xy + a_q * u_img.zw;
    gl_Position = vec4(p.x / u_res.x * 2. - 1., 1. - p.y / u_res.y * 2., 0., 1.);
  }`;
  const LIQUID_FRAG = `
  precision highp float;
  uniform sampler2D u_tex, u_field;
  uniform vec3 u_c1, u_c2, u_c3;
  uniform float u_front, u_fade, u_time;
  varying vec2 v_uv;
  ${window.DKB_CHROME}
  float height(vec2 p) {
    vec4 f = texture2D(u_field, p);
    float wet = smoothstep(0., .075, u_front - f.r);
    float swell = texture2D(u_field, p * .8 + vec2(u_time * .021, -u_time * .034)).g;
    float swell2 = texture2D(u_field, p * 1.3 + vec2(-u_time * .027, u_time * .018)).g;
    return wet * (.5 + .6 * swell + .35 * swell2);
  }
  void main() {
    vec4 f = texture2D(u_field, v_uv);
    float wet = smoothstep(.0, .012, u_front - f.r) * f.b * texture2D(u_tex, v_uv).a * u_fade;
    if (wet < .004) discard;
    const vec2 e = vec2(.008, 0.);
    vec2 n = vec2(height(v_uv + e.xy) - height(v_uv - e.xy), height(v_uv + e.yx) - height(v_uv - e.yx)) * 4.2;
    vec3 c = chrome(n, v_uv.x * 1.5 + v_uv.y * 1.1 + u_time * .05);
    gl_FragColor = vec4(c * wet, wet);
  }`;
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const link = (v, f, bind) => {
    const a = compile(gl.VERTEX_SHADER, v), b = compile(gl.FRAGMENT_SHADER, f);
    if (!a || !b) return null;
    const p = gl.createProgram();
    gl.attachShader(p, a); gl.attachShader(p, b);
    if (bind) gl.bindAttribLocation(p, 7, bind);
    gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  };
  const prog = link(VERT, FRAG);
  const wet = link(LIQUID_VERT, LIQUID_FRAG, 'a_q');
  if (!prog || !wet) return;
  const uniforms = (p, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
  const U = uniforms(prog, ['u_res', 'u_ptr', 'u_img', 'u_c1', 'u_c2', 'u_c3', 'u_red', 'u_gold', 'u_wave', 'u_fill', 'u_loose', 'u_ripple', 'u_time', 'u_dpr', 'u_cell', 'u_tex', 'u_span']);
  const L = uniforms(wet, ['u_res', 'u_img', 'u_c1', 'u_c2', 'u_c3', 'u_front', 'u_fade', 'u_time', 'u_tex', 'u_field']);

  box.appendChild(canvas);
  const rim = document.createElement('canvas');
  rim.className = 'hero__rim';
  box.prepend(rim);
  root.classList.add('has-rim');
  const giveUp = () => { canvas.remove(); rim.remove(); root.classList.remove('has-rim'); img.style.removeProperty('--lit'); };

  /* ---------- The plates: a hex grid over the jacket, grown outward from the tie ---------- */
  let count = 0;
  const build = (alphaAt) => {
    const rnd = ((seed) => () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    })(1199);
    const du = Math.sqrt(3) * CELL, dv = 1.5 * CELL * ASPECT;
    const cells = new Map();
    const key = (c, r) => r * 1000 + c;
    for (let r = 0; r * dv < 1.03; r++) {
      for (let c = 0; c * du < 1.03; c++) {
        const u = (c + (r & 1) * 0.5) * du, v = r * dv;
        if (v > 1 + dv || clearOfHead(u, v) < 0 || alphaAt(u, Math.min(v, 0.999)) < 0.5) continue;
        cells.set(key(c, r), { c, r, u, v, best: Infinity, from: null, done: false });
      }
    }
    const around = (p) => {
      const odd = p.r & 1;
      return [[1, 0], [-1, 0], [odd, -1], [odd - 1, -1], [odd, 1], [odd - 1, 1]].map(([x, y]) => cells.get(key(p.c + x, p.r + y))).filter(Boolean);
    };
    const list = [...cells.values()];
    const start = list.reduce((m, p) => (Math.hypot(p.u - TIE[0], (p.v - TIE[1]) / ASPECT) < Math.hypot(m.u - TIE[0], (m.v - TIE[1]) / ASPECT) ? p : m));
    start.best = 0; start.from = start;
    // uneven steps, so the front creeps and branches instead of opening as a clean circle
    for (;;) {
      let p = null;
      list.forEach((q) => { if (!q.done && q.best < Infinity && (!p || q.best < p.best)) p = q; });
      if (!p) break;
      p.done = true;
      around(p).forEach((q) => {
        const w = p.best + 0.55 + rnd() * 1.5;
        if (w < q.best) { q.best = w; q.from = p; }
      });
    }
    const far = Math.max(...list.map((p) => (p.best < Infinity ? p.best : 0)));
    count = list.length;
    const data = new Float32Array(count * 8);
    list.forEach((p, i) => {
      const from = p.from || start;
      // a plate is loose if the jacket ends close by; never up by the head
      const edge = p.v > 0.56 && Math.abs(p.u - 0.515) > 0.2 && [0, 1, 2, 3, 4, 5].some((k) => {
        const a = (k / 6) * Math.PI * 2, u = p.u + Math.cos(a) * CELL * 5.5, v = p.v + Math.sin(a) * CELL * 5.5 * ASPECT;
        return v < 1 && (u < 0 || u > 1 || alphaAt(u, v) < 0.5);
      });
      const s1 = rnd(), s2 = rnd();
      data.set([p.u, p.v, from.u, from.v, Math.min(1, p.best / far || 0), s1, s2, edge && s1 < 0.62 ? 1 : 0], i * 8);
    });
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    [['a_home', 2, 0], ['a_from', 2, 8], ['a_data', 4, 16]].forEach(([name, n, at]) => {
      const a = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, n, gl.FLOAT, false, 32, at);
    });
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(7);
    gl.vertexAttribPointer(7, 2, gl.FLOAT, false, 0, 0);
  };

  // the liquid's map, baked once, so the shader only has to look things up
  const bakeField = () => {
    const SIZE = 256;
    const lattice = new Float32Array(4096);
    let a = 466;
    for (let i = 0; i < 4096; i++) {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      lattice[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    // tiles, so the ripples can slide forever
    const value = (x, y, period) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const at = (i, j) => lattice[((((i % period) + period) % period) + ((((j % period) + period) % period)) * 61) & 4095];
      const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
      return (at(xi, yi) * (1 - sx) + at(xi + 1, yi) * sx) * (1 - sy) + (at(xi, yi + 1) * (1 - sx) + at(xi + 1, yi + 1) * sx) * sy;
    };
    const fbm = (u, v, f) => (value(u * f, v * f, f) * 4 + value(u * f * 2, v * f * 2, f * 2) * 2 + value(u * f * 4, v * f * 4, f * 4)) / 7;
    const px = new Uint8Array(SIZE * SIZE * 4);
    const far = Math.hypot(0.54, 0.75 / ASPECT);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const u = x / (SIZE - 1), v = y / (SIZE - 1);
        const arrive = Math.hypot(u - TIE[0], (v - TIE[1]) / ASPECT) / far + (fbm(u, v, 4) - 0.5) * 0.42;
        const swell = (value(u * 3, v * 3, 3) * 2 + value(u * 6, v * 6, 6)) / 3;
        px.set([Math.max(0, Math.min(255, arrive * 255)), swell * 255, Math.max(0, Math.min(1, clearOfHead(u, v) / 0.03)) * 255, 255], (y * SIZE + x) * 4);
      }
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SIZE, SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.activeTexture(gl.TEXTURE0);
  };

  /* ---------- State ---------- */
  let ready = false, wanted = false, onScreen = true;
  let W = 1, H = 1, dpr = 1;
  let built = 0, retract = 0, ripple = -1, time = 0, last = 0, stamp = performance.now(), ptrX = -9999, ptrY = -9999, lastLit = -1;

  const size = () => {
    const b = box.getBoundingClientRect();
    W = b.width + MARGIN * 2; H = b.height + MARGIN;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (ready) placeRim();
  };
  const colours = () => {
    const css = getComputedStyle(root);
    [[wet, L], [prog, U]].forEach(([p, u]) => {
      gl.useProgram(p);
      const set = (at, name) => {
        const h = css.getPropertyValue(name).trim().replace('#', '');
        if (at) gl.uniform3f(at, parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
      };
      ['1', '2', '3'].forEach((n) => set(u['u_c' + n], '--b' + n));
      set(u.u_red, '--red');
      set(u.u_gold, '--au');
    });
  };
  // the two coloured lights around the photo, baked once: a live filter would redo two big blurs every frame
  const RIM_W = 800, RIM_H = 882, RIM_PAD = 90;
  const placeRim = () => {
    const r = rect(), b = box.getBoundingClientRect(), k = r.w / RIM_W;
    rim.style.cssText = `left:${r.x - b.left - RIM_PAD * k}px;top:${r.y - b.top - RIM_PAD * k}px;width:${rim.width * k}px;height:${rim.height * k}px`;
  };
  const bakeRim = () => {
    rim.width = RIM_W + RIM_PAD * 2;
    rim.height = RIM_H + RIM_PAD;
    const c = rim.getContext('2d'), css = getComputedStyle(root), far = 4000, k = RIM_W / rect().w;
    const glow = (name, alpha, dx) => {
      const h = css.getPropertyValue(name).trim().replace('#', '');
      c.shadowColor = `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${alpha})`;
      c.shadowBlur = 22 * k;
      c.shadowOffsetX = far + dx * k;
      c.shadowOffsetY = -2 * k;
      c.drawImage(img, RIM_PAD - far, RIM_PAD, RIM_W, RIM_H); // the photo lands off the canvas, only its light lands on it
    };
    glow('--b1', 0.46, -7);
    glow('--b3', 0.42, 7);
    c.shadowColor = 'transparent';
    c.globalCompositeOperation = 'destination-out'; // the light belongs around the figure, never through it
    c.drawImage(img, RIM_PAD, RIM_PAD, RIM_W, RIM_H);
    // and a black figure behind the photo, so nothing shows through the face while it is dark
    c.globalCompositeOperation = 'source-over';
    c.shadowColor = css.getPropertyValue('--night').trim();
    c.shadowBlur = 0;
    c.shadowOffsetX = far;
    c.shadowOffsetY = 0;
    c.drawImage(img, RIM_PAD - far, RIM_PAD, RIM_W, RIM_H);
    placeRim();
  };
  const ease = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    time += dt;
    // on the wall clock, not the frame count: a slow device must not keep the face in the dark for longer
    if (wanted && built < 1) built = Math.min(1, built + Math.min(0.25, (now - stamp) / 1000) / 3.3);
    stamp = now;
    if (ripple >= 0 && (ripple += dt / 1.7) > 1.2) ripple = -1;
    if (!ready || !onScreen) return;
    const P = Math.min(built, 1 - retract);
    const lit = 0.13 + 0.87 * ease(0.68, 0.9, P);
    if (Math.abs(lit - lastLit) > 0.002) {
      lastLit = lit;
      if (lit > 0.999) img.style.removeProperty('--lit'); else img.style.setProperty('--lit', lit.toFixed(3));
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (P <= 0) return;
    const r = rect(), b = box.getBoundingClientRect();
    const ix = r.x - b.left + MARGIN, iy = r.y - b.top + MARGIN;
    // layer one: the liquid leads, and is gone once the plates have covered it
    const fade = 1 - ease(0.72, 0.84, P);
    if (fade > 0.002) {
      gl.useProgram(wet);
      gl.uniform2f(L.u_res, W, H);
      gl.uniform4f(L.u_img, ix, iy, r.w, r.h);
      gl.uniform1f(L.u_front, ease(0, 0.5, P) * 1.3 - 0.06);
      gl.uniform1f(L.u_fade, fade);
      gl.uniform1f(L.u_time, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.useProgram(prog);
    }
    // layer two: the plates, on top of it
    gl.uniform2f(U.u_res, W, H);
    gl.uniform4f(U.u_img, ix, iy, r.w, r.h);
    gl.uniform2f(U.u_ptr, ptrX - b.left + MARGIN, ptrY - b.top + MARGIN);
    gl.uniform1f(U.u_wave, Math.max(0, Math.min(1, (P - 0.16) / 0.58)));
    gl.uniform1f(U.u_fill, 1 - ease(0.86, 1, P));
    gl.uniform1f(U.u_loose, ease(0.93, 1, P));
    gl.uniform1f(U.u_ripple, ripple);
    gl.uniform1f(U.u_time, time);
    gl.uniform1f(U.u_dpr, dpr);
    gl.uniform1f(U.u_cell, CELL);
    gl.uniform2f(U.u_span, (2 * CELL * r.w) / r.w, (2 * CELL * r.w) / r.h);
    gl.drawArrays(gl.POINTS, 0, count);
  };

  /* ---------- What the page can ask of it ---------- */
  window.DKB_SUIT = {
    retract: (p) => { retract = p; }, // the opening's scroll: 0 suited, 1 folded away
    ripple: () => { ripple = 0; },
    tie: () => { const r = rect(); return { x: r.x + r.w * TIE[0], y: r.y + r.h * TIE[1] }; },
    head: () => { const r = rect(); return { x: r.x + r.w * 0.515, y: r.y + r.h * 0.25 }; },
  };

  /* ---------- Start: the photo waits in the dark until the intro calls for the suit ---------- */
  img.style.setProperty('--lit', '0.13');
  document.addEventListener('dkb:intro', () => { wanted = true; });
  setTimeout(() => { wanted = true; }, 9000); // if the intro never ran
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { ptrX = e.clientX; ptrY = e.clientY; } }, { passive: true });
  document.addEventListener('mouseleave', () => { ptrX = ptrY = -9999; });
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(size, 120); });
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(box);
  new MutationObserver(() => { colours(); gl.useProgram(prog); if (ready) bakeRim(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); giveUp(); });

  const go = async () => {
    await img.decode();
    // the alpha tells the jacket from the night; a square texture, so it can have mipmaps
    const small = document.createElement('canvas');
    small.width = 160; small.height = 176;
    const sc = small.getContext('2d', { willReadFrequently: true });
    sc.drawImage(img, 0, 0, 160, 176);
    const px = sc.getImageData(0, 0, 160, 176).data;
    build((u, v) => (u < 0 || v < 0 || u >= 1 || v >= 1 ? 0 : px[(((v * 176) | 0) * 160 + ((u * 160) | 0)) * 4 + 3] / 255));
    const sq = document.createElement('canvas');
    sq.width = sq.height = 1024;
    sq.getContext('2d').drawImage(img, 0, 0, 1024, 1024);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sq);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    bakeField();
    gl.useProgram(wet);
    gl.uniform1i(L.u_tex, 0);
    gl.uniform1i(L.u_field, 1);
    gl.useProgram(prog);
    gl.uniform1i(U.u_tex, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    size();
    colours();
    gl.useProgram(prog);
    ready = true;
    bakeRim();
    requestAnimationFrame(frame);
  };
  go().catch(giveUp);
})();
