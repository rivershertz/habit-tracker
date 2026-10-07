import { emptyState, type HabitId, type SmokingRun, type State } from '../logic/types';

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

/** Validate + repair an untrusted blob. Returns null when it can't be a State at all. */
export function sanitize(raw: unknown): State | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  const checkins = isObj(raw.checkins) ? raw.checkins : {};
  const base = emptyState();
  const habits: HabitId[] = ['workout', 'reading'];
  for (const h of habits) base.checkins[h] = cleanDays(checkins[h]);
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
