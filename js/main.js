/* =========================================================
   Deepak Kumar Behera — Portfolio interactions
   GSAP + ScrollTrigger + Lenis
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const EMAIL = (window.DKB_DATA && window.DKB_DATA.email) || 'deepak7521b@gmail.com';
  let lenis = null;
  let loading = false;

  /* ---------- Console hello ---------- */
  console.log(
    `%c Hey recruiter 👋 %c\nYou opened DevTools, so you clearly care about details. So do I.\n→ ${EMAIL}\n(psst: Ctrl/⌘ + K)`,
    'background:#FF4A1C;color:#fff;font:600 14px/2 sans-serif;padding:2px 8px;border-radius:4px',
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
    if (lenis) {
      lenis.scrollTo(el, { duration: 1.6, ...opts });
    } else {
      const top = el === 0 ? 0 : el.getBoundingClientRect().top + window.scrollY + (opts.offset || 0);
      window.scrollTo({ top, behavior: reduced || opts.immediate ? 'auto' : 'smooth' });
    }
    return true;
  };

  /* ---------- Clock (IST) ---------- */
  const clockEls = $$('[data-clock]');
  const clockFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const tick = () => {
    const t = clockFmt.format(new Date());
    clockEls.forEach((el) => (el.textContent = t));
  };
  tick();
  setInterval(tick, 15000);

  /* ---------- Nav link hover (text swap) ---------- */
  $$('.nav__links a').forEach((a) => {
    a.dataset.text = a.textContent;
    a.innerHTML = `<span>${a.textContent}</span>`;
  });

  /* ---------- Theme toggle with circular reveal ---------- */
  const themeBtn = $('.theme-toggle');
  const metaTheme = $('meta[name="theme-color"]');
  const setTheme = (t, persist = true) => {
    root.setAttribute('data-theme', t);
    metaTheme.setAttribute('content', t === 'dark' ? '#0F0E0D' : '#EEE9DF');
    if (persist) try { localStorage.setItem('dkb-theme', t); } catch (e) {}
  };
  setTheme(root.getAttribute('data-theme') || 'light', false);
  // Follow the OS theme until the visitor picks one explicitly
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    let saved = null;
    try { saved = localStorage.getItem('dkb-theme'); } catch (err) {}
    if (!saved) setTheme(e.matches ? 'dark' : 'light', false);
  });
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
      if (scrollToTarget(id)) e.preventDefault();
    })
  );

  /* ---------- Copy email ---------- */
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      toast('Email copied. Talk soon ✦');
    } catch (e) {
      window.location.href = `mailto:${EMAIL}`;
    }
  };
  $$('[data-copy]').forEach((btn) => btn.addEventListener('click', copyEmail));

  /* ---------- Contact form → mailto ---------- */
  $('#contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const subject = encodeURIComponent(`Hello from ${f.get('name')} (via portfolio)`);
    const body = encodeURIComponent(`${f.get('message')}\n\n— ${f.get('name')}\n${f.get('email')}`);
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
    toast('Opening your mail app ✉');
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
      toast('Chai mode unlocked ☕ Caffeine levels: critical');
      coffeeRain();
    }
  });
  function coffeeRain() {
    const icons = ['☕', '🫖', '💻', '✦', '☕'];
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
  window.DKB = { toast, scrollTo: scrollToTarget, setTheme, toggleTheme, copyEmail, coffeeRain, lockScroll };

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
    $$('.project__visual, .badge, .card--gold, .coffee, .portrait').forEach((el) => io.observe(el));
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

  // Word-only split for the manifesto
  const manifesto = $('.reveal-words');
  if (manifesto) {
    manifesto.innerHTML = manifesto.textContent.trim().split(/\s+/).map((w) => `<span class="word">${w}</span>`).join(' ');
  }

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
  const heroChars = $$('[data-hero] .char');
  const intro = () => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from(heroChars, { yPercent: 115, rotate: 6, duration: 1.4, stagger: 0.04 })
      .from('.hero__meta > *', { y: 20, opacity: 0, duration: 1, stagger: 0.08 }, 0.3)
      .from('.hero__plane', { scaleX: 0, duration: 1.4, ease: 'expo.inOut' }, 0.2)
      .from('.hero__cutout', { yPercent: 14, autoAlpha: 0, duration: 2, clearProps: 'opacity,visibility' }, 0.4)
      .from('.hero .fade-up', { y: 40, opacity: 0, duration: 1.2, stagger: 0.12 }, 0.7)
      .from('.badge', { scale: 0, rotate: -180, duration: 1.4 }, 0.8)
      .from('.nav > *', { y: -30, opacity: 0, duration: 1, stagger: 0.08 }, 0.5);
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
    // Full count-up on the first visit, a quick one on reloads in the same session
    let seen = false;
    try { seen = sessionStorage.getItem('dkb-seen') === '1'; sessionStorage.setItem('dkb-seen', '1'); } catch (e) {}
    const counter = { v: 0 };
    const words = ['Compiling ideas', 'Running Dijkstra', 'Brewing chai', 'Ready'];
    const numEl = $('.preloader__num');
    const wordEl = $('.preloader__word');
    let lastWord = 0;
    // Impatient? Any click or key fast-forwards the loader
    const skip = () => pre.timeScale(4);
    const pre = gsap.timeline()
      .to(counter, {
        v: 100, duration: seen ? 0.6 : 1.6, ease: 'power3.inOut',
        onUpdate: () => {
          numEl.textContent = Math.round(counter.v);
          const w = Math.min(words.length - 1, Math.floor(counter.v / 34));
          if (w !== lastWord) wordEl.firstChild.textContent = words[(lastWord = w)];
        },
      })
      .to('.preloader__count, .preloader__top, .preloader__bottom', { y: -40, opacity: 0, duration: 0.5, ease: 'power2.in', stagger: 0.05 })
      .to(preloader, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '-=0.1')
      .add(() => {
        preloader.removeEventListener('pointerdown', skip);
        window.removeEventListener('keydown', skip);
        pre.timeScale(1);
        preloader.remove();
        finishLoading();
      })
      .add(intro(), '-=0.75');
    preloader.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip);
  }

  /* ---------- Hero role rotator ---------- */
  const roleWords = $$('.rotator__word');
  let ri = 0;
  // CSS pre-hides words 2..n with translateY(100%); hand control to GSAP (y:0 + yPercent)
  gsap.set(roleWords, { y: 0, yPercent: (i) => (i === 0 ? 0 : 100) });
  // delayedCall rides GSAP's ticker, so it sleeps with the tab instead of piling up
  const rotateRole = () => {
    const cur = roleWords[ri];
    ri = (ri + 1) % roleWords.length;
    const next = roleWords[ri];
    if (reduced) {
      gsap.set(cur, { yPercent: 100 });
      gsap.set(next, { yPercent: 0 });
    } else {
      gsap.to(cur, { yPercent: -100, duration: 0.8, ease: 'expo.inOut' });
      gsap.fromTo(next, { yPercent: 100 }, { yPercent: 0, duration: 0.8, ease: 'expo.inOut' });
    }
    gsap.delayedCall(2.4, rotateRole);
  };
  gsap.delayedCall(2.4, rotateRole);

  /* ---------- Scroll progress + hide nav on scroll down ---------- */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
  const nav = $('.nav');
  ScrollTrigger.create({
    start: 'top -120',
    end: 'max',
    onUpdate: (self) => nav.classList.toggle('is-hidden', self.direction === 1 && !document.body.classList.contains('menu-open')),
  });

  /* ---------- Active section in the nav ---------- */
  const navWrap = $('.nav__links');
  const navLinks = $$('a', navWrap);
  const sectionIds = navLinks.map((a) => a.getAttribute('href'));
  const setActive = (id) => {
    navLinks.forEach((a) => {
      const on = a.getAttribute('href') === id;
      a.classList.toggle('is-active', on);
      on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
    });
    navWrap.classList.toggle('has-active', !!id);
  };
  sectionIds.forEach((id, i) => {
    const sec = $(id);
    if (!sec) return;
    const next = sectionIds[i + 1] ? $(sectionIds[i + 1]) : $('.footer');
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 55%',
      endTrigger: next,
      end: 'top 55%',
      onToggle: (self) => {
        if (self.isActive) setActive(id);
        else if (i === 0 && self.direction === -1) setActive(null);
      },
    });
  });

  /* ---------- Marquee (velocity- and direction-reactive) ---------- */
  const track = $('.marquee__track');
  track.innerHTML += track.innerHTML;
  // Start deep into the repeats so scrolling up can run it backwards
  const marqueeTween = gsap.to(track, { xPercent: -50, duration: 28, ease: 'none', repeat: -1 }).totalTime(28 * 100);
  const speed = { v: 1 };
  const speedTo = gsap.quickTo(speed, 'v', { duration: 0.5, ease: 'power3', onUpdate: () => marqueeTween.timeScale(speed.v) });
  let marqueeDir = 1;
  const settle = gsap.delayedCall(0.12, () => speedTo(marqueeDir)).pause();
  ScrollTrigger.create({
    trigger: '.marquee',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => marqueeTween.paused(!self.isActive), // no point animating it off-screen
    onUpdate: (self) => {
      if (reduced) return;
      marqueeDir = self.direction;
      speedTo(marqueeDir * gsap.utils.clamp(1, 6, Math.abs(self.getVelocity()) / 300));
      settle.restart(true);
    },
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
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());

  if (reduced) return;

  /* ---------- Hero parallax out ---------- */
  gsap.to('.hero__title', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__portrait, .hero__face', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  if (finePointer) {
    const cutX = gsap.quickTo('.hero__cutout', 'x', { duration: 1.2, ease: 'power3' });
    const cutY = gsap.quickTo('.hero__cutout', 'y', { duration: 1.2, ease: 'power3' });
    $('.hero').addEventListener('pointermove', (e) => {
      cutX((e.clientX / innerWidth - 0.5) * -18);
      cutY((e.clientY / innerHeight - 0.5) * -10);
    }, { passive: true });
  }

  /* ---------- Big titles: char reveal ---------- */
  $$('.big-title, .contact__title').forEach((title) => {
    gsap.from($$('.char', title), {
      yPercent: 115, rotate: 5, duration: 1.2, ease: 'expo.out', stagger: 0.025,
      scrollTrigger: { trigger: title.closest('.work') || title, start: 'top 80%' },
    });
  });

  /* ---------- Manifesto: words light up as you scroll ---------- */
  if (manifesto) {
    gsap.fromTo($$('.word', manifesto), { opacity: 0.12 }, {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: manifesto, start: 'top 80%', end: 'bottom 45%', scrub: true },
    });
  }

  /* ---------- Stat counters ---------- */
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const o = { v: 0 };
    el.textContent = o.v.toFixed(dec) + suffix; // HTML holds the real value for no-JS / reduced motion
    gsap.to(o, {
      v: end, duration: 2.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
      onUpdate: () => (el.textContent = o.v.toFixed(dec) + suffix),
    });
  });

  // Portrait: the arch grows, the cutout pops up out of it, then the sticker slaps on
  gsap.timeline({ scrollTrigger: { trigger: '.about__grid', start: 'top 80%' } })
    .from('.portrait__arch', { scaleY: 0, transformOrigin: '50% 100%', duration: 1.2, ease: 'expo.inOut' })
    .from('.portrait__cut', { yPercent: 30, autoAlpha: 0, duration: 1.4, ease: 'expo.out' }, 0.5)
    .from('.portrait__sticker', { scale: 0, rotation: -34, duration: 1, ease: 'back.out(2)' }, 1)
    .from('.portrait__caption', { y: 20, opacity: 0, duration: 0.8, ease: 'expo.out' }, 1.1);
  gsap.from('.stat', { y: 50, opacity: 0, duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.about__stats', start: 'top 85%' } });

  /* ---------- Work: horizontal scroll on desktop ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 861px)', () => {
    const workTrack = $('.work__track');
    const panels = $$('.project', workTrack);
    const hudNum = $('.work__count b');
    const hudBar = $('.work__bar i');
    let distance = 0;
    let lefts = [];
    let shownIdx = -1;
    const measure = () => {
      distance = workTrack.scrollWidth - window.innerWidth;
      lefts = panels.map((p) => p.offsetLeft);
    };
    measure();

    const horiz = gsap.to(workTrack, {
      x: () => -distance,
      ease: 'none',
      // HUD follows the eased (scrubbed) position, not the raw scroll
      onUpdate() {
        const p = this.progress();
        hudBar.style.transform = `scaleX(${p})`;
        const centre = p * distance + window.innerWidth / 2;
        const idx = lefts.filter((l) => l <= centre).length;
        if (idx !== shownIdx) hudNum.textContent = String((shownIdx = idx)).padStart(2, '0');
      },
      scrollTrigger: {
        trigger: '.work',
        pin: true,
        scrub: 0.6,
        start: 'top top',
        end: () => '+=' + distance,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        refreshPriority: 1,
        onRefreshInit: measure,
      },
    });

    panels.forEach((panel) => {
      gsap.fromTo($('.project__visual', panel), { xPercent: 18, rotate: 4 }, {
        xPercent: -8, rotate: -2, ease: 'none',
        scrollTrigger: { trigger: panel, containerAnimation: horiz, start: 'left right', end: 'right left', scrub: true },
      });
      gsap.from($$('.project__title, .project__tag, .project__metrics li, .tags, .project__links', panel), {
        y: 60, opacity: 0, stagger: 0.06, duration: 1, ease: 'expo.out',
        scrollTrigger: { trigger: panel, containerAnimation: horiz, start: 'left 65%' },
      });
    });
  });
  mm.add('(max-width: 860px)', () => {
    $$('.project').forEach((panel) => {
      gsap.from($$('.project__visual, .project__title, .project__tag, .project__metrics, .tags, .project__links', panel), {
        y: 50, opacity: 0, stagger: 0.07, duration: 1, ease: 'expo.out',
        scrollTrigger: { trigger: panel, start: 'top 80%' },
      });
    });
  });

  /* ---------- Generic staggered reveals ---------- */
  const reveal = (selector, trigger, vars = {}) =>
    gsap.from(selector, { y: 60, opacity: 0, duration: 1.1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger, start: 'top 85%' }, ...vars });
  reveal('.row', '.rows');
  reveal('.skills__col', '.skills');
  reveal('.card', '.cards', { y: 120, rotate: 3, stagger: 0.12 });
  reveal('.cert-group', '.certs__groups', { stagger: 0.08 });
  reveal('.lab__lede', '.lab__head');
  reveal('.lab__app', '.lab__app', { y: 90 });
  reveal('.shell__intro > *, .term', '.shell', { stagger: 0.08 });
  reveal('.email, .form label, .form .btn, .socials', '.contact__grid', { stagger: 0.07 });
  reveal('.coffee', '.contact__grid', { y: 100, rotate: -3 });

  gsap.from('.footer__name', { yPercent: 60, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.footer', start: 'top 85%' } });

  /* ---------- Pointer effects (desktop only) ---------- */
  if (!finePointer) return;
  root.classList.add('has-cursor');

  // Cached rects go stale when the page scrolls
  let scrollEpoch = 0;
  window.addEventListener('scroll', () => scrollEpoch++, { passive: true });

  // Custom cursor
  const cursor = $('.cursor');
  const dot = $('.cursor__dot');
  const ring = $('.cursor__ring');
  const label = $('.cursor__label');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.1 });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.1 });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  let cursorSeen = false;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!cursorSeen) {
      cursorSeen = true;
      gsap.set([dot, ring], { x: e.clientX, y: e.clientY });
      cursor.classList.remove('is-hidden');
    }
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
  }, { passive: true });
  document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
  document.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));

  document.addEventListener('mouseover', (e) => {
    const native = e.target.closest('[data-cursor-native]');
    cursor.classList.toggle('is-native', !!native);
    if (native) return;
    const labelled = e.target.closest('[data-cursor]');
    const interactive = e.target.closest('a, button, summary, input, textarea, [role="option"]');
    if (labelled && !(interactive && labelled.contains(interactive) && interactive !== labelled)) {
      label.textContent = labelled.dataset.cursor;
      cursor.classList.add('is-label');
      cursor.classList.remove('is-hover');
    } else if (interactive) {
      cursor.classList.add('is-hover');
      cursor.classList.remove('is-label');
    } else {
      cursor.classList.remove('is-hover', 'is-label');
    }
  });

  // Magnetic elements: measure the resting centre once per hover, not on every move
  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
    let cx = 0, cy = 0, epoch = -1, back;
    const measure = () => {
      const r = el.getBoundingClientRect();
      cx = r.left + r.width / 2 - gsap.getProperty(el, 'x');
      cy = r.top + r.height / 2 - gsap.getProperty(el, 'y');
      epoch = scrollEpoch;
    };
    el.addEventListener('pointerenter', () => { back && back.kill(); measure(); });
    el.addEventListener('pointermove', (e) => {
      if (epoch !== scrollEpoch) measure();
      xTo((e.clientX - cx) * 0.35);
      yTo((e.clientY - cy) * 0.35);
    });
    el.addEventListener('pointerleave', () => {
      back = gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' });
    });
  });

  // 3D tilt + glare: one reusable tween per axis instead of a new tween per mousemove
  $$('[data-tilt]').forEach((el) => {
    gsap.set(el, { transformPerspective: 900 });
    const rxTo = gsap.quickTo(el, 'rotateX', { duration: 0.6, ease: 'power3' });
    const ryTo = gsap.quickTo(el, 'rotateY', { duration: 0.6, ease: 'power3' });
    let rect = null, epoch = -1, back;
    el.addEventListener('pointerenter', () => { back && back.kill(); rect = null; });
    el.addEventListener('pointermove', (e) => {
      if (!rect || epoch !== scrollEpoch) { rect = el.getBoundingClientRect(); epoch = scrollEpoch; }
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      ryTo((px - 0.5) * 14);
      rxTo((0.5 - py) * 14);
      el.style.setProperty('--mx', px * 100 + '%');
      el.style.setProperty('--my', py * 100 + '%');
    });
    el.addEventListener('pointerleave', () => {
      back = gsap.to(el, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
    });
  });
})();
