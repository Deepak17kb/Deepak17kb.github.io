# Deepak Kumar Behera — Portfolio

Live: **https://deepak17kb.github.io/**

An editorial-style portfolio: selected work, journey, trophy shelf, an interactive **Path Lab** (race A*, Dijkstra, BFS and Greedy best-first on a grid you draw), a **terminal** that knows everything on the page, and a **command palette** (`Ctrl/⌘ + K`).

Plain HTML/CSS/JS with no build step. GSAP + ScrollTrigger and Lenis are vendored in `vendor/`, fonts are self-hosted in `assets/fonts/`, so the page makes no third-party requests before first paint.

Hidden extras: a printable one-page résumé (the **TL;DR**, or just press Ctrl/⌘ + P), a live GitHub activity strip, and terminal commands like `git log`, `snake` and `sudo rm -rf /`.

```
index.html
css/style.css
js/data.js       profile data shared by the terminal, palette and TL;DR
js/main.js       scroll, motion, theme, nav, cursor
js/lab.js        Path Lab (canvas pathfinding)
js/terminal.js   the shell
js/palette.js    Ctrl/⌘ + K command menu
js/hero-graph.js route-finding network behind the hero portrait
js/tldr.js       30-second summary dialog, also the print layout
js/github.js     live public push activity (footer + `git log`)
404.html         "no path found" page
vendor/          GSAP, ScrollTrigger, Lenis
assets/          portrait (AVIF/WebP sizes), fonts, icons, share card, CV
```

Run locally: `python -m http.server` in this folder, then open http://localhost:8000.
