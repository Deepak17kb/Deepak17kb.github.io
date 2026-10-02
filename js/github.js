/* =========================================================
   Live from GitHub — real public push events, nothing invented.
   Shared by the footer strip and the terminal's `git log`.
   Cached for 10 minutes per tab (the public API allows 60 calls/hour).
   ========================================================= */
(() => {
  const USER = 'Deepak17kb';
  const KEY = 'dkb-gh-pushes';
  const TTL = 10 * 60 * 1000;
  let inflight = null;

  function pushes() {
    try {
      const c = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (c && Date.now() - c.t < TTL) return Promise.resolve(c.d);
    } catch (e) {}
    if (inflight) return inflight;
    inflight = fetch(`https://api.github.com/users/${USER}/events/public?per_page=100`, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('GitHub ' + r.status))))
      .then((events) => {
        const d = events
          .filter((e) => e.type === 'PushEvent')
          .map((e) => ({
            repo: e.repo.name.replace(USER + '/', ''),
            sha: (e.payload.head || '').slice(0, 7),
            at: e.created_at,
            branch: (e.payload.ref || '').replace('refs/heads/', ''),
          }));
        try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d })); } catch (e) {}
        return d;
      })
      .finally(() => (inflight = null));
    return inflight;
  }

  const ago = (iso) => {
    const s = Math.max(1, (Date.now() - new Date(iso)) / 1000);
    const [n, u] = s < 60 ? [s, 'second'] : s < 3600 ? [s / 60, 'minute'] : s < 86400 ? [s / 3600, 'hour'] : [s / 86400, 'day'];
    const k = Math.floor(n);
    return `${k} ${u}${k === 1 ? '' : 's'} ago`;
  };

  window.DKB_GH = { pushes, ago, user: USER };

  /* ---------- Footer strip: last push + a 21-day activity row ---------- */
  const strip = document.querySelector('.ghlive');
  if (!strip) return;
  const load = () =>
    pushes()
      .then((list) => {
        if (!list.length) return;
        const last = list[0];
        const DAYS = 21;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const counts = new Array(DAYS).fill(0);
        list.forEach((p) => {
          const d = new Date(p.at); d.setHours(0, 0, 0, 0);
          const i = DAYS - 1 - Math.round((today - d) / 86400000);
          if (i >= 0 && i < DAYS) counts[i]++;
        });
        const inWindow = counts.reduce((a, b) => a + b, 0);
        const max = Math.max(...counts, 1);
        strip.querySelector('[data-gh-last]').textContent = `${last.repo} · ${ago(last.at)}`;
        strip.querySelector('[data-gh-count]').textContent = `${inWindow} push${inWindow === 1 ? '' : 'es'} in ${DAYS} days`;
        const bars = strip.querySelector('.ghlive__bars');
        bars.textContent = '';
        counts.forEach((c, i) => {
          const b = document.createElement('i');
          b.style.setProperty('--h', c ? 0.25 + 0.75 * (c / max) : 0.08);
          b.title = `${c} push${c === 1 ? '' : 'es'} · ${new Date(today - (DAYS - 1 - i) * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
          if (c) b.className = 'on';
          bars.appendChild(b);
        });
        strip.hidden = false;
      })
      .catch(() => {}); // offline or rate-limited: the strip just stays hidden

  // Only call the API once the footer is close
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((e) => {
      if (!e.some((x) => x.isIntersecting)) return;
      io.disconnect();
      load();
    }, { rootMargin: '600px 0px' });
    io.observe(strip.closest('footer') || document.body); // the strip itself is hidden, so it can't be observed
  } else load();
})();
