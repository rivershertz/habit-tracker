# Ascend

A dark, gamified habit tracker. Level up by showing up.

Tracks three habits — **days smoke-free**, **workout days**, **reading days** — with XP, levels, ranks,
streaks, a calendar heatmap, achievements, confetti and plenty of micro-interactions.

Everything lives in your browser's `localStorage` (key `ascend:v1`). There is no backend and no account.

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # unit tests for the logic layer
pnpm build      # type-check + production build into dist/
```

## How it works

- `src/logic` — pure functions: dates, streaks, smoke-free runs, XP/levels, achievements. All derived values
  are computed from the small persisted state, never stored, so editing history can't desync anything.
- `src/store` — reducer, `localStorage` persistence (validates and repairs whatever it reads), React provider.
- `src/ui` — screens (Today, Journey, habit detail, onboarding), celebrations and FX.

XP: check-in = 10 + streak bonus (max +10); smoke-free day = 15; perfect day (all three) = +20.
Level *n* needs `round(40·(n−1)^1.6)` total XP.

## Deploy (GitHub Pages)

1. Push this repo to GitHub.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` — `.github/workflows/deploy.yml` tests, builds and publishes.

The app uses a relative base path, so it works at `https://<user>.github.io/<repo>/` without configuration.
It's also an installable PWA (Add to Home Screen) with basic offline support.

## Data note

Because data is stored per browser, clearing site data (or using a private window) clears your progress.
