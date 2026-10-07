# Ascend — gamified habit tracker (design)

## Intent
A personal, dark-mode, gamified habit tracker. Static site on GitHub Pages, data in `localStorage`
(no backend, no import/export). Three habits: **smoke-free days**, **workout days**, **reading days**.
Gamification is a mix: calm, minimal everyday screens; game elements (XP, levels, ranks, achievements)
surfaced on a Journey screen and as celebratory moments. Lots of confetti and satisfying micro-interactions;
everything feels fun and sleek. Success = opening it daily is a pleasure, and it never loses data.

## Stack (decided autonomously)
React 18 + Vite + TypeScript, `motion` (framer-motion) for springs/layout animation, `canvas-confetti`,
Vitest for pure logic, plain CSS (custom properties, no UI kit). pnpm. Deploy via GitHub Actions to Pages,
`base: './'` so it works at any repo path. Minimal hand-written service worker + manifest (installable PWA).

## Data model (one key: `ascend:v1`)
```ts
type State = {
  version: 1;
  smokingRuns: { start: number; end?: number }[]; // epoch ms; open run (no end) = current
  checkins: { workout: string[]; reading: string[] }; // local 'YYYY-MM-DD', unique, sorted
  seenAchievements: string[]; // ids already celebrated
  seenLevel: number;          // last level celebrated
};
```
First launch with no state: user sets quit start (default "now", can pick earlier date/time) on onboarding card.
All derived values are pure functions of `(State, now)`; nothing derived is stored.

## Derived logic
- **Streaks** (workout/reading): consecutive local days ending today, or yesterday if today not yet logged
  (streak not broken until the day passes). Best streak = longest run ever.
- **Smoke-free**: completed 24h blocks of each run. Current counter shows d/h/m ticking live. Best run kept.
  Relapse closes the open run and opens a new one at "now".
- **XP**: check-in day = 10 + min(streakLenAtThatDay − 1, 10). Smoke-free completed day = 15.
  Perfect day (workout + reading + a smoke-free block label on same date) = +20.
- **Level**: cumulative threshold(n) = round(40·(n−1)^1.6). Ranks: Rookie 1–4, Challenger 5–9, Contender 10–14,
  Veteran 15–24, Master 25–39, Legend 40+.
- **Achievements** (derived, unlocked flag + progress): streak 3/7/30/100/365 for workout & reading; smoke-free
  24h/3d/7d/30d/90d/365d; first check-in each; perfect day; comeback (check-in after ≥3 day gap).

## Screens (mobile-first, bottom tab bar; centered max-width column on desktop)
1. **Today**: top bar with level chip + XP bar; hero smoke-free card (live counter, ring toward next milestone);
   workout & reading cards (streak flame, ring, big check button, undo within the day).
2. **Habit detail** (tap a card): 18-week calendar heatmap, current/best streak, total, toggle past days
   (workout/reading) ; smoking detail lists runs and holds the quiet "I smoked" action (confirm sheet,
   supportive copy, no confetti).
3. **Journey**: level ring + rank, XP to next, achievements grid (locked silhouettes with progress).

## Motion & feel
Dark near-black (#0b0b10) with subtle radial gradient, glass cards, per-habit accents (workout ember #ff7a45,
reading violet #9b7bff, smoke-free mint #3ee6b0), soft glows. Check-in: button press spring, ring fill, confetti
from tap point in habit color, "+XP" floats to XP bar, bar fills with shimmer, numbers count up, haptic
`navigator.vibrate`. Level-up: full-screen overlay + big confetti. Achievement: toast with shine sweep.
Tab/page transitions with shared-layout animation. `prefers-reduced-motion` disables confetti/large motion.
No sound.

## Testing
Vitest for date handling (incl. DST/timezones), streaks, XP, levels, achievements, smoking runs, storage
migration/corruption fallback. UI verified in a real browser. Storage failures (private mode) degrade to
in-memory state with no crash.
