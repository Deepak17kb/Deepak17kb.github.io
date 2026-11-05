/* =========================================================
   The Deepak Line: the greeting, the route line and every scroll moment.
   Everything moves by transform or opacity; canvases redraw only when they change.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ART = window.LINE_ART || null;
  let lineReady = false;
  document.addEventListener('line:ready', () => (lineReady = true), { once: true });

  // without the animation library the page is still complete, just still
  if (!window.gsap || !window.ScrollTrigger) {
    const pl = $('.preloader');
    if (pl) pl.remove();
    $$('.year').forEach((y) => y.classList.add('is-on'));
    if (ART) { const cv = $('.thesis__dots'); if (cv) ART.dots(cv).draw(1); }
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  // a phone's address bar sliding in and out changes only the height: don't re-measure the whole page for it
  ScrollTrigger.config({ ignoreMobileResize: true });

  let lenis = null;
  let loading = false;
  const locks = new Set();
  const lock = (k) => { locks.add(k); if (lenis) lenis.stop(); };
  const unlock = (k) => { locks.delete(k); if (lenis && !locks.size && !loading) lenis.start(); };

  /* ---------- Lenis smooth scroll ---------- */
  if (!reduced && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    // a wheel scroll is driven by Lenis, so ScrollTrigger hears it in the same frame; a finger scroll is native,
    // and ScrollTrigger already follows that by itself (telling it twice doubles its work every frame)
    if (ScrollTrigger.isTouch !== 1) lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // when the page last scrolled: on touch screens the skyline and the orb hold still mid-scroll, so the scroll gets the frame
  window.LINE_SCROLL_AT = -1e9;
  addEventListener('scroll', () => { window.LINE_SCROLL_AT = performance.now(); }, { passive: true });

  // The intro plays from the top, so don't restore a mid-page scroll on reload; honour #hash links instead
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const initialHash = location.hash.length > 1 ? location.hash : null;
  window.scrollTo(0, 0);

  // a pinned section is measured by the spacer that holds its place
  const placeOf = (el) => (el.parentElement && el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el);
  const scrollToTarget = (target, opts = {}) => {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    const at = placeOf(el);
    if (lenis) lenis.scrollTo(at, { duration: opts.duration || 1.6 });
    else window.scrollTo({ top: at.getBoundingClientRect().top + window.scrollY, behavior: reduced ? 'auto' : 'smooth' });
  };

  /* ---------- 01 · hero: the name fits the width and stays below the chin ---------- */
  const hero = $('.hero');
  if (hero) new IntersectionObserver(([e]) => hero.classList.toggle('is-near', e.isIntersecting)).observe(hero);
  const nameEl = $('.hero__name');
  const slots = $$('.slot', nameEl);
  const nameChars = $$('.char', nameEl);
  const figure = $('.hero__figure');
  const heroCols = $$('.hero__left, .hero__right');
  const meas = document.createElement('canvas').getContext('2d');
  // an element's top inside an ancestor, from layout offsets (an entrance animation's movement doesn't count)
  const topIn = (el, anc) => { let y = 0; while (el && el !== anc) { y += el.offsetTop; el = el.offsetParent; } return el === anc ? y : NaN; };
  let liftRoom = 0;
  const fitName = () => {
    if (!nameEl || !figure) return;
    const cs = getComputedStyle(nameEl);
    meas.font = `900 100px ${cs.fontFamily}`;
    const m = meas.measureText('DEEPAK');
    const ww = m.width / 100;
    const cap = (m.actualBoundingBoxAscent || 74) / 100;
    const asc = (m.fontBoundingBoxAscent || 96) / 100;
    const desc = (m.fontBoundingBoxDescent || 24) / 100;
    const stage = nameEl.offsetParent;
    if (!stage || !ww) return;
    const base = stage.clientHeight - parseFloat(cs.bottom); // where the letters stand
    const chin = figure.offsetTop + figure.offsetHeight * 0.47;
    // on computers the two text columns sit above the name: on short, wide windows they reach lower than the chin,
    // and the letters must stay below them too (the red button never touches the blue name)
    let ceil = chin;
    const stageTop = topIn(stage, hero);
    heroCols.forEach((c) => {
      if (getComputedStyle(c).position !== 'absolute') return;
      const b = topIn(c, hero) + c.offsetHeight - stageTop;
      if (b > ceil) ceil = b;
    });
    const room = base - ceil - Math.max(14, stage.clientHeight * 0.025);
    const F = Math.max(40, Math.min((nameEl.clientWidth / ww) * 0.99, room / cap));
    nameEl.style.setProperty('--name', F.toFixed(1) + 'px');
    liftRoom = Math.max(0, base - cap * F - ceil - 8);
    // line-height is 1, so pull the box down until the baseline sits on `bottom`
    nameEl.style.marginBottom = (-(1 - (1 + asc - desc) / 2) * F).toFixed(1) + 'px';
    // one satin across the whole word: every letter shows its own slice of the same gradient
    const W = nameEl.clientWidth;
    slots.forEach((s, i) => {
      nameChars[i].style.setProperty('--bw', W + 'px');
      nameChars[i].style.setProperty('--bx', -s.offsetLeft + 'px');
    });
  };
  fitName();

  const mm = gsap.matchMedia();
  // desktop layout: wide, and not a phone held sideways (short landscape screens get the phone layout)
  const DESK = '(min-width: 900px) and (min-height: 541px), (min-width: 900px) and (orientation: portrait)';
  mm.add({ wide: DESK, motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
    const { wide, motion } = ctx.conditions;
    if (!motion) return;
    // scrolling away: the letters fan down into an arch, the portrait sinks slower than the page
    const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
    tl.to(figure, { yPercent: wide ? 12 : 6, ease: 'none' }, 0)
      .to(slots, { y: (i) => innerHeight * (wide ? 0.05 : 0.03) * Math.pow(Math.abs(i - (slots.length - 1) / 2), 1.3), rotation: (i) => (i - (slots.length - 1) / 2) * (wide ? 4 : 3), ease: 'none' }, 0)
      .to(nameEl, { yPercent: wide ? 10 : 6, ease: 'none' }, 0);
    if (wide) tl.to('.hero__left, .hero__right', { y: () => -innerHeight * 0.1, autoAlpha: 0, ease: 'none' }, 0);
  });

  /* ---------- the route line ---------- */
  const line = (() => {
    const cvs = $('.line');
    const pulse = $('.line__pulse');
    const ping = pulse && pulse.querySelector('i');
    const nav = $('.nav');
    const nowEl = $('.board__now');
    const nextEl = $('.board__next');
    const bar = $('.progress i');
    const ctx = cvs ? cvs.getContext('2d') : null;
    const sections = $$('main > section[data-tone], body > footer[data-tone]');
    // red rides the dark chapters, deep red the white ones, white over the blue sky and the blue terminus (red never sits on blue)
    const TONE = {
      dark: { done: '#FF2A46', ahead: 'rgba(255,255,255,.24)', bg: '#050507', ring: 'rgba(255,255,255,.5)', glow: '255,42,70' },
      light: { done: '#D5112E', ahead: 'rgba(10,11,16,.22)', bg: '#F2F3F5', ring: 'rgba(10,11,16,.42)', glow: '213,17,46' },
      blue: { done: '#FFFFFF', ahead: 'rgba(255,255,255,.4)', bg: '#1735C2', ring: 'rgba(255,255,255,.66)', glow: '255,255,255' },
      sky: { done: '#FFFFFF', ahead: 'rgba(255,255,255,.3)', bg: '#03040A', ring: 'rgba(255,255,255,.55)', glow: '255,255,255' },
    };
    let W = 0, H = innerHeight, X = 32, k = 1, dpr = 1, maxS = 1, navH = 60, heroEnd = 0; // k: phones draw the line in a slimmer lane
    let bands = [], stations = [];
    let shown = reduced ? 1 : 0, lastS = -1, dirty = true, cur = -1, tone = '';
    const sprites = {};
    const pinOf = (el) => {
      const t = ScrollTrigger.getAll().find((st) => st.pin === el);
      return t ? { a: t.start, b: t.end } : null;
    };
    // offset inside a section from layout alone, so transforms mid-animation don't skew it
    const within = (el, anc) => { let y = 0; for (let n = el; n && n !== anc; n = n.offsetParent) y += n.offsetTop; return y; };
    // where a page position shows on screen; inside a pinned section it holds still while pinned
    const at = (y, pin, s) => y - s + (pin ? clamp(s - pin.a, 0, pin.b - pin.a) : 0);
    const bandAt = (y, s) => { for (const b of bands) { const t = at(b.top, b.pin, s); if (y >= t && y < t + b.h) return b; } return null; };
    const toneAt = (y, s) => TONE[(bandAt(y, s) || { tone: 'dark' }).tone] || TONE.dark;

    const measure = () => {
      const s = window.scrollY;
      H = (cvs && cvs.clientHeight) || innerHeight; // on phones 100vh is taller than innerHeight by the address bar
      navH = nav ? nav.offsetHeight : 60;
      maxS = Math.max(1, ScrollTrigger.maxScroll(window));
      if (cvs) {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = cvs.clientWidth;
        X = W / 2;
        k = W < 48 ? 0.68 : 1;
        if (W) { cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr); }
      }
      bands = sections.map((el) => {
        const pin = pinOf(el);
        return { el, top: placeOf(el).getBoundingClientRect().top + s, h: el.offsetHeight, tone: el.dataset.tone, pin };
      });
      stations = bands.filter((b) => b.el.dataset.station).map((b) => {
        const mark = b.el.querySelector('.sign b');
        const off = mark ? within(mark, b.el) + mark.offsetHeight / 2 : 0;
        return { y: b.top + off, pin: b.pin, no: b.el.dataset.station, name: b.el.dataset.name, id: b.el.id };
      });
      heroEnd = bands.length ? bands[0].top + bands[0].h : 0;
      Object.keys(sprites).forEach((k) => delete sprites[k]);
      dirty = true;
    };

    // the train starts at station 01, settles at 62% of the screen, and pulls into the terminus at the end
    const runner = (s) => {
      const f = stations[0], l = stations[stations.length - 1];
      const D = H * 0.8;
      const end = at(l.y, l.pin, maxS); // where the terminus sits once the page can't scroll further
      const a = smooth(clamp(s / D, 0, 1));
      // only pull the train down at the end if the terminus would otherwise never reach it
      const b = end > H * 0.62 ? smooth(clamp((s - (maxS - D)) / D, 0, 1)) : 0;
      const y = lerp(lerp(at(f.y, f.pin, 0), H * 0.62, a), end, b);
      return clamp(y, at(f.y, f.pin, s), at(l.y, l.pin, s));
    };

    const flip = (cell, no, name) => {
      if (!cell) return;
      gsap.killTweensOf(cell.children);
      while (cell.children.length > 1) cell.firstElementChild.remove();
      const old = cell.firstElementChild;
      const text = `${no} ${name}`;
      if (old && old.textContent.replace(/\s+/g, ' ').trim() === text) return;
      const el = document.createElement('span');
      el.innerHTML = `<i>${esc(no)}</i> ${esc(name)}`;
      cell.appendChild(el);
      if (!old) return;
      if (reduced) { old.remove(); return; }
      gsap.fromTo(el, { yPercent: 100, rotationX: -70, opacity: 0 }, { yPercent: 0, rotationX: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
      gsap.to(old, { yPercent: -100, rotationX: 70, opacity: 0, duration: 0.5, ease: 'power3.out', onComplete: () => old.remove() });
    };
    const board = (i) => {
      const st = stations[i], nx = stations[i + 1];
      flip(nowEl, st.no, st.name);
      if (nx) flip(nextEl, nx.no, nx.name);
      else flip(nextEl, '—', 'End of the line');
      $$('.route__list a').forEach((a) => {
        if (a.getAttribute('href') === '#' + st.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      if (ping && ping.getAnimations) ping.getAnimations().forEach((a) => { a.currentTime = 0; a.play(); });
      document.dispatchEvent(new CustomEvent('line:station', { detail: { i, last: i === stations.length - 1 } }));
    };

    const sprite = (T) => {
      if (sprites[T.glow]) return sprites[T.glow];
      const c = document.createElement('canvas');
      c.width = c.height = Math.round(48 * k * dpr);
      const g = c.getContext('2d');
      const r = c.width / 2;
      const gr = g.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, `rgba(${T.glow},.55)`);
      gr.addColorStop(1, `rgba(${T.glow},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, c.width, c.height);
      return (sprites[T.glow] = c);
    };

    const draw = (s, ry, current) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const f = stations[0], l = stations[stations.length - 1];
      const y0 = at(f.y, f.pin, s), y1 = at(l.y, l.pin, s);
      const cap = lerp(y0, Math.max(y0, H + 20), shown); // the intro draws the line down from station 01
      for (const b of bands) {
        const t = at(b.top, b.pin, s);
        const lo = Math.max(t, y0, -10), hi = Math.min(t + b.h, y1, H + 10, cap);
        if (hi <= lo) continue;
        const T = TONE[b.tone] || TONE.dark;
        const mid = clamp(ry, lo, hi);
        if (mid > lo) { ctx.fillStyle = T.done; ctx.fillRect(X - 1.5 * k, lo, 3 * k, mid - lo); }
        if (hi > mid) { ctx.fillStyle = T.ahead; ctx.fillRect(X - Math.max(0.75, k), mid, Math.max(1.5, 2 * k), hi - mid); }
      }
      let py = null, pc = '';
      stations.forEach((st, k) => {
        const y = at(st.y, st.pin, s);
        if (y < -20 || y > H + 20 || y > cap + 1) return;
        const T = toneAt(y, s);
        const passed = k <= current;
        ctx.beginPath();
        ctx.arc(X, y, 7.5 * k, 0, Math.PI * 2);
        ctx.fillStyle = passed ? T.done : T.bg;
        ctx.fill();
        ctx.lineWidth = 2.5 * k;
        ctx.strokeStyle = passed ? T.done : T.ring;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(X, y, 2.8 * k, 0, Math.PI * 2);
        ctx.fillStyle = T.bg;
        ctx.fill();
        if (k === current) { py = y; pc = T.done; }
      });
      if (pulse) {
        if (py !== null && shown > 0.98) {
          pulse.style.transform = `translate3d(${X}px, ${py.toFixed(1)}px, 0)`;
          pulse.style.color = pc;
          pulse.style.opacity = '1';
        } else pulse.style.opacity = '0';
      }
      if (ry <= cap + 1) {
        const T = toneAt(ry, s);
        ctx.drawImage(sprite(T), X - 22 * k, ry - 34 * k, 44 * k, 68 * k);
        ctx.fillStyle = T.done;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(X - 5 * k, ry - 13 * k, 10 * k, 26 * k, 5 * k); else ctx.rect(X - 5 * k, ry - 13 * k, 10 * k, 26 * k);
        ctx.fill();
        ctx.fillStyle = T.bg;
        ctx.fillRect(X - 2 * k, ry - 7 * k, 4 * k, 3 * k);
        ctx.fillRect(X - 2 * k, ry + 3 * k, 4 * k, 3 * k);
      }
    };

    const update = (s) => {
      if (!stations.length) return;
      const ry = runner(s);
      let i = 0;
      for (let k = 0; k < stations.length; k++) if (at(stations[k].y, stations[k].pin, s) <= ry + 1) i = k;
      if (i !== cur) { cur = i; board(i); }
      const t = (bandAt(navH / 2, s) || { tone: 'dark' }).tone;
      if (t !== tone && nav) { tone = t; nav.dataset.tone = t; }
      if (nav) nav.classList.toggle('in-hero', s < heroEnd - navH);
      if (bar) bar.style.transform = `scaleX(${(s / maxS).toFixed(4)})`;
      if (ctx && W) draw(s, ry, i);
    };

    gsap.ticker.add(() => {
      const s = lenis ? lenis.scroll : window.scrollY;
      if (s === lastS && !dirty) return;
      lastS = s;
      dirty = false;
      update(s);
    });
    const reveal = () => {
      const st = { v: shown };
      gsap.to(st, { v: 1, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { shown = st.v; dirty = true; } });
    };
    return { measure, reveal };
  })();

  /* ---------- greeting → hero intro ---------- */
  // The screen fades first and the last greeting dissolves over the page; a beat later "DEEPAK"
  // decodes left to right out of random katakana, and the rest of the hero arrives around it.
  const KANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ';
  const PER_LETTER = 0.1; // the reference decodes ~10 letters a second
  const decode = (chars) => {
    const finals = chars.map((c) => c.textContent);
    const state = { p: 0 };
    let lastSwap = 0;
    return gsap.to(state, {
      p: 1, duration: PER_LETTER * (chars.length + 1), ease: 'none',
      onStart: () => chars.forEach((c) => {
        // lock each letter's width so the line doesn't jitter while glyphs swap
        c.style.width = c.getBoundingClientRect().width + 'px';
        c.classList.add('is-scrambling');
        c.style.opacity = '';
        c.textContent = KANA[(Math.random() * KANA.length) | 0];
      }),
      onUpdate: () => {
        const revealed = Math.floor(state.p * (chars.length + 1));
        const now = performance.now();
        const swap = now - lastSwap > 45; // new random glyphs ~20 times a second, not every frame
        if (swap) lastSwap = now;
        chars.forEach((c, i) => {
          if (i < revealed) {
            if (c.classList.contains('is-scrambling')) { c.textContent = finals[i]; c.classList.remove('is-scrambling'); }
          } else if (swap) c.textContent = KANA[(Math.random() * KANA.length) | 0];
        });
      },
      onComplete: () => chars.forEach((c, i) => {
        c.textContent = finals[i];
        c.classList.remove('is-scrambling');
        c.style.width = '';
      }),
    });
  };
  // 0 = the loader screen starts to fade; the rest of the hero arrives with the page.
  // The portrait waits until the last greeting has gone, so no word ever crosses the face.
  const DECODE_AT = 0.6;
  const intro = () => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.set(nameChars, { opacity: 0 }, 0) // the name area stays empty until it decodes
      .add(decode(nameChars), DECODE_AT)
      .from('.hero__glow', { opacity: 0, duration: 1.8, ease: 'power2.out' }, 0.2)
      .from('.hero__figure > *', { opacity: 0, y: 46, duration: 1.7 }, 0.4)
      .from('.hero .sign', { opacity: 0, x: -18, duration: 0.9 }, 0.5)
      .from('.hero [data-rise]', { y: 26, opacity: 0, duration: 1, stagger: 0.07 }, 0.55)
      .from('.nav > *', { y: -22, opacity: 0, duration: 0.9, stagger: 0.08, clearProps: 'opacity,transform' }, 0.3)
      .add(() => line.reveal(), 0.7)
      .call(() => document.dispatchEvent(new Event('line:ready')), null, 2.8); // the page is settled: draw ahead while idle
    return tl;
  };

  const finishLoading = () => {
    loading = false;
    document.body.classList.remove('is-loading');
    if (lenis && !locks.size) lenis.start();
    ScrollTrigger.refresh(); // the scrollbar is back, so widths changed
    if (initialHash) {
      try { scrollToTarget(initialHash, { duration: 1.2 }); } catch (e) {} // bad selector in the URL
    }
  };

  const preloader = $('.preloader');
  if (reduced || !preloader) {
    if (preloader) preloader.remove();
    finishLoading();
    line.reveal();
    setTimeout(() => document.dispatchEvent(new Event('line:ready')), 400);
  } else {
    loading = true;
    document.body.classList.add('is-loading');
    if (lenis) lenis.stop();
    // Hello around the world, one beat each, ending at home (Odia) with a longer hold.
    // A reload in the same tab just says hello.
    let seen = false;
    try { seen = sessionStorage.getItem('dkb-seen') === '1'; sessionStorage.setItem('dkb-seen', '1'); } catch (e) {}
    const hellos = [
      ['Hello', 'en', 'English'],
      ['Hola', 'es', 'Spanish'],
      ['Bonjour', 'fr', 'French'],
      ['Ciao', 'it', 'Italian'],
      ['नमस्ते', 'hi', 'Hindi'],
      ['こんにちは', 'ja', 'Japanese'],
      ['안녕하세요', 'ko', 'Korean'],
      ['مرحبا', 'ar', 'Arabic'],
      ['Привет', 'ru', 'Russian'],
      ['你好', 'zh', 'Chinese'],
      ['Olá', 'pt', 'Portuguese'],
      ['Merhaba', 'tr', 'Turkish'],
      ['ନମସ୍କାର', 'or', 'Odia'],
    ];
    const list = seen ? hellos.slice(0, 1) : hellos;
    const STEP = 0.23;
    const last = (list.length - 1) * STEP; // when the final greeting lands; the line is full by then
    const out = last + (seen ? 0.4 : 0.73); // hold the last one, then the screen fades away first
    const greetBox = $('.preloader__greet');
    const langBox = $('.preloader__lang');
    const hello = $('.preloader__hello');
    // the new word fades in on top while the old one fades out, so for a moment both show
    const crossfade = (box, text, lang) => {
      const el = document.createElement('span');
      el.textContent = text;
      if (lang) el.lang = lang;
      [...box.children].forEach((old) => gsap.to(old, { opacity: 0, duration: 0.05, ease: 'none', onComplete: () => old.remove() }));
      box.appendChild(el);
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.05, ease: 'none' });
    };
    // Impatient? Any click or key fast-forwards the loader
    const skip = () => pre.timeScale(4);
    const pre = gsap.timeline();
    pre.to('.preloader__bar i', { scaleX: 1, duration: Math.max(last, 0.4), ease: 'none' }, 0);
    list.forEach(([text, lang, name], i) => {
      if (i) pre.call(() => { crossfade(greetBox, text, lang); crossfade(langBox, name); }, null, i * STEP); // Hello is in the markup
    });
    // the screen goes first and the page shows through; the last greeting takes the page's ink,
    // then dissolves: fade, a little blur, a slight grow
    pre.to(preloader, { backgroundColor: 'rgba(15, 14, 13, 0)', duration: 0.15, ease: 'power1.out' }, out)
      .to('.preloader__bar', { opacity: 0, duration: 0.15 }, out)
      .to(hello, { color: () => getComputedStyle(root).getPropertyValue('--ink').trim(), duration: 0.15 }, out)
      .fromTo(hello, { filter: 'blur(0px)' }, { opacity: 0, scale: 1.03, filter: 'blur(8px)', duration: 0.25, ease: 'power1.in' }, out + 0.1)
      .add(() => {
        preloader.removeEventListener('pointerdown', skip);
        window.removeEventListener('keydown', skip);
        pre.timeScale(1);
        preloader.remove();
        finishLoading();
      }, out + 0.4)
      .add(intro(), out);
    preloader.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip);
  }

  /* ---------- route map (menu) ---------- */
  const route = $('#route');
  const routeBtn = $('.nav__route');
  const shut = [$('.nav'), $('main'), $('.foot')].filter(Boolean);
  let routeOpen = false;
  const openRoute = () => {
    if (routeOpen || !route) return;
    routeOpen = true;
    route.hidden = false;
    routeBtn.setAttribute('aria-expanded', 'true');
    shut.forEach((el) => (el.inert = true));
    lock('route');
    if (!reduced) {
      gsap.fromTo(route, { yPercent: -100 }, { yPercent: 0, duration: 0.75, ease: 'expo.out' });
      gsap.fromTo('.route__list li', { y: 44, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.045, ease: 'expo.out', delay: 0.12 });
    }
    const first = route.querySelector('a[aria-current="true"]') || route.querySelector('a');
    if (first) first.focus({ preventScroll: true });
  };
  const closeRoute = (then) => {
    if (!routeOpen) return;
    routeOpen = false;
    const done = () => {
      route.hidden = true;
      routeBtn.setAttribute('aria-expanded', 'false');
      shut.forEach((el) => (el.inert = false));
      unlock('route');
      if (then) then();
      else routeBtn.focus({ preventScroll: true });
    };
    if (reduced) done();
    else gsap.to(route, { yPercent: -100, duration: 0.5, ease: 'power3.in', onComplete: done });
  };
  if (route && routeBtn) {
    route.setAttribute('data-lenis-prevent', '');
    routeBtn.addEventListener('click', () => (routeOpen ? closeRoute() : openRoute()));
    $('.route__close', route).addEventListener('click', () => closeRoute());
    route.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRoute(); return; }
      if (e.key !== 'Tab') return;
      const f = $$('a, button', route);
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
    $$('a', route).forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const to = a.getAttribute('href');
      closeRoute(() => scrollToTarget(to));
    }));
  }

  // in-page links ride the smooth scroll
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.closest('.route')) return;
    if (a.hasAttribute('data-ride') && lenis) { e.preventDefault(); ride.go(); return; }
    const to = a.getAttribute('href');
    if (to.length < 2) return;
    const el = document.querySelector(to);
    if (!el) return;
    e.preventDefault();
    scrollToTarget(el);
    if (a.classList.contains('skip')) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
  });

  /* ---------- reveals ---------- */
  const rise = (targets, trigger) => {
    if (reduced || !$(trigger)) return;
    gsap.from(targets, { yPercent: 108, duration: 1.2, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger, start: 'top 86%' } });
  };
  rise('.thesis__title .mask > span', '.thesis__title');
  rise('.wins__title .mask > span', '.wins__title');
  if (!reduced) {
    ['.work__title', '.about__title', '.journey__title', '.toolkit__title', '.terminus__title', '.certs__title'].forEach((sel) => {
      const el = $(sel);
      if (el) gsap.from(el, { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
  }

  // numbers count up the first time they come into view
  const NUM = window.Intl ? new Intl.NumberFormat('en-US') : null;
  $$('[data-count]').forEach((el) => {
    if (reduced) return;
    const end = Number(el.dataset.count);
    const o = { v: 0 };
    let was = -1;
    const fmt = () => { const v = Math.round(o.v); if (v === was) return; was = v; el.textContent = NUM ? NUM.format(v) : String(v); };
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: fmt }) });
  });

  /* ---------- thesis: scattered points find their grid as you read ---------- */
  const dotsCv = $('.thesis__dots');
  if (dotsCv && ART) {
    const D = ART.dots(dotsCv);
    const st = { p: reduced ? 1 : 0 };
    const paint = () => D.draw(st.p);
    if (reduced) {
      requestAnimationFrame(paint);
      ScrollTrigger.addEventListener('refresh', () => { D.resize(); paint(); });
    } else {
      gsap.to(st, {
        p: 1, ease: 'none', onUpdate: paint,
        scrollTrigger: { trigger: '.thesis', start: 'top 70%', end: 'bottom 80%', scrub: 0.6, onRefresh: () => { D.resize(); paint(); } },
      });
    }
  }

  /* ---------- 02 · selected work: a curved wall of posters on a spring (desktop) ---------- */
  // Scrolling sets where the wall should be; a spring carries it there, so it overshoots and bounces back
  // when you stop. Then the nearest poster glides to the middle and settles with the same bounce.
  mm.add({ desk: DESK, motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
    if (!ctx.conditions.desk || !ctx.conditions.motion) return;
    const work = $('.work');
    const track = $('.rail__track');
    const cards = $$('.poster', track);
    let lefts = [], widths = [], mid = innerWidth / 2, dist = 0;
    let x = 0, v = 0, target = 0, alive = true, idle = 0;
    let dir = 0, speed = 0, lastT = 0; // which way the wall last moved, and how fast
    const measureRail = () => {
      mid = innerWidth / 2;
      // the first and the last poster can each reach the middle, so Darklytics opens in full view
      track.style.paddingLeft = Math.max(0, mid - cards[0].offsetWidth / 2) + 'px';
      track.style.paddingRight = Math.max(0, mid - cards[cards.length - 1].offsetWidth / 2) + 'px';
      lefts = cards.map((c) => c.offsetLeft);
      widths = cards.map((c) => c.offsetWidth);
      dist = Math.max(0, track.offsetWidth - innerWidth);
    };
    // concave: posters near the edges turn to face you and come closer; all of them lean into the motion
    const bend = () => {
      const lean = clamp(-v * 0.012, -11, 11);
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      cards.forEach((c, i) => {
        const d = clamp((lefts[i] + widths[i] / 2 + x - mid) / mid, -1.4, 1.4);
        c.style.transform = `translate3d(0, 0, ${(Math.abs(d) * 140).toFixed(1)}px) rotateY(${(-d * 24 + lean).toFixed(2)}deg)`;
      });
    };
    // under-damped on purpose: it swings past and back a couple of times before it rests
    const K = 160, C = 2 * 0.3 * Math.sqrt(K);
    const spring = (time, dtMs) => {
      if (Math.abs(target - x) < 0.05 && Math.abs(v) < 0.05) return;
      const dt = Math.min(dtMs, 34) / 2000; // two half steps per frame stay stable at low frame rates
      for (let k = 0; k < 2; k++) { v += (K * (target - x) - C * v) * dt; x += v * dt; }
      bend();
    };
    gsap.ticker.add(spring);
    const st = ScrollTrigger.create({
      trigger: work, start: 'top top', end: () => { measureRail(); return '+=' + Math.max(1, dist); },
      pin: true, refreshPriority: 1, invalidateOnRefresh: true,
      onUpdate: (self) => {
        const next = -self.progress * dist, now = performance.now();
        if (next !== target) {
          dir = Math.sign(next - target);
          speed = speed * 0.7 + (Math.abs(next - target) / Math.max(1, now - lastT)) * 300;
        }
        lastT = now;
        target = next;
      },
      onRefresh: (self) => { target = x = -self.progress * dist; v = 0; bend(); },
    });
    // the bounce: when the wall comes to rest it is flicked on in the direction it was going, and the spring swings it back
    const kick = () => {
      if (!dir) return;
      v += dir * clamp(speed * 0.6, 820, 1500);
      dir = 0;
      speed = 0;
    };
    // when the scrolling stops inside the wall, glide so the nearest poster sits in the middle, then bounce
    const settle = () => {
      if (!alive || !lenis || !st.isActive || st.progress <= 0.002 || st.progress >= 0.998) return;
      let best = 0, gap = Infinity;
      cards.forEach((c, i) => {
        const q = clamp((lefts[i] + widths[i] / 2 - mid) / Math.max(1, dist), 0, 1);
        if (Math.abs(q - st.progress) < gap) { gap = Math.abs(q - st.progress); best = q; }
      });
      const to = st.start + best * (st.end - st.start);
      if (Math.abs(to - window.scrollY) > 3) lenis.scrollTo(to, { duration: 0.75, easing: (t) => 1 - Math.pow(1 - t, 3) });
      else kick(); // the glide's own last scroll event brings us back here once it has arrived
    };
    if (lenis) lenis.on('scroll', () => { if (!alive) return; clearTimeout(idle); idle = setTimeout(settle, 170); });
    return () => {
      alive = false;
      clearTimeout(idle);
      gsap.ticker.remove(spring);
      st.kill();
      track.style.transform = track.style.paddingLeft = track.style.paddingRight = '';
      cards.forEach((c) => (c.style.transform = ''));
    };
  });
  /* ---------- 02 · on phones the rail is swiped: the posters still bend, lean into the swipe and bounce ---------- */
  // Native swiping and snapping stay as they are (they feel right under a finger). The motion goes on the card
  // inside each poster, through the separate `rotate` and `scale` properties: the poster itself (what the rail
  // snaps to) never changes shape, so the snap point holds still, and the arrival tween's transform is left alone.
  mm.add({ phone: '(max-width: 899px), (orientation: landscape) and (max-height: 540px)', motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
    if (!ctx.conditions.phone || !ctx.conditions.motion) return;
    const rail = $('.rail');
    const posters = rail ? $$('.poster', rail) : [];
    const cards = posters.map((li) => $('.poster__card', li)).filter(Boolean);
    if (!cards.length || cards.length !== posters.length) return;
    let centers = [], half = 1, mid = 0, sx = rail.scrollLeft, lastT = 0, vel = 0, inView = false, idle = 0, dir = 0, moved = 0;
    // two under-damped springs: the lean follows the swipe speed, the bump makes the middle poster land with a bounce
    const L = { x: 0, v: 0 }, B = { x: 0, v: 0 };
    const step = (q, to, K, z, dt) => { q.v += (K * (to - q.x) - 2 * z * Math.sqrt(K) * q.v) * dt; q.x += q.v * dt; };
    const paint = () => {
      cards.forEach((c, i) => {
        const d = clamp((centers[i] - sx - mid) / half, -1.5, 1.5), a = Math.min(1, Math.abs(d));
        c.style.rotate = `y ${(-d * 20 + L.x).toFixed(2)}deg`;
        c.style.scale = ((1 - a * 0.07) * (1 + clamp(B.x, -0.06, 0.04) * (1 - a))).toFixed(4);
      });
    };
    const measure = () => {
      const r = rail.getBoundingClientRect();
      // the middle a poster snaps to: the space right of the line's lane
      const pl = parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0;
      mid = (r.width + pl) / 2;
      half = (r.width - pl) / 2;
      centers = posters.map((li) => { const b = li.getBoundingClientRect(); return b.left - r.left + rail.scrollLeft + b.width / 2; });
      sx = rail.scrollLeft;
      paint();
    };
    const tick = (time, dtMs) => {
      if (!inView) return;
      if (performance.now() - lastT > 70) vel *= 0.8; // no scroll event for a while: the swipe has slowed
      const lean = clamp(vel * 9, -14, 14);
      if (Math.abs(lean - L.x) < 0.02 && Math.abs(L.v) < 0.02 && Math.abs(B.x) < 0.0005 && Math.abs(B.v) < 0.0005) return;
      const dt = Math.min(dtMs, 34) / 2000;
      for (let n = 0; n < 2; n++) { step(L, lean, 140, 0.28, dt); step(B, 0, 160, 0.26, dt); }
      paint();
    };
    const onScroll = () => {
      const s = rail.scrollLeft, now = performance.now();
      if (s !== sx) dir = Math.sign(s - sx);
      moved += Math.abs(s - sx);
      vel = vel * 0.6 + ((s - sx) / Math.max(8, now - lastT)) * 0.4;
      sx = s;
      lastT = now;
      clearTimeout(idle);
      // the swipe has landed: a last flick of lean the way it went, and the middle poster bounces (real swipes only)
      idle = setTimeout(() => { if (dir && moved > 24) { L.v += dir * 46; B.v -= 0.85; } dir = 0; moved = 0; vel = 0; }, 130);
    };
    rail.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { rootMargin: '15% 0px' });
    io.observe(rail);
    gsap.ticker.add(tick);
    ScrollTrigger.addEventListener('refresh', measure);
    measure();
    return () => {
      clearTimeout(idle);
      gsap.ticker.remove(tick);
      rail.removeEventListener('scroll', onScroll);
      io.disconnect();
      ScrollTrigger.removeEventListener('refresh', measure);
      cards.forEach((c) => { c.style.rotate = ''; c.style.scale = ''; });
    };
  });

  // the posters arrive with a bounce as the wall comes up
  if (!reduced) {
    const pc = $$('.poster__card');
    gsap.from(pc, {
      y: 150, rotation: (i) => (i % 2 ? 5 : -5), opacity: 0, duration: 1.3, stagger: 0.08, ease: 'back.out(1.7)',
      scrollTrigger: { trigger: '.work', start: 'top 72%' },
      onStart: () => pc.forEach((c) => c.classList.add('is-arriving')),
      onComplete: () => pc.forEach((c) => { c.classList.remove('is-arriving'); gsap.set(c, { clearProps: 'transform,opacity' }); }),
    });
  }

  /* ---------- case files ---------- */
  const P = {
    darklytics: {
      name: 'Darklytics', when: 'Oct 2026 · Data / ML',
      q: 'Blinkit, Instamart, Minutes, BigBasket: who actually wins once you read the data instead of the ads?',
      tag: 'Quick-commerce market intelligence across Blinkit, Swiggy Instamart, Flipkart Minutes and BigBasket, unified in one live storefront.',
      more: 'Leakage-safe feature engineering, 13 models and decision tools, and a provenance-aware AI analyst, all behind a storefront-style web app.',
      cap: "Real project data: the sell-out rate of each aisle's listings. Hover an aisle for the breakdown, or re-sort the shelves.",
      metrics: ['610,789 price, stock and ETA rows', '13 models and decision tools', '21 data contracts'],
      stack: ['Python', 'pandas', 'LightGBM', 'DuckDB', 'JavaScript'],
      demo: 'https://deepak17kb.github.io/quickcommerce-mi/', code: 'https://github.com/Deepak17kb/quickcommerce-mi',
    },
    broadbridge: {
      name: 'BroadBridge', when: 'Sep 2026 · AI / Fintech',
      q: 'Your financial plan works in an average year. What happens in the worst one?',
      tag: 'An AI wealth navigator that stress-tests every financial goal against thousands of simulated markets.',
      more: 'React and Node on top of one shared TypeScript finance engine (Monte Carlo projections, goal funding, portfolio risk) that runs identically in the browser and on the server.',
      cap: 'Playable: a lightweight version of the engine. 400 simulated markets re-run live as you move the sliders. Illustrative assumptions, not financial advice.',
      metrics: ['239 tests passing', '9 what-if levers', '12 action-ranking rules'],
      stack: ['TypeScript', 'React', 'Node', 'Claude / Groq', 'Monte Carlo'],
      demo: 'https://deepak17kb.github.io/BroadBridge/', code: 'https://github.com/Deepak17kb/BroadBridge',
    },
    upi: {
      name: 'UPI Risk Desk', when: 'Sep 2026 · Team project · <span class="gold">#1</span> Best Pipeline',
      q: 'Fraud rings look innocent one payment at a time. So how do you catch them in 20,000?',
      tag: 'A fraud-ring detection and merchant-risk command centre that won Best Pipeline at the TransOrg AgentIQ Datathon.',
      more: 'A graph-analytics pipeline in pandas, NetworkX and SQLite, visualised in ECharts, with five AI risk agents layered on top.',
      cap: 'Playable: payments modelled as a directed graph. Depth-first search traverses it, and any back-edge to an account still on the stack is a ring.',
      metrics: ['20K UPI payments analysed', '121 dispute rings found', '5 AI risk agents'],
      stack: ['Python', 'pandas', 'NetworkX', 'SQLite', 'ECharts', 'Claude'],
      demo: 'https://adityashukla2615.github.io/upi-risk-desk/outputs/upi_risk_desk.html?v=2', code: 'https://github.com/Deepak17kb/upi-risk-desk',
    },
    saferoute: {
      name: 'NER SafeRoute', when: 'Sep 2026 · Smart India Hackathon',
      q: 'In landslide country, the shortest route can be the deadliest. How do you route a truck by risk instead of distance?',
      tag: 'Hazard-aware truck routing across the landslide-prone mountain roads of Northeast India.',
      more: 'A geospatial decision-support platform combining ML road-risk prediction, real-time hazard intelligence, weather analytics, vehicle-compatibility checks and risk-aware route optimisation.',
      cap: 'Playable: tap the map to trigger a landslide. A* re-plans the lowest-risk route around it, avoiding steep gradients.',
      metrics: ['87.1% balanced accuracy (risk model)', '3,447 road segments scored', '8 NE states'],
      stack: ['FastAPI', 'React', 'Leaflet', 'PostGIS', 'scikit-learn', 'OSRM'],
      demo: 'https://ner-safe-route-psi.vercel.app/', code: 'https://github.com/Deepak17kb/NER-SafeRoute',
    },
    lifeline: {
      name: 'LifeLine', when: 'Feb 2026 · C++17',
      q: 'One broken road can cut off a hospital. Which roads can a city never afford to lose?',
      tag: 'A transit-routing and emergency-response simulator that finds the detour the moment a city road fails.',
      more: "Dijkstra and A* routing, BFS flood propagation, Edmonds–Karp max-flow for evacuation and Tarjan's bridge detection over a 40-node city graph. The heap, hash map, trie and union–find are hand-built in C++17, and all 96 checks are cross-validated against NetworkX.",
      cap: 'Playable: a city of 40 places and 83 roads. Tap any road to break it. Dijkstra re-routes live, and A* finds the same path while exploring fewer nodes.',
      metrics: ['40 locations', '83 roads modelled', '96/96 tests passing'],
      stack: ['C++17', 'React', 'REST', 'Graph algorithms'],
      demo: 'https://lifeline-31iq.onrender.com', code: 'https://github.com/Deepak17kb/lifeline',
    },
  };
  const ORDER = Object.keys(P);
  const sheet = $('.sheet');
  if (sheet && typeof sheet.showModal === 'function') {
    const body = $('.sheet__body', sheet);
    let idx = 0;
    let opener = null;
    let play = null;
    const unplay = () => { if (play) { play(); play = null; } };
    const metric = (m) => {
      const k = m.match(/^([\d.,/%+K]+)\s+(.*)$/);
      return k ? `<b class="gold">${esc(k[1])}</b><span>${esc(k[2])}</span>` : `<span>${esc(m)}</span>`;
    };
    const fill = (i) => {
      idx = (i + ORDER.length) % ORDER.length;
      const p = P[ORDER[idx]];
      $('.sheet__count', sheet).textContent = `Case file ${String(idx + 1).padStart(2, '0')} / ${String(ORDER.length).padStart(2, '0')}`;
      $('.sheet__when', sheet).innerHTML = p.when; // static text from this file
      $('.sheet__name', sheet).textContent = p.name;
      $('.sheet__q', sheet).textContent = p.q;
      $('.sheet__tag', sheet).textContent = p.tag;
      $('.sheet__more', sheet).textContent = p.more;
      $('.sheet__cap', sheet).textContent = p.cap;
      $('.sheet__metrics', sheet).innerHTML = p.metrics.map((m) => `<li>${metric(m)}</li>`).join('');
      $('.sheet__stack', sheet).innerHTML = p.stack.map((s) => `<li>${esc(s)}</li>`).join('');
      $('.sheet__links', sheet).innerHTML =
        `<a class="btn btn--red" href="${esc(p.demo)}" target="_blank" rel="noopener">Open the live demo <i aria-hidden="true">&nearr;</i></a>` +
        `<a class="btn btn--line" href="${esc(p.code)}" target="_blank" rel="noopener">Read the code <i aria-hidden="true">&nearr;</i></a>`;
      unplay();
      const art = $('.sheet__art', sheet);
      play = window.LINE_PLAY ? window.LINE_PLAY.mount(ORDER[idx], art, $('.sheet__play', sheet)) : null;
      if (!play && ART) ART.poster(ORDER[idx], art, true);
      body.scrollTop = 0;
    };
    const open = (i, btn) => {
      opener = btn || null;
      if (!sheet.open) { sheet.showModal(); lock('sheet'); }
      fill(i);
    };
    const step = (d) => {
      fill(idx + d);
      if (!reduced) gsap.fromTo($$('.sheet__body > :not(.sheet__top)', sheet), { opacity: 0, x: 26 * d }, { opacity: 1, x: 0, duration: 0.45, stagger: 0.015, ease: 'power3.out' });
    };
    sheet.addEventListener('close', () => { unplay(); unlock('sheet'); if (opener) opener.focus({ preventScroll: true }); });
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); }); // the backdrop
    sheet.addEventListener('keydown', (e) => {
      if (e.target.matches('input')) return; // the sliders use the arrow keys
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });
    $('.sheet__close', sheet).addEventListener('click', () => sheet.close());
    $$('.sheet__step', sheet).forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.step))));
    $$('.poster[data-key]').forEach((p) => {
      if (window.LINE_PLAY) $('.poster__body', p).insertAdjacentHTML('afterbegin', '<span class="poster__play" aria-hidden="true">Playable case file</span>');
      const b = $('.poster__open', p);
      if (b) b.addEventListener('click', () => open(ORDER.indexOf(p.dataset.key), b));
    });
  }

  /* ---------- the glitch band: runs only on screen, leans with the scroll ---------- */
  const band = $('.band');
  if (band) {
    new IntersectionObserver(([e]) => band.classList.toggle('is-on', e.isIntersecting), { rootMargin: '10% 0px' }).observe(band);
    if (lenis) {
      const skew = gsap.quickTo('.band__row', 'skewX', { duration: 0.6, ease: 'power3.out' });
      let leaned = 0;
      lenis.on('scroll', (l) => {
        if (!band.classList.contains('is-on')) return; // off screen: leave it be
        const v = Math.round(clamp(-l.velocity * 0.3, -8, 8) * 10) / 10;
        if (v !== leaned) { leaned = v; skew(v); }
      });
    }
  }

  /* ---------- 03 · about: the torch ---------- */
  const about = $('.about');
  const veil = $('.about__veil');
  const torch = $('.about__torch');
  if (about && veil && torch && !reduced) {
    // The veil is a small canvas, stretched: the browser keeps one little texture and slides it,
    // instead of re-painting a 3,200px gradient layer whenever it moves.
    if (veil.getContext) {
      const S = 512, g = veil.getContext('2d');
      veil.width = veil.height = S;
      const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      [[0, 0], [34 / 400, 0], [62 / 400, 0.5], [104 / 400, 0.84], [1, 0.88]].forEach(([o, a]) => gr.addColorStop(o, `rgba(3,4,10,${a})`));
      g.fillStyle = gr;
      g.fillRect(0, 0, S, S);
    }
    // Left alone, the torch wanders: a looping animation on the wrapper, which the browser runs off the main
    // thread, so a page at rest does no work at all. A pointer or a finger takes over the canvas inside;
    // when they stop, the torch glides back onto its path and the wander carries on.
    const PATH = [[0.80, 0.30], [0.25, 0.55], [0.62, 0.78], [0.18, 0.22], [0.72, 0.62], [0.42, 0.40]];
    let wander = null, inView = false, aw = 0, ah = 0;
    const route = () => {
      aw = about.clientWidth;
      ah = about.clientHeight;
      const t = wander ? wander.currentTime : 0;
      if (wander) wander.cancel();
      wander = torch.animate(PATH.map(([u, v]) => ({ transform: `translate3d(${Math.round(u * aw)}px, ${Math.round(v * ah)}px, 0)`, easing: 'ease-in-out' })), { duration: 36000, iterations: Infinity, direction: 'alternate' });
      wander.currentTime = t || 0;
      if (!inView || following) wander.pause();
    };
    const at = (el) => { const m = new DOMMatrixReadOnly(getComputedStyle(el).transform); return [m.m41, m.m42]; };
    let following = false, back = null, base = [0, 0], ox = 0, oy = 0, gx = 0, gy = 0, lastMove = 0;
    const put = () => { veil.style.transform = `translate3d(${ox.toFixed(1)}px, ${oy.toFixed(1)}px, 0) scale(4)`; };
    const aim = (x, y) => {
      const r = about.getBoundingClientRect();
      if (!following) {
        following = true;
        if (wander) wander.pause();
        base = at(torch); // where the wander stopped
        [ox, oy] = at(veil); // and where the canvas sits now (it may be gliding home)
        if (back) { back.cancel(); back = null; }
        put();
      }
      gx = x - r.left - base[0];
      gy = y - r.top - base[1];
      lastMove = performance.now();
    };
    about.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') aim(e.clientX, e.clientY); });
    // on a touch screen the torch follows your finger, even while you scroll
    const follow = (e) => { const t = e.touches && e.touches[0]; if (t) aim(t.clientX, t.clientY); };
    about.addEventListener('touchstart', follow, { passive: true });
    about.addEventListener('touchmove', follow, { passive: true });
    const hint = $('.about__hint');
    if (hint && matchMedia('(hover: none)').matches) hint.textContent = 'Drag your finger.';
    // while someone steers: ease toward them (the same glide at 60 or 120 frames a second); after a pause, glide home
    gsap.ticker.add((time, dtMs) => {
      if (!following) return;
      if (performance.now() - lastMove > 2600) {
        following = false;
        const from = veil.style.transform;
        ox = oy = 0;
        put();
        back = veil.animate([{ transform: from }, { transform: veil.style.transform }], { duration: 1400, easing: 'cubic-bezier(.4, 0, .2, 1)' });
        back.onfinish = () => { back = null; if (inView && wander && !following) wander.play(); };
        return;
      }
      const k = 1 - Math.exp(-Math.min(dtMs, 50) / 130);
      const nx = ox + (gx - ox) * k, ny = oy + (gy - oy) * k;
      if (Math.abs(nx - ox) < 0.05 && Math.abs(ny - oy) < 0.05) return;
      ox = nx;
      oy = ny;
      put();
    });
    new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (!wander) return;
      if (inView && !following && !back) wander.play(); else if (!inView) wander.pause();
    }).observe(about);
    route();
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (about.clientWidth !== aw || Math.abs(about.clientHeight - ah) > 80) route(); }, 250); });
  }

  /* ---------- 04 · wins ---------- */
  const reel = $('.odo__reel');
  if (reel && !reduced) {
    gsap.set(reel, { y: 0, yPercent: 0 });
    ScrollTrigger.create({ trigger: '.odo', start: 'top 80%', once: true, onEnter: () => gsap.fromTo(reel, { yPercent: 0 }, { yPercent: (-100 * 11) / 12, duration: 2.8, ease: 'expo.out' }) });
  }
  if (!reduced) gsap.from('.medal', { y: 40, opacity: 0, duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.medals', start: 'top 84%' } });

  // The certificates turn in a tilted ring as you scroll past, on every screen (phones get smaller cards).
  // Oracle, AWS and Infosys ride alone at first; at 70% the ring springs open and the other two join.
  // Every card that has a certificate glows and opens, front or back.
  mm.add({ motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
    if (!ctx.conditions.motion) return;
    const ring = $('.ring');
    const list = $('.ring__list');
    const items = $$('.ring__list > li');
    if (!ring || !list || !items.length) return;
    const lead = items.filter((li) => li.dataset.tier !== 'minor');
    const order = [...lead, ...items.filter((li) => li.dataset.tier === 'minor')];
    const nA = lead.length, nB = order.length;
    ring.classList.add('is-3d');
    // the back of every card: its issuer, large, and the same link
    const backs = order.map((li) => {
      const front = li.querySelector('.cert');
      const isLink = front.tagName === 'A';
      const back = document.createElement(isLink ? 'a' : 'div');
      back.className = 'cert__back';
      back.setAttribute('aria-hidden', 'true');
      if (isLink) { back.href = front.href; back.target = '_blank'; back.rel = 'noopener'; back.tabIndex = -1; }
      back.innerHTML = `<b>${esc(front.querySelector('.cert__by').textContent)}</b><span>${esc(front.querySelector('.cert__name').textContent)}</span>${isLink ? '<i>View &nearr;</i>' : ''}`;
      li.appendChild(back);
      return back;
    });
    let w = items[0].offsetWidth;
    const morph = { m: 0 }, spin = { p: 0 };
    let want = 0;
    const reachFor = (n) => w / 2 / Math.tan(Math.PI / n) + w * 0.2;
    const turn = () => {
      const m = morph.m; // back.out overshoots a little, so the ring springs open
      const mc = clamp(m, 0, 1);
      const reach = lerp(reachFor(nA), reachFor(nB), m);
      // which card faces you: the leaders share the first 70% of the scroll, the last two the rest
      const p = spin.p;
      const f = p < 0.7 ? (p / 0.7) * (nA - 1) : nA - 1 + ((p - 0.7) / 0.3) * (nB - nA);
      const a = -lerp((f * 360) / nA, (f * 360) / nB, m);
      list.style.transform = `translateZ(${(-reach).toFixed(1)}px) rotateX(-10deg) rotateY(${a.toFixed(2)}deg)`;
      order.forEach((li, k) => {
        const minor = k >= nA;
        const ang = minor ? (k * 360) / nB : lerp((k * 360) / nA, (k * 360) / nB, m);
        const show = minor ? mc : 1;
        li.style.transform = `rotateY(${ang.toFixed(2)}deg) translateZ(${reach.toFixed(1)}px) scale(${(minor ? 0.55 + 0.45 * show : 1).toFixed(3)})`;
        const c = Math.cos(((ang + a) * Math.PI) / 180);
        li.style.setProperty('--o', ((0.32 + 0.68 * Math.abs(c)) * show).toFixed(3));
        li.classList.toggle('is-away', c < 0);
        li.classList.toggle('is-out', show < 0.5);
      });
    };
    turn();
    gsap.to(spin, {
      p: 1, ease: 'none',
      onUpdate: () => {
        const next = spin.p >= 0.7 ? 1 : 0;
        if (next !== want) {
          want = next;
          gsap.to(morph, { m: next, duration: next ? 1.2 : 0.6, ease: next ? 'back.out(1.8)' : 'power2.inOut', overwrite: true, onUpdate: turn });
        }
        turn();
      },
      scrollTrigger: { trigger: ring, start: 'top 90%', end: 'bottom 10%', scrub: 0.8, onRefresh: () => { w = items[0].offsetWidth; turn(); } },
    });
    return () => {
      ring.classList.remove('is-3d');
      backs.forEach((b) => b.remove());
      items.forEach((li) => { li.style.transform = ''; li.style.removeProperty('--o'); li.classList.remove('is-away', 'is-out'); });
      list.style.transform = '';
    };
  });

  /* ---------- 05 · journey: each year fills in as you reach it, and stays ---------- */
  $$('.year').forEach((y) => {
    if (reduced) { y.classList.add('is-on'); return; }
    ScrollTrigger.create({ trigger: y, start: 'top 64%', onEnter: () => y.classList.add('is-on'), onLeaveBack: () => y.classList.remove('is-on') });
  });

  /* ---------- 06 · toolkit: split-flap line names ---------- */
  let flipTick = () => {}; // set once the sound exists
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const flaps = $$('.flap');
  const cells = Math.max(...flaps.map((f) => f.textContent.trim().length), 1);
  flaps.forEach((f) => {
    const word = f.textContent.trim();
    f.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr';
    sr.textContent = word;
    f.appendChild(sr);
    [...word.toUpperCase().padEnd(cells, ' ')].forEach((ch) => {
      const c = document.createElement('span');
      c.className = 'flap__c';
      c.dataset.ch = ch;
      c.textContent = ch;
      c.setAttribute('aria-hidden', 'true');
      f.appendChild(c);
    });
  });
  // every tile on the board flips from one clock, ~16 times a second, settling left to right row by row
  const flipAll = () => {
    const tiles = [];
    flaps.forEach((f, row) => $$('.flap__c', f).forEach((c, i) => tiles.push({ c, fin: c.dataset.ch, start: row * 220, end: row * 220 + 300 + i * 120 })));
    tiles.forEach((t) => t.c.classList.add('is-flipping'));
    const t0 = performance.now();
    let last = 0;
    const step = (now) => {
      const t = now - t0;
      if (now - last >= 60) {
        last = now;
        let busy = false;
        for (const tile of tiles) {
          if (tile.done || t < tile.start) { busy = busy || !tile.done; continue; }
          if (t >= tile.end) { tile.c.textContent = tile.fin; tile.c.classList.remove('is-flipping'); tile.done = true; continue; }
          tile.c.textContent = ALPHA[(Math.random() * ALPHA.length) | 0];
          busy = true;
        }
        if (!busy) return;
        flipTick();
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!reduced && flaps.length) {
    ScrollTrigger.create({ trigger: '.dep', start: 'top 75%', once: true, onEnter: flipAll });
    gsap.from('.dep__row', { y: 30, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.dep', start: 'top 80%' } });
  }
  // a light runs down the stops of the lines that are boarding, like a train passing through
  $$('.dep__row').forEach((row) => $$('.dep__calls span', row).forEach((c, i) => c.style.setProperty('--i', i)));
  const toolkit = $('.toolkit');
  if (toolkit) new IntersectionObserver(([e]) => toolkit.classList.toggle('is-on', e.isIntersecting)).observe(toolkit);
  const clock = $('.dep__clock');
  if (clock) {
    const now = () => { const d = new Date(); clock.innerHTML = `${String(d.getHours()).padStart(2, '0')}<i>:</i>${String(d.getMinutes()).padStart(2, '0')}`; };
    now();
    setInterval(now, 15000);
  }

  /* ---------- 07 · terminus ---------- */
  const term = $('.terminus');
  if (term) new IntersectionObserver(([e]) => term.classList.toggle('is-on', e.isIntersecting)).observe(term);
  const copy = $('.mail__copy');
  if (copy) {
    const label = copy.textContent;
    copy.addEventListener('click', async () => {
      const addr = $('.mail__addr').textContent.trim();
      let ok = false;
      try { await navigator.clipboard.writeText(addr); ok = true; } catch (e) {}
      if (!ok) {
        // the copy was refused: select the address so Ctrl+C does it
        const r = document.createRange();
        r.selectNodeContents($('.mail__addr'));
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      }
      copy.textContent = ok ? 'Copied ✓' : 'Press Ctrl+C';
      setTimeout(() => (copy.textContent = label), 2200);
    });
  }

  /* ---------- fresh on GitHub: a newly published repo shows up by itself ---------- */
  const fresh = $('.more--fresh');
  if (fresh && window.fetch) {
    const known = new Set(['quickcommerce-mi', 'broadbridge', 'upi-risk-desk', 'ner-saferoute', 'lifeline', 'krishimitra', 'global-jobs-hiring-analytics',
      'automated-deadlock-detection-tool', 'echo-voice-studio', 'deepak17kb', 'deepak17kb.github.io',
      'la_perla', 'movie-dataset-exploratory-data-analysis-eda-', 'rex-gesture-game']);
    const web = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
    const short = (s) => (s.length > 46 ? s.slice(0, 44).trim() + '…' : s);
    fetch('https://api.github.com/users/Deepak17kb/repos?per_page=100&sort=created', { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((repos) => {
        if (!Array.isArray(repos)) return;
        const add = repos
          .filter((x) => !x.fork && !x.archived && !known.has(String(x.name).toLowerCase()) && !(x.topics || []).includes('portfolio-hide'))
          .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
          .slice(0, 2);
        if (!add.length) return;
        fresh.innerHTML = add.map((x) => `<li><a href="${esc(web(x.homepage) || x.html_url)}" target="_blank" rel="noopener"><b>${esc(String(x.name).replace(/[-_]+/g, ' '))}</b><span>${esc(short(x.description || x.language || 'New on GitHub'))}</span><i aria-hidden="true">&nearr;</i></a></li>`).join('');
        ScrollTrigger.refresh();
      })
      .catch(() => {}); // offline or blocked: the list in the page stays
  }

  /* ---------- the sound of the line (off until you ask) ---------- */
  // Soft, original sounds, synthesised on the spot (nothing to download). A station arrival is a glass bell
  // with a quieter fifth above, a faint airy glide and a warm low pad, in a gentle echo. Each station has its
  // own note. The flaps tick very quietly.
  const sound = (() => {
    const btn = $('.nav__sound');
    let ac = null, on = false, out = null, echo = null, hiss = null, lastChime = 0, lastTick = 0;
    const NOTES = [440, 493.88, 554.37, 659.25, 739.99, 880, 987.77]; // A major pentatonic, one per station
    const ensure = () => {
      if (!ac) {
        const A = window.AudioContext || window.webkitAudioContext;
        if (!A) return null;
        ac = new A();
        const lim = ac.createDynamicsCompressor();
        lim.threshold.value = -24; lim.knee.value = 12; lim.ratio.value = 4; lim.attack.value = 0.01; lim.release.value = 0.4;
        lim.connect(ac.destination);
        out = ac.createGain(); out.gain.value = 0.7; out.connect(lim);
        // a soft room: one dark echo that fades quickly
        echo = ac.createGain(); echo.gain.value = 0.22;
        const dl = ac.createDelay(1.5), fb = ac.createGain(), damp = ac.createBiquadFilter();
        dl.delayTime.value = 0.42; fb.gain.value = 0.3; damp.type = 'lowpass'; damp.frequency.value = 1500;
        echo.connect(dl); dl.connect(damp); damp.connect(fb); fb.connect(dl); damp.connect(out);
        hiss = ac.createBuffer(1, Math.round(ac.sampleRate * 2), ac.sampleRate);
        const d = hiss.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      return ac;
    };
    // a glass bell: a sine whose shimmer (gentle FM) fades faster than the note
    const bell = (f, at, vol, dur = 2.4) => {
      const c = ac.createOscillator(), m = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
      c.type = 'sine'; c.frequency.value = f;
      m.type = 'sine'; m.frequency.value = f * 2;
      mg.gain.setValueAtTime(f * 0.5, at);
      mg.gain.exponentialRampToValueAtTime(f * 0.01, at + 0.8);
      m.connect(mg).connect(c.frequency);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      c.connect(g); g.connect(out); g.connect(echo);
      c.start(at); m.start(at); c.stop(at + dur + 0.05); m.stop(at + dur + 0.05);
    };
    // a warm pad: soft triangle waves, slightly detuned, behind a low filter
    const pad = (freqs, at, dur, vol) => {
      const lp = ac.createBiquadFilter(), g = ac.createGain();
      lp.type = 'lowpass'; lp.frequency.value = 850; lp.Q.value = 0.4;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + dur * 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      lp.connect(g); g.connect(out); g.connect(echo);
      freqs.forEach((f) => [-6, 6].forEach((cents) => {
        const o = ac.createOscillator();
        o.type = 'triangle'; o.frequency.value = f; o.detune.value = cents;
        o.connect(lp); o.start(at); o.stop(at + dur + 0.05);
      }));
    };
    // air: filtered noise that glides up and back down, like a train sliding in
    const air = (at, dur, vol) => {
      const src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = hiss;
      bp.type = 'bandpass'; bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(320, at);
      bp.frequency.exponentialRampToValueAtTime(1300, at + dur * 0.5);
      bp.frequency.exponentialRampToValueAtTime(450, at + dur);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + dur * 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      src.connect(bp).connect(g).connect(out);
      src.start(at); src.stop(at + dur + 0.05);
    };
    const chime = (i = 0) => {
      if (!on || !ac) return;
      const now = performance.now();
      if (now - lastChime < 700) return;
      lastChime = now;
      const t = ac.currentTime + 0.02, f = NOTES[i % NOTES.length];
      air(t, 1.1, 0.01);
      pad([f / 4, f * 3 / 8], t, 2.2, 0.01);
      bell(f, t + 0.06, 0.04);
      bell(f * 1.5, t + 0.22, 0.016);
    };
    const powerUp = () => {
      const t = ac.currentTime + 0.02;
      air(t, 1.6, 0.008);
      pad([220, 329.63, 493.88], t, 2.4, 0.012);
      bell(659.25, t + 0.35, 0.03);
    };
    const tick = () => {
      if (!on || !ac) return;
      const t = ac.currentTime;
      if (t - lastTick < 0.05) return;
      lastTick = t;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(1400 + Math.random() * 400, t);
      o.frequency.exponentialRampToValueAtTime(700, t + 0.03);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.007, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(g).connect(out);
      o.start(t); o.stop(t + 0.06);
    };
    if (btn) btn.addEventListener('click', () => {
      on = !on;
      btn.setAttribute('aria-pressed', String(on));
      if (on && ensure()) { lastChime = performance.now(); powerUp(); }
    });
    document.addEventListener('line:station', (e) => { if (lineReady) chime(e.detail ? e.detail.i : 0); });
    return { tick };
  })();
  flipTick = sound.tick;

  /* ---------- the express ride: the train takes you through every station ---------- */
  const ride = (() => {
    const toast = $('.ride');
    const nextEl = $('.ride__next');
    let on = false, timer = 0;
    const docTop = (el) => placeOf(el).getBoundingClientRect().top + window.scrollY;
    const legs = () => {
      const work = $('.work'), ring = $('.ring'), journey = $('#journey');
      const workTop = docTop(work);
      const wall = placeOf(work) !== work ? placeOf(work).offsetHeight - innerHeight : 0;
      const ringTop = docTop(ring);
      const max = ScrollTrigger.maxScroll(window);
      const smooth = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const even = (t) => t;
      return [
        { y: workTop, d: 2.2, wait: 1200, label: '02 Selected work', ease: smooth },
        { y: workTop + wall, d: 7, wait: 1400, label: '02 Selected work', ease: even },
        { y: docTop($('#about')), d: 2.6, wait: 3200, label: '03 About', ease: smooth },
        { y: docTop($('#wins')), d: 2.2, wait: 2600, label: '04 Wins', ease: smooth },
        { y: ringTop - innerHeight * 0.2, d: 2, wait: 200, label: '04 Wins', ease: smooth },
        { y: ringTop + ring.offsetHeight - innerHeight * 0.75, d: 6.5, wait: 1200, label: '04 Wins', ease: even },
        { y: docTop(journey), d: 2.2, wait: 1600, label: '05 Journey', ease: smooth },
        { y: docTop(journey) + journey.offsetHeight - innerHeight, d: 4.5, wait: 1200, label: '05 Journey', ease: even },
        { y: docTop($('#toolkit')) + 40, d: 2.2, wait: 3800, label: '06 Toolkit', ease: smooth },
        { y: docTop($('#city')) - 70, d: 2.2, wait: 6500, label: '06 Skyline', ease: smooth },
        { y: max, d: 2.6, wait: 0, label: "07 Let's talk", ease: smooth },
      ].filter((l) => l.y > window.scrollY + 10).map((l) => ({ ...l, y: Math.min(l.y, max) }));
    };
    const stopKey = (e) => { if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) stop(); };
    const listen = (add) => {
      const fn = add ? addEventListener : removeEventListener;
      fn('wheel', stop, { passive: true });
      fn('touchstart', stop, { passive: true });
      fn('keydown', stopKey);
    };
    const hide = () => {
      if (reduced) { toast.hidden = true; return; }
      gsap.to(toast, { y: 24, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: () => (toast.hidden = true) });
    };
    const stop = () => {
      if (!on) return;
      on = false;
      clearTimeout(timer);
      listen(false);
      if (lenis) { lenis.stop(); if (!locks.size && !loading) lenis.start(); } // hands the scroll straight back
      root.classList.remove('is-riding');
      hide();
    };
    const go = () => {
      if (!lenis || on) { if (!lenis) scrollToTarget('#work'); return; }
      const list = legs();
      if (!list.length) return;
      on = true;
      root.classList.add('is-riding');
      toast.hidden = false;
      gsap.fromTo(toast, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
      let i = 0;
      const leg = () => {
        if (!on) return;
        if (i >= list.length) {
          on = false;
          listen(false);
          root.classList.remove('is-riding');
          nextEl.textContent = 'Terminus. Thanks for riding';
          timer = setTimeout(hide, 2200);
          return;
        }
        const L = list[i++];
        nextEl.textContent = L.label;
        lenis.scrollTo(L.y, { duration: L.d, easing: L.ease, force: true, onComplete: () => { if (on) timer = setTimeout(leg, L.wait); } });
      };
      leg();
      setTimeout(() => { if (on) listen(true); }, 120); // the click that started the ride doesn't end it
    };
    $('.ride__off').addEventListener('click', stop);
    const routeRide = $('.route__ride');
    if (routeRide) routeRide.addEventListener('click', () => closeRoute(() => setTimeout(go, 60)));
    return { go, stop };
  })();

  // express service: number keys jump straight to a station
  addEventListener('keydown', (e) => {
    if (loading || locks.size || e.metaKey || e.ctrlKey || e.altKey || !/^[1-7]$/.test(e.key)) return;
    const t = e.target;
    if (t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable)) return;
    const el = $(`main [data-station="0${e.key}"]`);
    if (!el) return;
    e.preventDefault();
    ride.stop();
    scrollToTarget(el, { duration: 1.4 });
  });

  /* ---------- your ticket: punched when you reach the terminus ---------- */
  (() => {
    const el = $('.ticket');
    if (!el) return;
    const seenEl = $('.ticket__seen', el), timeEl = $('.ticket__time', el);
    const total = $$('main [data-station]').length;
    const visited = new Set();
    let t0 = 0, arrived = false;
    const no = String(1000 + Math.floor(Math.random() * 9000));
    $('.ticket__no span', el).textContent = 'DKB-' + no;
    $('.ticket__date', el).textContent = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    // a barcode cut from the ticket number
    const bars = [];
    let x = 0;
    [...(no + no.split('').reverse().join('') + no)].forEach((d, k) => {
      const wBar = 1 + (Number(d) % 3), gap = 1 + ((Number(d) + k) % 2);
      bars.push(`var(--carbon) ${x}px ${x + wBar}px, transparent ${x + wBar}px ${x + wBar + gap}px`);
      x += wBar + gap;
    });
    $('.ticket__bars', el).style.backgroundImage = `linear-gradient(90deg, ${bars.join(', ')})`;
    $('.ticket__bars', el).style.backgroundSize = `${x}px 100%`;
    const fmt = (ms) => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    document.addEventListener('line:ready', () => { t0 = performance.now(); }, { once: true });
    document.addEventListener('line:station', (e) => {
      visited.add(e.detail.i);
      seenEl.textContent = Math.min(total, visited.size);
      if (e.detail.last && !arrived && t0) {
        arrived = true;
        timeEl.textContent = fmt(performance.now() - t0);
        el.classList.add('is-punched');
      }
    });
    setInterval(() => { if (!arrived && t0) timeEl.textContent = fmt(performance.now() - t0); }, 1000);
    if (!reduced) gsap.from(el, { y: 80, rotation: 6, opacity: 0, duration: 1.3, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.terminus', start: 'top 45%' } });
  })();

  /* ---------- the name leans toward your cursor ---------- */
  mm.add('(min-width: 900px) and (hover: hover) and (prefers-reduced-motion: no-preference)', () => {
    const ys = nameChars.map((c) => gsap.quickTo(c, 'y', { duration: 0.7, ease: 'power3.out' }));
    const rs = nameChars.map((c) => gsap.quickTo(c, 'rotation', { duration: 0.7, ease: 'power3.out' }));
    const rest = () => { ys.forEach((f) => f(0)); rs.forEach((f) => f(0)); };
    const move = (e) => {
      if (!lineReady || window.scrollY > innerHeight * 0.6) return;
      // never more lift than the room under the chin allows
      const lift = clamp(liftRoom - 10, 0, 26);
      slots.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.6);
        const k = Math.max(0, 1 - Math.hypot(dx, dy) / 420);
        ys[i](-lift * k * k);
        rs[i](clamp(dx / 30, -4, 4) * k);
      });
    };
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', rest);
    return () => {
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', rest);
      gsap.set(nameChars, { clearProps: 'transform' });
    };
  });

  /* ---------- touch screens: a wave runs through the name now and then, and a tap sends one from where you touched ---------- */
  mm.add({ touch: '(hover: none)', motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
    if (!ctx.conditions.touch || !ctx.conditions.motion) return;
    let timer = 0, alive = true;
    const wave = (from) => {
      // the same rule as the cursor: never more lift than the room under the chin allows
      const lift = clamp(liftRoom - 10, 0, 20);
      if (!alive || !lineReady || !lift || window.scrollY > innerHeight * 0.4) return;
      nameChars.forEach((c, i) => {
        gsap.timeline({ delay: Math.abs(i - from) * 0.075 })
          .to(c, { y: -lift, rotation: clamp((i - from) * 2, -5, 5), duration: 0.22, ease: 'power2.out', overwrite: 'auto' })
          .to(c, { y: 0, rotation: 0, duration: 1.1, ease: 'elastic.out(1, 0.4)' });
      });
    };
    const loop = () => { wave(0); timer = setTimeout(loop, 6500); };
    const start = () => { if (alive) timer = setTimeout(loop, 1800); };
    if (lineReady) start(); else document.addEventListener('line:ready', start, { once: true });
    const tap = (e) => {
      if (e.target.closest('a, button')) return;
      let best = 0, bd = Infinity;
      slots.forEach((s, i) => { const r = s.getBoundingClientRect(), d = Math.abs(e.clientX - (r.left + r.width / 2)); if (d < bd) { bd = d; best = i; } });
      wave(best);
    };
    hero.addEventListener('pointerdown', tap);
    return () => {
      alive = false;
      clearTimeout(timer);
      hero.removeEventListener('pointerdown', tap);
      gsap.killTweensOf(nameChars);
      gsap.set(nameChars, { clearProps: 'transform' });
    };
  });

  /* ---------- touch screens: whatever you press squashes a little and springs back ---------- */
  // It animates the separate `scale` property, so it adds to any transform the element already has.
  if (!reduced && matchMedia('(hover: none)').matches && Element.prototype.animate) {
    let held = null, squash = null;
    const release = () => {
      if (!held) return;
      const el = held;
      held = null;
      if (squash) squash.cancel();
      el.animate([{ scale: 0.94 }, { scale: 1.04, offset: 0.35 }, { scale: 0.985, offset: 0.68 }, { scale: 1 }], { duration: 560, easing: 'ease-out' });
    };
    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      const el = e.target.closest('a, button');
      if (!el || el.closest('.preloader')) return;
      release();
      held = el;
      squash = el.animate([{ scale: 1 }, { scale: 0.94 }], { duration: 110, easing: 'ease-out', fill: 'forwards' });
    }, { passive: true });
    ['pointerup', 'pointercancel'].forEach((t) => document.addEventListener(t, release, { passive: true }));
  }

  /* ---------- measure once everything is in place ---------- */
  ScrollTrigger.addEventListener('refreshInit', fitName);
  ScrollTrigger.addEventListener('refresh', () => line.measure());
  ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitName(); ScrollTrigger.refresh(); });
  addEventListener('load', () => ScrollTrigger.refresh());
})();
