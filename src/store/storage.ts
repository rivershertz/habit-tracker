import { emptyState, type Habit, type SmokingRun, type State } from '../logic/types';

export const KEY = 'ascend:v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const cleanDays = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((d): d is string => typeof d === 'string' && DAY_KEY.test(d)))].sort() : [];

function cleanRuns(v: unknown): SmokingRun[] {
  if (!Array.isArray(v)) return [];
  const runs: SmokingRun[] = [];
  for (const r of v) {
    if (!isObj(r) || !isNum(r.start)) continue;
    runs.push(isNum(r.end) ? { start: r.start, end: r.end } : { start: r.start });
  }
  return runs;
}

export const HABIT_NAME_MAX = 24;
const CUSTOM_ID = /^h-[a-z0-9-]{1,40}$/;
const HEX = /^#[0-9a-f]{6}$/i;

/** A valid custom habit, or null. Built-ins are never read from storage — they always come from the defaults. */
export function cleanHabit(v: unknown): Habit | null {
  if (!isObj(v)) return null;
  const { id, name, icon, color, since } = v;
  if (typeof id !== 'string' || !CUSTOM_ID.test(id)) return null;
  if (typeof name !== 'string' || !name.trim()) return null;
  if (typeof icon !== 'string' || !icon.trim() || icon.length > 32) return null;
  if (typeof color !== 'string' || !HEX.test(color)) return null;
  if (typeof since !== 'string' || !DAY_KEY.test(since)) return null;
  return { id, name: name.trim().slice(0, HABIT_NAME_MAX), icon: icon.trim(), color, since };
}

/** Validate + repair an untrusted blob (v1 is migrated). Returns null when it can't be a State at all. */
export function sanitize(raw: unknown): State | null {
  if (!isObj(raw) || (raw.version !== 1 && raw.version !== 2)) return null;
  const checkins = isObj(raw.checkins) ? raw.checkins : {};
  const base = emptyState();
  const ids = new Set(base.habits.map((h) => h.id));
  for (const h of Array.isArray(raw.habits) ? raw.habits : []) {
    const habit = cleanHabit(h);
    if (habit && !ids.has(habit.id)) {
      ids.add(habit.id);
      base.habits.push(habit);
    }
  }
  base.checkins = {};
  for (const h of base.habits) base.checkins[h.id] = cleanDays(checkins[h.id]);
  base.smokingRuns = cleanRuns(raw.smokingRuns);
  base.seenAchievements = Array.isArray(raw.seenAchievements)
    ? raw.seenAchievements.filter((x): x is string => typeof x === 'string')
    : [];
  base.seenLevel = isNum(raw.seenLevel) && raw.seenLevel >= 1 ? Math.floor(raw.seenLevel) : 1;
  return base;
}

const defaultStorage = (): StorageLike | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export function loadState(storage: StorageLike | undefined = defaultStorage()): State | null {
  try {
    const text = storage?.getItem(KEY);
    if (!text) return null;
    return sanitize(JSON.parse(text));
  } catch {
    return null;
  }
}

export function saveState(state: State, storage: StorageLike | undefined = defaultStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
