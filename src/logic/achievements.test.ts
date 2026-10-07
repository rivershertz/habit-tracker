import { describe, it, expect } from 'vitest';
import { emptyState, type State } from './types';
import { DAY_MS } from './smoking';
import { evaluateAchievements, unlockedIds, ACHIEVEMENTS } from './achievements';

const T0 = new Date(2026, 9, 1, 8, 0).getTime();
const mk = (p: Partial<State>): State => ({ ...emptyState(), ...p });
const days = (start: string, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(2026, 8, Number(start.slice(-2)) + i, 12);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

const get = (s: State, id: string, now = T0 + 40 * DAY_MS) =>
  evaluateAchievements(s, now).find((a) => a.id === id)!;

describe('achievements', () => {
  it('has unique ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('nothing unlocked for an empty state', () => {
    expect(unlockedIds(emptyState(), T0)).toEqual([]);
  });

  it('first check-in unlocks first-rep / first-page', () => {
    const s = mk({ checkins: { workout: ['2026-10-01'], reading: [] } });
    expect(get(s, 'first-workout').unlocked).toBe(true);
    expect(get(s, 'first-reading').unlocked).toBe(false);
  });

  it('streak achievements use best streak and report progress', () => {
    const s = mk({ checkins: { workout: days('01', 5), reading: [] } });
    expect(get(s, 'workout-streak-3').unlocked).toBe(true);
    const w7 = get(s, 'workout-streak-7');
    expect(w7.unlocked).toBe(false);
    expect(w7.progress).toBeCloseTo(5 / 7);
  });

  it('an unlocked streak badge stays unlocked after the streak breaks', () => {
    const s = mk({ checkins: { workout: days('01', 7), reading: [] } });
    expect(get(s, 'workout-streak-7', T0 + 60 * DAY_MS).unlocked).toBe(true);
  });

  it('smoke-free milestones unlock from the best run', () => {
    const s = mk({ smokingRuns: [{ start: T0, end: T0 + 8 * DAY_MS }, { start: T0 + 8 * DAY_MS }] });
    const now = T0 + 20 * DAY_MS; // open run is 12 days, best is 12
    expect(get(s, 'smoke-7d', now).unlocked).toBe(true);
    expect(get(s, 'smoke-30d', now).unlocked).toBe(false);
  });

  it('perfect day unlocks when all three habits line up', () => {
    const s = mk({
      smokingRuns: [{ start: T0 }],
      checkins: { workout: ['2026-10-01'], reading: ['2026-10-01'] },
    });
    expect(get(s, 'perfect-day', T0 + 2 * DAY_MS).unlocked).toBe(true);
  });

  it('comeback unlocks after returning from a gap of 3+ missed days', () => {
    const s = mk({ checkins: { workout: ['2026-10-01', '2026-10-06'], reading: [] } });
    expect(get(s, 'comeback').unlocked).toBe(true);
    const s2 = mk({ checkins: { workout: ['2026-10-01', '2026-10-03'], reading: [] } });
    expect(get(s2, 'comeback').unlocked).toBe(false);
  });
});
