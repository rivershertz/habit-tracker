# Ascend Habit Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (chosen: Native, inline) to implement this plan task-by-task.

**Goal:** Ship a dark, gamified, beautifully animated habit tracker (smoke-free / workout / reading) on GitHub Pages with localStorage.

**Architecture:** Pure TypeScript logic layer (`src/logic`) derives streaks, XP, levels, achievements from a small persisted `State`. A reducer-backed store (`src/store`) persists to `localStorage`. A React UI (`src/ui`) renders three screens and plays celebrations from "events" emitted by dispatching actions.

**Tech Stack:** React 18, Vite, TypeScript, motion, canvas-confetti, Vitest, pnpm, GitHub Actions → Pages.

**Spec:** `docs/superpowers/specs/2026-10-07-habit-tracker-design.md`

## Global Constraints
- Dark mode only; background `#0b0b10`; accents workout `#ff7a45`, reading `#9b7bff`, smoke-free `#3ee6b0`.
- State key `ascend:v1`; dates are local `YYYY-MM-DD`; derived values never persisted.
- XP: check-in 10 + min(streak−1, 10); smoke-free day 15; perfect day +20. Level threshold(n)=round(40·(n−1)^1.6).
- pnpm only. `base: './'`. No import/export, no sound, no backend.
- Respect `prefers-reduced-motion`.

## Review Focus
- DST/timezone day boundaries → `addDays`/`toDateKey` use local calendar math, tested across DST dates.
- Corrupt / unknown-version / unavailable `localStorage` → falls back to fresh in-memory state, never throws.
- Quit start in the future or clock moved backwards → smoke-free days clamp at 0.
- Double-tap / repeat check-in → idempotent (no duplicate date, no double XP/confetti).
- Midnight rollover while app open → store ticks `now` each minute so "today" updates.

## File Structure
- `src/logic/{types,dates,streaks,smoking,xp,achievements}.ts` + `*.test.ts` — pure logic.
- `src/store/{storage,store}.ts(x)` — persistence + reducer + context.
- `src/ui/` — `App`, `TabBar`, `TopBar`, `Ring`, `HabitCard`, `SmokeCard`, `Heatmap`, `fx.ts`, `Celebrations`, screens `Today`, `Detail`, `Journey`, `Onboarding`.
- `src/styles.css`; `public/{manifest.webmanifest,sw.js,icon.svg}`; `.github/workflows/deploy.yml`.

### Task 1: Scaffold
Create `package.json` (scripts dev/build/test/preview), `vite.config.ts` (`base:'./'`, vitest jsdom-free node env), `tsconfig.json`, `index.html`, `src/main.tsx`. Install deps with pnpm. Verify `pnpm build` and `pnpm test` run. Commit.

### Task 2: Dates, types, streaks (TDD)
**Produces:** `toDateKey(d:Date):string`, `addDays(key,n):string`, `todayKey(now:number):string`, `computeStreaks(dates:string[], todayKey:string):{current:number;best:number;total:number}`, types `State`, `HabitId='workout'|'reading'`.
Tests first: consecutive streak, today-not-yet-logged keeps yesterday's streak, gap breaks, DST dates (2026-03-08, 2026-11-01 US; 2026-03-29 EU) increment by exactly one key.

### Task 3: Smoking, XP, levels (TDD)
**Produces:** `smokeFreeDays(run,now)`, `currentRun(state,now):{days,hours,minutes,ms}`, `bestRunDays`, `relapse(state,now)`, `totalXp(state,now)`, `levelForXp(xp):{level,xpIntoLevel,xpForNext,rank}`, `perfectDays`.
Tests: future start clamps 0, relapse closes run and opens new, XP formula, level thresholds, ranks.

### Task 4: Achievements (TDD)
**Produces:** `ACHIEVEMENTS` list and `evaluateAchievements(state,now):{id,title,desc,icon,unlocked,progress}[]`. Tests per category + comeback.

### Task 5: Storage + store (TDD for storage)
**Produces:** `loadState():State|null`, `saveState(s)`, reducer actions `startQuit(ts)`, `toggleCheckin(habit,key)`, `relapse(now)`, `markSeen(ids,level)`. Tests: corrupt JSON, wrong version, throwing storage, idempotent check-in. Store emits celebration events by diffing derived level/achievements before vs after.

### Task 6: Design system + Today screen
`styles.css` tokens, glass cards, tab bar, top bar with level/XP, `Ring`, `HabitCard`, `SmokeCard` with live ticking counter, Onboarding.

### Task 7: Check-in feel + FX
Spring press, ring fill, confetti at tap point in habit color, floating `+XP`, XP bar shimmer fill, count-up numbers, haptics, level-up overlay, achievement toast. Reduced-motion fallbacks.

### Task 8: Habit detail + heatmap + relapse sheet
18-week heatmap, stats, toggle past days, smoking runs list and supportive "I smoked" confirm sheet.

### Task 9: Journey screen
Level ring + rank, XP history summary, achievements grid with locked silhouettes and progress.

### Task 10: PWA + Deploy
Manifest, SW (cache-first shell), icon, GitHub Actions Pages workflow, README.

### Task 11: Verify + ship
Run tests and build; drive the app in Chrome (check-in, relapse, level-up, mobile width), fix polish issues; commit; push branch and open draft PR; enable Pages if possible.
