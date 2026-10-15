import { describe, it, expect } from 'vitest';
import { evaluateAchievements } from './achievements';
import { DAY_MS } from './smoking';
import { legacyState, type Habit, type State } from './types';
import { perfectDays, totalXp, xpBreakdown } from './xp';
import { reduce } from '../store/reducer';
import { loadState, KEY } from '../store/storage';

const T0 = new Date(2026, 9, 1, 8, 0).getTime();
const sugar: Habit = { id: 'h-sugar', name: 'No sugar', icon: '🍬', color: '#ff5fa2', since: '2026-09-01', kind: 'quit' };

const withSugar = (start = T0): State => reduce(legacyState(), { type: 'addHabit', habit: sugar, quitStart: start });

describe('quit habits', () => {
  it('addHabit starts the counter and keeps no check-ins', () => {
    const s = withSugar();
    expect(s.quitRuns['h-sugar']).toEqual([{ start: T0 }]);
    expect('h-sugar' in s.checkins).toBe(false);
  });

  it('a quit habit needs a start time', () => {
    const s = legacyState();
    expect(reduce(s, { type: 'addHabit', habit: sugar })).toBe(s);
  });

  it('cannot be checked in like a daily habit', () => {
    const s = withSugar();
    expect(reduce(s, { type: 'setCheckin', habit: 'h-sugar', day: '2026-10-02', on: true })).toBe(s);
  });

  it('slip restarts only that habit, and only for quit habits', () => {
    const s = reduce(withSugar(), { type: 'slip', habit: 'h-sugar', now: T0 + 4 * DAY_MS });
    expect(s.quitRuns['h-sugar']).toEqual([{ start: T0, end: T0 + 4 * DAY_MS }, { start: T0 + 4 * DAY_MS }]);
    expect(reduce(s, { type: 'slip', habit: 'workout', now: T0 })).toBe(s);
  });

  it('removeHabit drops its runs', () => {
    const s = reduce(withSugar(), { type: 'removeHabit', id: 'h-sugar' });
    expect(s.quitRuns).toEqual({});
  });

  it('earns 15 xp per full free day', () => {
    const s = withSugar();
    expect(xpBreakdown(s, T0 + 3.5 * DAY_MS).habits['h-sugar']).toBe(45);
    expect(totalXp(s, T0 + 3.5 * DAY_MS)).toBe(45);
  });

  it('counts toward perfect days through its free days', () => {
    const base = { ...withSugar(), smokingRuns: [{ start: T0 }] };
    const s = { ...base, checkins: { ...base.checkins, workout: ['2026-10-01'], reading: ['2026-10-01'] } };
    expect(perfectDays(s, T0 + 1.5 * DAY_MS)).toEqual(['2026-10-01']);
    // slipped before the first day completed → no free day, so no perfect day
    const slipped = reduce(s, { type: 'slip', habit: 'h-sugar', now: T0 + 0.5 * DAY_MS });
    expect(perfectDays(slipped, T0 + 1.2 * DAY_MS)).toEqual([]);
  });

  it('gets its own free-days badge track instead of streak badges', () => {
    const ids = evaluateAchievements(withSugar(), T0 + 8 * DAY_MS).filter((a) => a.group === 'h-sugar');
    expect(ids.map((a) => a.id)).toEqual(['h-sugar-free-1d', 'h-sugar-free-7d', 'h-sugar-free-30d', 'h-sugar-free-100d', 'h-sugar-free-365d']);
    expect(ids.find((a) => a.id === 'h-sugar-free-7d')!.unlocked).toBe(true);
  });

  it('round-trips through storage', () => {
    const data: Record<string, string> = {};
    const mem = { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
    mem.setItem(KEY, JSON.stringify(withSugar()));
    const s = loadState(mem)!;
    expect(s.habits.find((h) => h.id === 'h-sugar')?.kind).toBe('quit');
    expect(s.quitRuns['h-sugar']).toEqual([{ start: T0 }]);
  });
});
