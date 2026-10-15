import { freeBlockDates, smokeFreeBlockDates } from './smoking';
import { streakLengthAt } from './streaks';
import { datesOf, isQuit, runsOf, tracksSmoking, type HabitId, type State } from './types';

export const XP_CHECKIN = 10;
export const XP_STREAK_BONUS_CAP = 10;
export const XP_SMOKE_DAY = 15;
export const XP_PERFECT = 20;

export interface XpBreakdown {
  /** per habit id */
  habits: Record<HabitId, number>;
  smoke: number;
  perfect: number;
}

function habitXp(dates: string[]): number {
  const sorted = [...new Set(dates)].sort();
  let sum = 0;
  for (const d of sorted) {
    sum += XP_CHECKIN + Math.min(streakLengthAt(sorted, d) - 1, XP_STREAK_BONUS_CAP);
  }
  return sum;
}

/** Days a habit "succeeded": check-ins, or completed free days for a quit habit. */
const goodDays = (state: State, id: HabitId, quit: boolean, now: number): string[] =>
  quit ? freeBlockDates(runsOf(state, id), now) : datesOf(state, id);

/** Days on which every habit that existed that day was done (and, for legacy users, that were smoke-free). */
export function perfectDays(state: State, now: number): string[] {
  const sets = state.habits.map((h) => ({ since: h.since, days: new Set(goodDays(state, h.id, isQuit(h), now)) }));
  const candidates = tracksSmoking(state)
    ? smokeFreeBlockDates(state, now)
    : [...new Set(sets.flatMap((h) => [...h.days]))].sort();
  return candidates.filter((d) => {
    const active = sets.filter((h) => h.since <= d);
    return active.length > 0 && active.every((h) => h.days.has(d));
  });
}

export function xpBreakdown(state: State, now: number): XpBreakdown {
  const habits: Record<HabitId, number> = {};
  for (const h of state.habits) {
    habits[h.id] = isQuit(h) ? freeBlockDates(runsOf(state, h.id), now).length * XP_SMOKE_DAY : habitXp(datesOf(state, h.id));
  }
  return {
    habits,
    smoke: smokeFreeBlockDates(state, now).length * XP_SMOKE_DAY,
    perfect: perfectDays(state, now).length * XP_PERFECT,
  };
}

export function totalXp(state: State, now: number): number {
  const b = xpBreakdown(state, now);
  return Object.values(b.habits).reduce((a, x) => a + x, 0) + b.smoke + b.perfect;
}

/** Cumulative XP needed to reach level n. */
export const thresholdForLevel = (n: number): number =>
  n <= 1 ? 0 : Math.round(40 * Math.pow(n - 1, 1.6));

export function rankForLevel(level: number): string {
  if (level >= 40) return 'Legend';
  if (level >= 25) return 'Master';
  if (level >= 15) return 'Veteran';
  if (level >= 10) return 'Contender';
  if (level >= 5) return 'Challenger';
  return 'Rookie';
}

export interface LevelInfo {
  level: number;
  rank: string;
  xpIntoLevel: number;
  xpForNext: number;
  /** 0..1 progress toward the next level */
  progress: number;
}

export function levelForXp(xp: number): LevelInfo {
  const safe = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;
  let level = 1;
  while (thresholdForLevel(level + 1) <= safe) level++;
  const base = thresholdForLevel(level);
  const next = thresholdForLevel(level + 1);
  const xpIntoLevel = safe - base;
  const xpForNext = next - base;
  return { level, rank: rankForLevel(level), xpIntoLevel, xpForNext, progress: xpIntoLevel / xpForNext };
}
