import { addDays, daysBetween } from './dates';

export interface Streaks {
  current: number;
  best: number;
  total: number;
}

const unique = (dates: string[]) => [...new Set(dates)].sort();

export function computeStreaks(dates: string[], today: string): Streaks {
  const days = unique(dates);
  const set = new Set(days);

  // current: ends today, or yesterday if today isn't logged yet
  let cursor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }

  return { current, best, total: days.length };
}

/** Length of the consecutive run that ends on `day` (0 if `day` isn't logged). */
export function streakLengthAt(dates: string[], day: string): number {
  const set = new Set(dates);
  let n = 0;
  let cursor = day;
  while (set.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}
