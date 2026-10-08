import { addDays, todayKey } from './dates';
import type { SmokingRun, State } from './types';

export const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MIN_MS = 60_000;

const runMs = (run: SmokingRun, now: number) => Math.max(0, (run.end ?? now) - run.start);

export const smokeFreeDays = (run: SmokingRun, now: number) => Math.floor(runMs(run, now) / DAY_MS);

export interface CurrentRun {
  active: boolean;
  ms: number;
  days: number;
  hours: number;
  minutes: number;
}

export function currentRun(state: State, now: number): CurrentRun {
  const open = state.smokingRuns.find((r) => r.end === undefined);
  if (!open) return { active: false, ms: 0, days: 0, hours: 0, minutes: 0 };
  const ms = runMs(open, now);
  return {
    active: true,
    ms,
    days: Math.floor(ms / DAY_MS),
    hours: Math.floor((ms % DAY_MS) / HOUR_MS),
    minutes: Math.floor((ms % HOUR_MS) / MIN_MS),
  };
}

export function bestRunDays(state: State, now: number): number {
  return state.smokingRuns.reduce((best, r) => Math.max(best, smokeFreeDays(r, now)), 0);
}

const MILESTONES: [days: number, label: string][] = [
  [1, '1 day'],
  [3, '3 days'],
  [7, '1 week'],
  [14, '2 weeks'],
  [30, '1 month'],
  [60, '2 months'],
  [90, '3 months'],
  [180, '6 months'],
  [365, '1 year'],
  [730, '2 years'],
  [1095, '3 years'],
];

export interface SmokeMilestone {
  days: number;
  label: string;
  /** 0..1: share of the goal covered since quitting (3 days toward 1 week = 3/7) */
  progress: number;
  remainingMs: number;
}

export function nextSmokeMilestone(ms: number): SmokeMilestone {
  const t = Number.isFinite(ms) && ms > 0 ? ms : 0;
  let target: [number, string] | undefined = MILESTONES.find(([days]) => t < days * DAY_MS);
  if (!target) {
    const years = Math.floor(t / (365 * DAY_MS)) + 1;
    target = [years * 365, `${years} years`];
  }
  const [days, label] = target;
  return {
    days,
    label,
    progress: Math.max(0, Math.min(1, t / (days * DAY_MS))),
    remainingMs: days * DAY_MS - t,
  };
}

/** Closes any open run at `ts` (never before its start) and opens a new one. */
function closeAndOpen(state: State, ts: number): State {
  const open = state.smokingRuns.find((r) => r.end === undefined);
  const boundary = open ? Math.max(ts, open.start) : ts;
  const runs = state.smokingRuns.map((r) => (r === open ? { ...r, end: boundary } : r));
  return { ...state, smokingRuns: [...runs, { start: boundary }] };
}

export const startQuit = (state: State, ts: number): State => closeAndOpen(state, ts);

export const relapse = (state: State, now: number): State => closeAndOpen(state, now);

/** Local-date labels of every completed 24h block, across all runs. */
export function smokeFreeBlockDates(state: State, now: number): string[] {
  const out = new Set<string>();
  for (const run of state.smokingRuns) {
    const first = todayKey(run.start);
    const n = smokeFreeDays(run, now);
    for (let i = 0; i < n; i++) out.add(addDays(first, i));
  }
  return [...out].sort();
}
