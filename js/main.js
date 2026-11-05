/* =========================================================
   Deepak Kumar Behera — Portfolio interactions
   GSAP + ScrollTrigger + Lenis. One effect: the dot.
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const EMAIL = (window.DKB_DATA && window.DKB_DATA.email) || 'deepak7521b@gmail.com';
  let lenis = null;
  let loading = false;

  /* ---------- Console hello ---------- */
  console.log(
    `%c Hey recruiter 👋 %c\nYou opened DevTools, so you clearly care about details. So do I.\n→ ${EMAIL}\n(psst: Ctrl/⌘ + K)`,
    'background:#1C3DEB;color:#fff;font:600 14px/2 sans-serif;padding:2px 8px;border-radius:4px',
    'font:13px/1.6 monospace;color:inherit'
  );

  if (reduced) $$('svg').forEach((svg) => svg.pauseAnimations && svg.pauseAnimations());

  /* ---------- Toast ---------- */
  const toastEl = $('.toast');
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-show'), 2600);
  };

  /* ---------- Scroll lock (menu, palette) ---------- */
  const locks = new Set();
  const lockScroll = (key, on) => {
    on ? locks.add(key) : locks.delete(key);
    const locked = locks.size > 0;
    if (lenis) {
      if (locked) lenis.stop();
      else if (!loading) lenis.start();
    } else {
      root.classList.toggle('is-locked', locked);
    }
  };

  /* ---------- Smooth scroll to a section ---------- */
  const scrollToTarget = (target, opts = {}) => {
    const el = target === '#top' || target === 0 ? 0 : typeof target === 'string' ? $(target) : target;
    if (el === null) return false;
    if (el && el.tagName === 'DETAILS') el.open = true;
    if (lenis) {
      lenis.scrollTo(el, { duration: 1.6, ...opts });
    } else {
      const top = el === 0 ? 0 : el.getBoundingClientRect().top + window.scrollY + (opts.offset || 0);
      window.scrollTo({ top, behavior: reduced || opts.immediate ? 'auto' : 'smooth' });
    }
    return true;
  };

  /* ---------- Theme toggle with circular reveal ---------- */
  const themeBtn = $('.theme-toggle');
  const metaTheme = $('meta[name="theme-color"]');
  const setTheme = (t, persist = true) => {
    root.setAttribute('data-theme', t);
    metaTheme.setAttribute('content', getComputedStyle(root).getPropertyValue('--night').trim());
    if (persist) try { localStorage.setItem('dkb-theme', t); } catch (e) {}
  };
  setTheme(root.getAttribute('data-theme') || 'dark', false);
  const toggleTheme = (x, y) => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || reduced) return setTheme(next);
    if (x == null) {
      const b = themeBtn.getBoundingClientRect();
      x = b.left + b.width / 2;
      y = b.top + b.height / 2;
    }
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(() => setTheme(next));
    vt.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 800, easing: 'cubic-bezier(0.76, 0, 0.24, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      })
      .catch(() => {}); // transition skipped (e.g. tab hidden) — theme is still applied
  };
  // detail === 0 means keyboard activation: grow the circle from the button itself
  themeBtn.addEventListener('click', (e) => (e.detail ? toggleTheme(e.clientX, e.clientY) : toggleTheme()));

  /* ---------- Mobile menu ---------- */
  const burger = $('.nav__burger');
  const menu = $('.menu');
  menu.inert = true;
  const toggleMenu = (open) => {
    if (open === document.body.classList.contains('menu-open')) return;
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!open));
    menu.inert = !open;
    lockScroll('menu', open);
  };
  burger.addEventListener('click', () => toggleMenu(!document.body.classList.contains('menu-open')));
  window.addEventListener('keydown', (e) => e.key === 'Escape' && toggleMenu(false));

  $$('[data-link]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      toggleMenu(false);
      if (!scrollToTarget(id)) return;
      e.preventDefault();
      // "Skip to content" should move keyboard focus, not just the viewport
      if (a.classList.contains('skip-link')) { const t = $(id); t && t.focus({ preventScroll: true }); }
    })
  );

  /* ---------- Compose an email: Gmail in a new tab, not the OS mail app ---------- */
  // mailto: hands off to whatever desktop mail client is the default (often Outlook);
  // Gmail's compose URL opens the draft in the browser with everything filled in.
  const gmailUrl = (subject = '', body = '') => {
    const q = ['view=cm', 'fs=1', `to=${EMAIL}`];
    if (subject) q.push(`su=${encodeURIComponent(subject)}`);
    if (body) q.push(`body=${encodeURIComponent(body)}`);
    return `https://mail.google.com/mail/?${q.join('&')}`;
  };
  const mailtoUrl = (subject = '', body = '') =>
    `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const compose = (subject, body) => {
    const url = gmailUrl(subject, body);
    const w = window.open(url, '_blank');
    if (w) { try { w.opener = null; } catch (e) {} }
    else window.location.href = url; // pop-up blocked: open the draft in this tab instead of losing it
  };

  /* ---------- Copy email ---------- */
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      toast('Email copied. Talk soon ✦');
    } catch (e) {
      compose();
    }
  };
  $$('[data-copy]').forEach((btn) => btn.addEventListener('click', copyEmail));

  /* ---------- Contact form → Gmail draft ---------- */
  $('#contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    compose(`Hello from ${f.get('name')} (via portfolio)`, `${f.get('message')}\n\n— ${f.get('name')}\n${f.get('email')}`);
    toast('Opening Gmail with your message ✉');
    e.target.reset();
  });

  /* ---------- Konami easter egg: coffee rain ---------- */
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let pos = 0;
  window.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = k === code[pos] ? pos + 1 : k === code[0] ? 1 : 0;
    if (pos === code.length) {
      pos = 0;
      toast('Coffee mode unlocked ☕ Caffeine levels: critical');
      coffeeRain();
    }
  });
  function coffeeRain() {
    const icons = ['☕', '☕', '💻', '✦', '☕'];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('span');
      s.className = 'rain';
      s.textContent = icons[i % icons.length];
      s.style.left = Math.random() * 100 + 'vw';
      document.body.appendChild(s);
      const dur = 2.5 + Math.random() * 2;
      if (hasGSAP && !reduced) {
        gsap.to(s, { y: innerHeight + 120, rotation: gsap.utils.random(-360, 360), duration: dur, delay: Math.random() * 1.2, ease: 'power1.in', onComplete: () => s.remove() });
      } else {
        setTimeout(() => s.remove(), 100);
      }
    }
  }

  /* ---------- Shared API for lab / terminal / palette ---------- */
  window.DKB = { toast, scrollTo: scrollToTarget, setTheme, toggleTheme, copyEmail, coffeeRain, lockScroll, gmailUrl, mailtoUrl, compose };

  /* ---------- Pause decorative loops while they're off-screen ---------- */
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach(({ target, isIntersecting }) => {
          target.classList.toggle('is-offscreen', !isIntersecting);
          const svg = target.querySelector('svg');
          if (svg && svg.pauseAnimations) isIntersecting ? svg.unpauseAnimations() : svg.pauseAnimations();
        }),
      { rootMargin: '120px' }
    );
    $$('.hero__field, .hero__status, .project__visual').forEach((el) => io.observe(el));
  }

  /* ---------- No GSAP? keep everything visible and bail ---------- */
  if (!hasGSAP || reduced) root.classList.add('no-motion');
  if (!hasGSAP) {
    $('.preloader')?.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  // Mobile address bars resize the viewport while scrolling; don't recalc on that
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------- Split text into words + chars ---------- */
  function split(el) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(' '));
            const w = document.createElement('span');
            w.className = 'word';
            [...part].forEach((ch) => {
              const c = document.createElement('span');
              c.className = 'char';
              c.textContent = ch;
              w.appendChild(c);
            });
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    // Screen readers get the phrase, not a letter-by-letter spell-out
    [...el.children].forEach((c) => c.setAttribute('aria-hidden', 'true'));
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = label;
    el.appendChild(sr);
  }
  $$('.split').forEach(split);

  /* ---------- Lenis smooth scroll ---------- */
  if (!reduced && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // The intro plays from the top, so don't restore a mid-page scroll on reload; honour #hash links instead
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const initialHash = location.hash.length > 1 ? location.hash : null;
  window.scrollTo(0, 0);

  /* ---------- Preloader → hero intro ---------- */
  // The screen fades first and the last greeting dissolves over the page; a beat later "Deepak"
  // decodes left to right out of random katakana, the full stop drops in and "Kumar Behera" fades in underneath.
  const nameChars = $$('.hero__name .char');
  const subChars = $$('.hero__sub .char');
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
  // Measured on the reference recording: screen gone by 0.15s, greeting gone by ~0.35s, decode at ~0.6s.
  const DECODE_AT = 0.6;
  const intro = () => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    const decoded = DECODE_AT + PER_LETTER * (nameChars.length + 1);
    tl.set(nameChars, { opacity: 0 }, 0) // the name area stays empty until it decodes
      .add(decode(nameChars), DECODE_AT)
      .from('.hero__dot i', { y: () => -innerHeight * 0.45, duration: 0.95, ease: 'bounce.out' }, decoded - 0.1)
      .from('.hero__dot i', { opacity: 0, duration: 0.1, ease: 'none' }, decoded - 0.1)
      .from(subChars, { opacity: 0, y: 14, duration: 0.9, stagger: 0.012, ease: 'power2.out' }, DECODE_AT + 0.4)
      .from('.hero__face', { yPercent: 6, duration: 1.8 }, 0)
      .from('.hero__who > *', { y: 18, opacity: 0, duration: 0.9, stagger: 0.1 }, decoded)
      .from('.hero__lede > *', { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.4)
      .from('.nav > *', { y: -24, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.2);
    // the suit starts to crawl out of the tie as the full stop lands
    tl.call(() => document.dispatchEvent(new Event('dkb:intro')), null, decoded);
    return tl;
  };

  const finishLoading = () => {
    loading = false;
    document.body.classList.remove('is-loading');
    if (lenis && !locks.size) lenis.start();
    if (initialHash) {
      try { scrollToTarget(initialHash, { duration: 1.2 }); } catch (e) {} // bad selector in the URL
    }
  };

  const preloader = $('.preloader');
  if (reduced || !preloader) {
    preloader?.remove();
    finishLoading();
  } else {
    loading = true;
    document.body.classList.add('is-loading');
    lenis && lenis.stop();
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
    // the screen goes first and the page shows through; the last greeting takes the page's ink
    // (readable on the light theme too), then dissolves: fade, a little blur, a slight grow
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

  /* ---------- Nav: clear over the hero, solid after it, out of the way while reading down ---------- */
  const nav = $('.nav');
  ScrollTrigger.create({
    start: 'top -120',
    end: 'max',
    onUpdate: (self) => {
      nav.classList.toggle('is-hidden', self.direction === 1 && !document.body.classList.contains('menu-open'));
      nav.classList.toggle('is-solid', self.scroll() > 120);
    },
    onLeaveBack: () => nav.classList.remove('is-solid', 'is-hidden'),
  });

  /* ---------- Active section in the nav ---------- */
  const navLinks = $$('.nav__links a');
  const sectionIds = navLinks.map((a) => a.getAttribute('href'));
  const setActive = (id) => navLinks.forEach((a) => {
    const on = a.getAttribute('href') === id;
    a.classList.toggle('is-active', on);
    on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
  });
  // a section is current from the moment its top crosses 55% of the screen until the next one's does
  sectionIds.forEach((id, i) => {
    const sec = $(id);
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 55%',
      onEnter: () => setActive(id),
      onLeaveBack: () => setActive(i ? sectionIds[i - 1] : null),
    });
  });

  /* ---------- Journey accordions: animate open / close ---------- */
  const refreshSoon = gsap.delayedCall(0.15, () => ScrollTrigger.refresh()).pause();
  $$('.row').forEach((row) => {
    row.addEventListener('toggle', () => refreshSoon.restart(true));
    if (reduced) return;
    const body = $('.row__body', row);
    $('summary', row).addEventListener('click', (e) => {
      e.preventDefault();
      const closing = row.classList.contains('is-closing');
      if (!row.open || closing) {
        if (!row.open) gsap.set(body, { height: 0, opacity: 0 });
        row.classList.remove('is-closing');
        row.open = true;
        gsap.to(body, { height: 'auto', opacity: 1, duration: 0.7, ease: 'expo.out', overwrite: true, onComplete: () => gsap.set(body, { clearProps: 'height' }) });
      } else {
        row.classList.add('is-closing');
        gsap.to(body, {
          height: 0, opacity: 0, duration: 0.5, ease: 'expo.inOut', overwrite: true,
          onComplete: () => {
            row.classList.remove('is-closing');
            row.open = false;
            gsap.set(body, { clearProps: 'height,opacity' });
          },
        });
      }
    });
  });

  /* ---------- Recalculate once fonts and images settle ---------- */
  // one debounced recalculation, not one per event (each is a full-page layout)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => refreshSoon.restart(true));
  window.addEventListener('load', () => refreshSoon.restart(true));

  document.addEventListener('dkb:work-changed', () => refreshSoon.restart(true));
  if (reduced) return;

  const holo = window.DKB_HOLO;
  const suit = window.DKB_SUIT;

  // a hexagon that fully covers everything within `reach` of its centre
  const hexClip = (cx, cy, reach) => {
    const r = reach / 0.866;
    const corners = [0, 1, 2, 3, 4, 5].map((i) => {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      return `${(cx + r * Math.cos(a)).toFixed(1)}px ${(cy + r * Math.sin(a)).toFixed(1)}px`;
    });
    return `polygon(${corners.join(', ')})`;
  };

  // wrap each word of a text, leaving tags like <em> in place, so words can light up one at a time
  const wordsOf = (el) => {
    const walk = (node) => [...node.childNodes].forEach((c) => {
      if (c.nodeType === 1) return walk(c);
      if (c.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(' '));
        const w = document.createElement('span');
        w.className = 'w';
        w.textContent = part;
        frag.appendChild(w);
      });
      c.replaceWith(frag);
    });
    walk(el);
    return $$('.w', el);
  };

  /* ---------- The opening: the suit folds into the tie, runs to the full stop, the dot opens, the words light up ---------- */
  const opening = $('.opening');
  const dot = $('.hero__dot');
  const sheet = $('.statement');
  const sheetBg = $('.statement__bg');
  const sheetText = $('.statement__text');
  const sheetWords = wordsOf($('.statement__text'));
  gsap.matchMedia().add('(min-height: 521px)', () => {
    opening.classList.add('is-bloom');
    $('main').classList.add('has-bloom');
    const pour = { p: 0 };
    const grow = { p: 0 };
    let x = 0, y = 0, far = 0;
    const measure = () => {
      const box = opening.getBoundingClientRect();
      const d = dot.getBoundingClientRect();
      x = d.left + d.width / 2 - box.left;
      y = d.top + d.height / 2 - box.top;
      far = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y)) + 2;
    };
    const paint = () => {
      sheetBg.style.clipPath = hexClip(x, y, far * grow.p);
      sheetText.style.visibility = grow.p < 1 ? 'hidden' : '';
      if (suit) suit.retract(Math.min(1, pour.p / 0.62));
      if (holo) holo.collapse(Math.max(0, (pour.p - 0.42) / 0.58), Math.max(0, 1 - grow.p * 7));
    };
    measure();
    paint();
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: opening, start: 'top top', end: '+=300%', pin: true, scrub: true, anticipatePin: 1, refreshPriority: 1,
        onRefresh: () => { measure(); paint(); },
      },
    });
    tl.to(pour, { p: 1, duration: 0.14, ease: 'power2.in', onUpdate: paint }, 0)
      .to('.hero__dot i', { scale: 1.7, duration: 0.05, ease: 'power2.in' }, 0.09)
      .to(grow, { p: 1, duration: 0.27, ease: 'power3.in', onUpdate: paint }, 0.13)
      .set('.hero', { autoAlpha: 0 }, 0.41)
      .fromTo(sheetWords, { opacity: 0.34 }, { opacity: 1, duration: 0.02, stagger: 0.22 / sheetWords.length }, 0.42)
      // the last 100vh: Work slides up over the colour screen, which sinks back
      .to(sheet, { scale: 0.9, duration: 0.33 }, 0.67)
      .to(sheetBg, { borderRadius: 36, duration: 0.33 }, 0.67);
    return () => {
      opening.classList.remove('is-bloom');
      $('main').classList.remove('has-bloom');
      sheetBg.style.clipPath = '';
      sheetText.style.visibility = '';
      if (holo) holo.collapse(0, 1);
      if (suit) suit.retract(0);
    };
  });

  /* ---------- The cloud's path down the page ---------- */
  if (holo) {
    ScrollTrigger.create({ trigger: '.work', start: 'top 78%', onEnter: () => holo.go('stars'), onLeaveBack: () => holo.hero() });
    ScrollTrigger.create({ trigger: '.about', start: 'top 60%', onEnter: () => holo.go('stars') });
    ScrollTrigger.create({
      trigger: '.wins__stage', start: 'top 74%', end: 'bottom 12%',
      onToggle: (self) => holo.go(self.isActive ? 'winner' : 'stars', self.isActive ? $('.wins__stage') : null),
    });
    // the Lab needs a clear view
    ScrollTrigger.create({ trigger: '.lab', start: 'top 72%', onEnter: () => holo.go('stars', null, { alpha: 0 }), onLeaveBack: () => holo.go('stars') });
  }

  /* ---------- ...and the dot comes back: it rises over Contact and opens one last time ---------- */
  const contact = $('#contact');
  const sun = { r: 0 };
  const sunFar = () => Math.hypot(contact.offsetWidth / 2, Math.max(0, contact.offsetHeight - innerHeight * 0.16)) + 2;
  const paintSun = () => {
    contact.classList.toggle('is-rising', sun.r < 1);
    contact.style.clipPath = sun.r < 1 ? hexClip(contact.offsetWidth / 2, innerHeight * 0.16, sun.r * sunFar()) : '';
  };
  paintSun();
  gsap.to(sun, { r: 1, ease: 'power2.in', onUpdate: paintSun, scrollTrigger: { trigger: contact, start: 'top 74%', end: 'top top', scrub: true } });

  /* ---------- Stat counters ---------- */
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const o = { v: 0 };
    el.textContent = o.v.toFixed(dec) + suffix; // HTML holds the real value for no-JS / reduced motion
    gsap.to(o, {
      v: end, duration: 1.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: () => (el.textContent = o.v.toFixed(dec) + suffix),
    });
  });

  /* ---------- Headings: the letters climb out as they come up the screen ---------- */
  const climb = (title) => {
    if (!$('.char', title)) split(title);
    gsap.from($$('.char', title), { yPercent: 118, rotate: 7, ease: 'none', stagger: 0.03, scrollTrigger: { trigger: title, start: 'top 94%', end: 'top 58%', scrub: 0.5 } });
  };
  $$('.big-title, .contact__title').forEach(climb);

  /* ---------- Projects: title, numbers and text arrive; the visual holds still beside them ---------- */
  const rise = (targets, trigger, vars = {}) =>
    gsap.from(targets, { y: 22, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger, start: 'top 86%', once: true }, ...vars });
  const countUp = (el) => {
    const m = /^([\d,]*\.?\d+)(.*)$/.exec(el.textContent.trim());
    if (!m) return;
    const final = el.textContent;
    const end = parseFloat(m[1].replace(/,/g, ''));
    const dec = (m[1].split('.')[1] || '').length;
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 1.5, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 84%', once: true },
      onUpdate: () => (el.textContent = (m[1].includes(',') ? Math.round(o.v).toLocaleString('en-US') : o.v.toFixed(dec)) + m[2]),
      onComplete: () => (el.textContent = final),
    });
  };
  const staged = new WeakSet();
  const stageProjects = () => $$('.project').forEach((project) => {
    if (staged.has(project)) return;
    staged.add(project);
    const title = $('.project__title', project);
    if (!$('.char', title)) split(title);
    gsap.from($$('.char', title), { yPercent: 112, duration: 0.9, stagger: 0.018, ease: 'power4.out', scrollTrigger: { trigger: title, start: 'top 84%', toggleActions: 'play none none reverse' } });
    rise($$('.project__info > *:not(.project__title)', project), project, { scrollTrigger: { trigger: $('.project__info', project), start: 'top 84%', once: true } });
    $$('.project__metrics strong', project).forEach(countUp);
    if (!holo) rise($('.project__visual', project), project, { y: 32 });
    ScrollTrigger.create({
      trigger: project, start: 'top 56%', end: 'bottom 44%',
      onToggle: (self) => {
        project.classList.toggle('is-active', self.isActive);
        if (holo && self.isActive) holo.go(project.dataset.holo || 'stars', $('.project__visual', project));
      },
    });
  });
  stageProjects();
  document.addEventListener('dkb:work-changed', stageProjects);

  /* ---------- About: the story lights up word by word ---------- */
  $$('.about__story p').forEach((p) => {
    gsap.fromTo(wordsOf(p), { opacity: 0.34 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 56%', scrub: 0.4 } });
  });
  gsap.from('.stat', { y: 46, opacity: 0, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: '.about__stats', start: 'top 90%', end: 'top 60%', scrub: 0.5 } });

  /* ---------- Journey: a line draws down the years ---------- */
  gsap.fromTo('.rows', { '--grow': 0 }, { '--grow': 1, ease: 'none', scrollTrigger: { trigger: '.rows', start: 'top 72%', end: 'bottom 62%', scrub: 0.5 } });
  gsap.from('.row', { x: -36, opacity: 0, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: '.rows', start: 'top 86%', end: 'bottom 74%', scrub: 0.5 } });
  gsap.from('.skills__col', { y: 36, opacity: 0, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.skills', start: 'top 92%', end: 'top 66%', scrub: 0.5 } });

  /* ---------- Wins slide in from either side ---------- */
  $$('.win').forEach((win, i) => {
    gsap.from(win, { x: i % 2 ? 90 : -90, opacity: 0, ease: 'none', scrollTrigger: { trigger: win, start: 'top 96%', end: 'top 74%', scrub: 0.5 } });
  });
  gsap.from('.certs li', { x: 40, opacity: 0, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: '.certs', start: 'top 90%', end: 'center 60%', scrub: 0.5 } });

  /* ---------- The Lab grows up to full size ---------- */
  gsap.from('.lab__app', { scale: 0.84, y: 60, ease: 'none', scrollTrigger: { trigger: '.lab__app', start: 'top 98%', end: 'top 34%', scrub: 0.5 } });

  /* ---------- Giant words: two rows slide past each other as they cross the screen ---------- */
  $$('.marquee__row').forEach((row, k) => {
    gsap.fromTo(row, { xPercent: k ? -18 : 0 }, { xPercent: k ? 0 : -22, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: 0.4 } });
  });

  /* ---------- More builds: the two lists become one deck of cards that bends past as you scroll ---------- */
  const after = $('.work__after');
  let rebuildDeck = null;
  gsap.matchMedia().add('(min-width: 861px) and (min-height: 600px)', () => {
    let deck = null, tween = null;
    const make = () => {
      if (tween) { tween.scrollTrigger.kill(); tween.kill(); }
      if (deck) deck.remove();
      const items = $$('.more a', after).map((a) => ({
        href: a.href, name: $('.more__name', a)?.textContent || '', blurb: $('em', a)?.textContent || '',
        meta: $('.more__meta', a)?.textContent || '', live: !!a.closest('.more--live'),
      }));
      if (items.length < 3) { root.classList.remove('has-deck'); return; }
      deck = document.createElement('div');
      deck.className = 'deck';
      deck.innerHTML = `<div class="deck__head"><h3 class="work__sub">More I've built</h3><p class="deck__hint">${items.length} more projects, keep scrolling</p></div><div class="deck__track"></div>`;
      const track = $('.deck__track', deck);
      items.forEach((it) => {
        const a = document.createElement('a');
        a.className = 'deck__card' + (it.live ? ' is-live' : '');
        a.href = it.href; a.target = '_blank'; a.rel = 'noopener';
        a.innerHTML = '<span class="deck__kicker"></span><span class="deck__name"></span><span class="deck__foot"><span></span><i aria-hidden="true">↗</i></span>';
        $('.deck__kicker', a).textContent = it.live ? `Live from GitHub${it.meta ? ' · ' + it.meta.replace(/^[^·]*·\s*/, '') : ''}` : 'Also built';
        $('.deck__name', a).textContent = it.name;
        $('.deck__foot span', a).textContent = it.blurb;
        track.appendChild(a);
      });
      after.appendChild(deck);
      root.classList.add('has-deck');
      const cards = $$('.deck__card', track);
      let lefts = [], width = 0;
      const measure = () => {
        width = cards[0].offsetWidth;
        const pad = innerWidth / 2 - width / 2; // the first card starts in the middle, the last one ends there
        track.style.paddingLeft = track.style.paddingRight = pad + 'px';
        lefts = cards.map((c) => c.offsetLeft);
      };
      // each card turns away and sinks back the further it is from the middle, as if the row ran round a drum
      const bend = () => {
        const x = gsap.getProperty(track, 'x'), mid = innerWidth / 2;
        cards.forEach((c, k) => {
          const d = (x + lefts[k] + width / 2 - mid) / mid;
          c.style.transform = `rotateY(${(-d * 32).toFixed(2)}deg) translateZ(${(-Math.min(1.4, Math.abs(d)) * 170).toFixed(1)}px)`;
          c.style.opacity = (1 - Math.min(0.7, Math.abs(d) * 0.45)).toFixed(3);
          c.classList.toggle('is-front', Math.abs(d) < 0.2);
        });
      };
      measure();
      tween = gsap.to(track, {
        x: () => -(track.scrollWidth - innerWidth), ease: 'none', onUpdate: bend,
        scrollTrigger: { trigger: deck, start: 'top top', end: () => '+=' + Math.max(innerHeight, track.scrollWidth - innerWidth), pin: true, scrub: 0.6, invalidateOnRefresh: true, refreshPriority: 1, onRefresh: () => { measure(); bend(); } },
      });
      bend();
    };
    make();
    rebuildDeck = () => { make(); ScrollTrigger.refresh(); };
    return () => {
      if (tween) { tween.scrollTrigger.kill(); tween.kill(); }
      if (deck) deck.remove();
      root.classList.remove('has-deck');
      rebuildDeck = null;
    };
  });
  document.addEventListener('dkb:repos', () => rebuildDeck && rebuildDeck());

  /* ---------- Certifications: a ring of cards that turns one card per step as you scroll ---------- */
  gsap.matchMedia().add('(min-width: 861px) and (min-height: 600px)', () => {
    const certs = $('.certs');
    const list = $$('li', certs);
    if (list.length < 3) return;
    const ring = document.createElement('div');
    ring.className = 'ring';
    ring.innerHTML = `<div class="ring__head"><span class="ring__count">${String(list.length).padStart(2, '0')}</span><h3 class="work__sub">Certifications</h3></div><div class="ring__spin"></div>`;
    const spin = $('.ring__spin', ring);
    list.forEach((li) => {
      const link = $('a', li);
      const card = document.createElement(link ? 'a' : 'div');
      card.className = 'ring__card';
      if (link) { card.href = link.href; card.target = '_blank'; card.rel = 'noopener'; }
      const by = ($('.certs__by', li)?.textContent || '').split('·');
      card.innerHTML = '<span class="ring__by"></span><span class="ring__name"></span><span class="ring__foot"><span></span><i aria-hidden="true"></i></span>';
      $('.ring__by', card).textContent = by[0].trim();
      $('.ring__name', card).textContent = ($('.certs__name', li)?.textContent || '').replace('↗', '').trim();
      $('.ring__foot span', card).textContent = by.slice(1).join('·').trim();
      $('.ring__foot i', card).textContent = link ? 'View ↗' : '';
      spin.appendChild(card);
    });
    certs.appendChild(ring);
    root.classList.add('has-ring');
    const cards = $$('.ring__card', spin), n = cards.length, step = 360 / n;
    let reach = 0;
    const place = () => {
      const w = cards[0].offsetWidth;
      reach = w / 2 / Math.tan(Math.PI / n) + w * 0.16;
      cards.forEach((c, k) => { c.style.transform = `rotateY(${k * step}deg) translateZ(${reach.toFixed(1)}px)`; });
    };
    const turn = { a: 0 };
    const show = () => {
      spin.style.transform = `translateZ(${(-reach).toFixed(1)}px) rotateX(-9deg) rotateY(${turn.a.toFixed(2)}deg)`;
      cards.forEach((c, k) => {
        const facing = Math.cos(((k * step + turn.a) * Math.PI) / 180);
        c.style.opacity = (0.3 + 0.7 * Math.max(0, facing)).toFixed(3);
        c.classList.toggle('is-front', facing > Math.cos((step / 2) * (Math.PI / 180)));
      });
    };
    place();
    show();
    const tween = gsap.to(turn, {
      a: -(360 - step), ease: 'none', onUpdate: show,
      scrollTrigger: { trigger: ring, start: 'top top', end: () => '+=' + innerHeight * 1.6, pin: true, scrub: 0.6, refreshPriority: 1, onRefresh: () => { place(); show(); } },
    });
    return () => { tween.scrollTrigger.kill(); tween.kill(); ring.remove(); root.classList.remove('has-ring'); };
  });

  rise('.contact__left > *', '.contact__grid');
  rise('.coffee', '.contact__grid');
})();
