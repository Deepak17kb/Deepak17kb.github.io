# Deepak Kumar Behera — Portfolio

Live: **https://deepak17kb.github.io/**

An editorial-style portfolio: selected work, journey, trophy shelf, an interactive **Path Lab** (race A*, Dijkstra, BFS and Greedy best-first on a grid you draw), a **terminal** that knows everything on the page, and a **command palette** (`Ctrl/⌘ + K`).

Plain HTML/CSS/JS with no build step. GSAP + ScrollTrigger and Lenis load from CDNs.

```
index.html
css/style.css
js/data.js       profile data shared by the terminal and the palette
js/main.js       scroll, motion, theme, nav, cursor
js/lab.js        Path Lab (canvas pathfinding)
js/terminal.js   the shell
js/palette.js    Ctrl/⌘ + K command menu
assets/          portrait + CV
```

Run locally: `python -m http.server` in this folder, then open http://localhost:8000.
