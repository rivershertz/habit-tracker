import { smokeFreeBlockDates } from './smoking';
import { streakLengthAt } from './streaks';
import type { HabitId, State } from './types';

export const XP_CHECKIN = 10;
export const XP_STREAK_BONUS_CAP = 10;
export const XP_SMOKE_DAY = 15;
export const XP_PERFECT = 20;

export interface XpBreakdown {
  workout: number;
  reading: number;
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

export function perfectDays(state: State, now: number): string[] {
  const smoke = new Set(smokeFreeBlockDates(state, now));
  const reading = new Set(state.checkins.reading);
  return [...new Set(state.checkins.workout)].filter((d) => reading.has(d) && smoke.has(d)).sort();
}

export function xpBreakdown(state: State, now: number): XpBreakdown {
  return {
    workout: habitXp(state.checkins.workout),
    reading: habitXp(state.checkins.reading),
    smoke: smokeFreeBlockDates(state, now).length * XP_SMOKE_DAY,
    perfect: perfectDays(state, now).length * XP_PERFECT,
  };
}

export function totalXp(state: State, now: number): number {
  const b = xpBreakdown(state, now);
  return b.workout + b.reading + b.smoke + b.perfect;
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

export const HABIT_IDS: HabitId[] = ['workout', 'reading'];
