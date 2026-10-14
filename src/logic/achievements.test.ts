import { describe, it, expect } from 'vitest';
import { emptyState, type State } from './types';
import { DAY_MS } from './smoking';
import { achievementDefs, evaluateAchievements, unlockedIds, TIERS } from './achievements';

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
    const s = mk({ habits: [...emptyState().habits, { id: 'h-a', name: 'A', icon: '🧘', color: '#4da3ff', since: '2026-10-01' }] });
    const ids = achievementDefs(s).map((a) => a.id);
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

  it('every rarity tier has achievements', () => {
    const tiers = new Set(evaluateAchievements(emptyState(), T0).map((a) => a.tier));
    expect([...tiers].sort()).toEqual([...TIERS].sort());
  });

  it('keeps the original achievement ids so earned badges are not re-celebrated', () => {
    const ids = new Set(achievementDefs(emptyState()).map((a) => a.id));
    for (const id of ['first-workout', 'workout-streak-365', 'first-reading', 'reading-streak-3', 'smoke-1d', 'smoke-365d', 'perfect-day', 'comeback']) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('custom habits get their own badge track', () => {
    const habit = { id: 'h-water', name: 'Water', icon: '💧', color: '#4da3ff', since: '2026-09-01' };
    const s = mk({ habits: [...emptyState().habits, habit], checkins: { workout: [], reading: [], 'h-water': days('01', 8) } });
    expect(get(s, 'first-h-water').unlocked).toBe(true);
    expect(get(s, 'h-water-streak-7').unlocked).toBe(true);
    expect(get(s, 'h-water-streak-7').tier).toBe('rare');
    expect(get(s, 'architect').unlocked).toBe(true);
  });

  it('flawless week needs 7 perfect days in a row', () => {
    const d = days('01', 7);
    const start = new Date(2026, 8, 1, 0, 0).getTime();
    const s = mk({ smokingRuns: [{ start }], checkins: { workout: d, reading: d } });
    expect(get(s, 'perfect-week', start + 8 * DAY_MS).unlocked).toBe(true);
    const s2 = mk({ smokingRuns: [{ start }], checkins: { workout: d, reading: d.slice(1) } });
    expect(get(s2, 'perfect-week', start + 8 * DAY_MS).unlocked).toBe(false);
  });

  it('grand slam needs a shared 7-day streak on every habit', () => {
    const s = mk({ checkins: { workout: days('01', 7), reading: days('01', 7) } });
    expect(get(s, 'grand-slam').unlocked).toBe(true);
    const s2 = mk({ checkins: { workout: days('01', 7), reading: days('03', 7) } });
    expect(get(s2, 'grand-slam').progress).toBeCloseTo(5 / 7);
  });

  it('juggler counts distinct habits on one day', () => {
    const extra = ['a', 'b', 'c'].map((x) => ({ id: `h-${x}`, name: x, icon: '🎯', color: '#4da3ff', since: '2026-09-01' }));
    const day = ['2026-10-01'];
    const s = mk({
      habits: [...emptyState().habits, ...extra],
      checkins: { workout: day, reading: day, 'h-a': day, 'h-b': day, 'h-c': day },
    });
    expect(get(s, 'juggler').unlocked).toBe(true);
  });

  it('level badges follow total xp', () => {
    const s = mk({ checkins: { workout: days('01', 30), reading: days('01', 30) } });
    expect(get(s, 'level-5').unlocked).toBe(true);
    expect(get(s, 'level-60').unlocked).toBe(false);
  });

  it('comeback unlocks after returning from a gap of 3+ missed days', () => {
    const s = mk({ checkins: { workout: ['2026-10-01', '2026-10-06'], reading: [] } });
    expect(get(s, 'comeback').unlocked).toBe(true);
    const s2 = mk({ checkins: { workout: ['2026-10-01', '2026-10-03'], reading: [] } });
    expect(get(s2, 'comeback').unlocked).toBe(false);
  });
});
