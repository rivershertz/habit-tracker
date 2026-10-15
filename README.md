# [Ascend](https://rivershertz.github.io/ascend/)

A dark, gamified habit tracker. Level up by showing up.

Tracks the habits **you** pick: first launch walks you through a short onboarding where you choose a look and your
goals — suggestions like Workout, Meditate or Smoke-free, or your own (name, emoji, color, and type: a **daily
check-in** you tap in, or a **quit counter** that counts up on its own until you slip) — with XP, levels, ranks,
streaks, a calendar heatmap, 50+ achievements in five rarity tiers (Common → Rare → Epic → Legendary → Mythic),
confetti and plenty of micro-interactions.

Three themes, switchable from the bottom of the Journey screen: **Glow** (the original dark neon), **Varsity**
(green felt, stitched patches, jersey-number streaks) and **Nothing** (dot-matrix numbers, a widget grid and a Glyph
strip that lights up as you log). Each theme is a stylesheet in `src/themes/` keyed off `data-theme` on `<html>`.

Everything lives in your browser's `localStorage` (key `ascend:v1`, plus `ascend:theme` for the theme). There is no
backend and no account.

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

XP: check-in = 10 + streak bonus (max +10); quit-counter free day = 15; perfect day (every habit done
that day — checked in, or a full free day) = +20.
A habit only joins the perfect-day requirement from the day it was added. Removing a habit deletes its history.

Saved data is schema `version: 3`, where a new user starts with no habits. Older data is migrated on load: users from
before v3 keep the original built-in Workout, Reading and smoke-free counter exactly as they were.
Level *n* needs `round(40·(n−1)^1.6)` total XP.

## Deploy (GitHub Pages)

1. Push this repo to GitHub.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` — `.github/workflows/deploy.yml` tests, builds and publishes.

The app uses a relative base path, so it works at `https://<user>.github.io/<repo>/` without configuration.
It's also an installable PWA (Add to Home Screen) with basic offline support.

## Data note

Because data is stored per browser, clearing site data (or using a private window) clears your progress.

## Privacy

Your habits never leave your device. The app sends anonymous usage stats to
[GoatCounter](https://www.goatcounter.com) (no cookies, no ids): one event per device per day, made of three coarse
labels — how many of the last 7 days the app was opened, how long ago it was first opened, and whether it runs
installed or in a browser tab (e.g. `active-3of7/age-1-4w/installed`). To compute them, the app keeps a short list of
recent open days in `localStorage` (`ascend:usage`), and that list stays on your device. Turn on Global Privacy
Control or Do Not Track in your browser and the app sends nothing. See `src/store/usage.ts`.

The production build ships a strict Content-Security-Policy. It allows only scripts from this site, Google Fonts, and
the GoatCounter endpoint.
