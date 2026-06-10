# QbD Experiment — Interactive Visualization Site

Public-facing dashboard for the **QbD-as-E6(R3)-CtQ-Operationalization** experiment on the
fictional synthetic Phase 2b psoriasis study. Five panels: scenario diff, per-metric arm
comparison, interactive cost model, CtQ rubric heat map, layer breakdown.

This is the audience-facing companion to the methodology paper.

## File tree

```
site/
├── index.html         Landing + 5 panel anchors with smooth-scroll nav
├── methodology.html   Stub for the methods page
├── styles.css         Hand-written CSS (Graphite & Vellum design system)
├── app.js             Vanilla JS + Chart.js (loaded from CDN)
├── data/
│   └── placeholder.json  Literature-anchored placeholder data (swap in Phase 4 output)
└── README.md          This file
```

6 files. Trivially deployable to GitHub Pages.

## What each panel does

| # | Panel                         | Source data field                               | Interactivity                |
|---|-------------------------------|-------------------------------------------------|------------------------------|
| 1 | Scenario-by-scenario diff     | `scenarios[]`                                   | Family filter (chip row)     |
| 2 | Per-metric arm comparison     | `metrics[]` (M1-M6) with error bars             | Tooltips                     |
| 3 | Interactive cost model        | `cost_defaults` + live sliders                  | 4 sliders, real-time recompute |
| 4 | CtQ rubric heat map           | `rubric.trad_scores` / `rubric.qbd_scores`      | Side-by-side both arms       |
| 5 | Scenario family / layer breakdown | `layer_breakdown`                           | Grouped bar (TRAD vs QbD)    |

## Local preview

The site uses `fetch('data/placeholder.json')`. Some browsers block `fetch` on `file://`
URLs, so prefer a tiny HTTP server:

```sh
cd ~/the synthetic sponsor/qbd_experiment/viz/site
python3 -m http.server 8765 --bind 127.0.0.1
# open http://127.0.0.1:8765/
```

If you must open `index.html` from `file://`, the page shows an inline error banner
explaining why.

## Swapping in real Phase 4 data

After Phase 4 (simulation harness + scoring), regenerate `data/placeholder.json` from
the simulator output and **keep the same schema**. Schema is fully documented inline
inside the JSON. App.js reads only the documented keys; no other code changes needed.

Key fields:

- `headline_stats[]` — 4-5 tiles on hero
- `metrics[]` — array of `{id, name, trad, trad_err, qbd, qbd_err, unit, source}`
- `scenarios[]` — array of `{id, family, title, source, trad, qbd, qbd_path}` where
  `trad`/`qbd` are one of `amendment | monitor | no-action`
- `rubric.trad_scores` / `rubric.qbd_scores` — 8x4 arrays of integers 0-3
- `layer_breakdown.trad_amendments` / `qbd_amendments` — 3-element arrays
- `cost_defaults` — Tufts/Getz anchor values

After Phase 4 you may want to rename `placeholder.json` to `results.json` and update
the `fetch()` call in `app.js`.

## Deploy to GitHub Pages

The simplest path. Two routes:

### Route A — project subfolder

If the paper repo lives at `github.com/<user>/qbd_experiment`:

```sh
# from the repo root
git add viz/site
git commit -m "viz: ship interactive results dashboard"
git push origin main
```

Then in repo Settings → Pages → Source = `Deploy from branch`, branch = `main`,
folder = `/viz/site`. URL becomes `https://<user>.github.io/qbd_experiment/`.

### Route B — dedicated repo (recommended)

```sh
cd ~/the synthetic sponsor/qbd_experiment/viz/site
git init
git add .
git commit -m "init: QbD experiment viz site"
git branch -M main
git remote add origin https://github.com/<user>/qbd-experiment-viz.git
git push -u origin main
```

Then Settings → Pages → Source = `Deploy from branch`, branch = `main`, folder = `/`.
URL: `https://<user>.github.io/qbd-experiment-viz/`.

No build step required. No CI required. Push and it ships.

## Design language

Sibling to `~/the synthetic sponsor/website/public/` (the "Graphite & Vellum" system). Deep-blue
(`#0b4a6f`) brand, teal (`#14b8a6`) accent, Inter for body, JetBrains Mono for numbers
and IDs. Soft shadows, 14 px border radius. Trad arm is rendered in amber (`#b45309`)
to read as warm-but-not-alarming; QbD arm is the brand blue.

## Charter notes

- Synthetic-data disclaimer in footer of every page.
- No emojis.
- No forbidden real-employer tokens (the Charter Rule 1 blocklist is enforced upstream
  by the `pj-charter-enforcer` skill before publication).
- No monetization CTAs.

## External deps

- [Chart.js 4.4.1](https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js) (CDN)
- [Inter](https://fonts.google.com/specimen/Inter) + [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (Google Fonts CDN)

That's it. No npm, no bundler, no Tailwind CDN, no React.
