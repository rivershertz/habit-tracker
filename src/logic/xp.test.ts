import { describe, it, expect } from 'vitest';
import { emptyState, legacyState, type State } from './types';
import { DAY_MS } from './smoking';
import { totalXp, xpBreakdown, levelForXp, thresholdForLevel, perfectDays } from './xp';

const T0 = new Date(2026, 9, 1, 8, 0).getTime();
const mk = (p: Partial<State>): State => ({ ...legacyState(), ...p });

describe('xp', () => {
  it('is zero for an empty state', () => {
    expect(totalXp(legacyState(), T0)).toBe(0);
  });

  it('awards 10 xp for a single check-in', () => {
    const s = mk({ checkins: { workout: ['2026-10-01'], reading: [] } });
    expect(totalXp(s, T0)).toBe(10);
  });

  it('adds a streak bonus capped at +10', () => {
    const days = Array.from({ length: 15 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
    const s = mk({ checkins: { workout: days, reading: [] } });
    // day n earns 10 + min(n-1, 10): 10..20 for n=1..11, then 20 for n=12..15
    const expected = Array.from({ length: 15 }, (_, i) => 10 + Math.min(i, 10)).reduce((a, b) => a + b, 0);
    expect(xpBreakdown(s, T0).habits.workout).toBe(expected);
  });

  it('awards 15 xp per completed smoke-free day', () => {
    const s = mk({ smokingRuns: [{ start: T0 }] });
    expect(xpBreakdown(s, T0 + 3.5 * DAY_MS).smoke).toBe(45);
  });

  it('awards a perfect-day bonus of 20 when all three habits line up', () => {
    const s = mk({
      smokingRuns: [{ start: T0 }],
      checkins: { workout: ['2026-10-01'], reading: ['2026-10-01'] },
    });
    const now = T0 + 1.5 * DAY_MS;
    expect(perfectDays(s, now)).toEqual(['2026-10-01']);
    expect(xpBreakdown(s, now).perfect).toBe(20);
    expect(totalXp(s, now)).toBe(10 + 10 + 15 + 20);
  });
});

describe('xp with custom habits', () => {
  const meditate = { id: 'h-med', name: 'Meditate', icon: '🧘', color: '#4da3ff', since: '2026-10-02' };

  it('awards check-in xp to custom habits', () => {
    const s = mk({ habits: [...legacyState().habits, meditate], checkins: { workout: [], reading: [], 'h-med': ['2026-10-02'] } });
    expect(xpBreakdown(s, T0).habits['h-med']).toBe(10);
    expect(totalXp(s, T0)).toBe(10);
  });

  it('a custom habit only joins perfect days from the day it was added', () => {
    const s = mk({
      smokingRuns: [{ start: T0 }],
      habits: [...legacyState().habits, meditate],
      checkins: { workout: ['2026-10-01', '2026-10-02'], reading: ['2026-10-01', '2026-10-02'], 'h-med': [] },
    });
    // 10-01 predates the habit, so it stays perfect; 10-02 now needs a meditation check-in too
    expect(perfectDays(s, T0 + 3 * DAY_MS)).toEqual(['2026-10-01']);
  });
});

describe('xp for a first-timer (no smoke counter)', () => {
  const run = { id: 'h-run', name: 'Run', icon: '🏃', color: '#4da3ff', since: '2026-10-01' };
  const sugar = { id: 'h-sugar', name: 'No sugar', icon: '🍬', color: '#ff5fa2', since: '2026-10-01', kind: 'quit' as const };

  it('counts a perfect day once every habit is done, without smoke-free days', () => {
    const s: State = { ...emptyState(), habits: [run], checkins: { 'h-run': ['2026-10-01'] } };
    expect(perfectDays(s, T0)).toEqual(['2026-10-01']);
    expect(xpBreakdown(s, T0).smoke).toBe(0);
  });

  it('waits for a quit habit to complete its free day', () => {
    const s: State = { ...emptyState(), habits: [run, sugar], checkins: { 'h-run': ['2026-10-01'] }, quitRuns: { 'h-sugar': [{ start: T0 }] } };
    expect(perfectDays(s, T0 + 0.5 * DAY_MS)).toEqual([]);
    expect(perfectDays(s, T0 + 1.5 * DAY_MS)).toEqual(['2026-10-01']);
  });
});

describe('levels', () => {
  it('thresholds follow round(40*(n-1)^1.6)', () => {
    expect(thresholdForLevel(1)).toBe(0);
    expect(thresholdForLevel(2)).toBe(40);
    expect(thresholdForLevel(5)).toBe(Math.round(40 * Math.pow(4, 1.6)));
  });

  it('level 1 at 0 xp', () => {
    expect(levelForXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0, rank: 'Rookie' });
  });

  it('level-ups exactly at the threshold', () => {
    expect(levelForXp(39).level).toBe(1);
    expect(levelForXp(40).level).toBe(2);
    expect(levelForXp(40).xpIntoLevel).toBe(0);
  });

  it('reports progress toward the next level', () => {
    const l = levelForXp(60);
    expect(l.xpForNext).toBe(thresholdForLevel(3) - thresholdForLevel(2));
    expect(l.progress).toBeCloseTo(20 / l.xpForNext);
  });

  it('maps ranks to level bands', () => {
    const lvlXp = (n: number) => thresholdForLevel(n);
    expect(levelForXp(lvlXp(5)).rank).toBe('Challenger');
    expect(levelForXp(lvlXp(10)).rank).toBe('Contender');
    expect(levelForXp(lvlXp(15)).rank).toBe('Veteran');
    expect(levelForXp(lvlXp(25)).rank).toBe('Master');
    expect(levelForXp(lvlXp(40)).rank).toBe('Legend');
  });

  it('never returns NaN/negative for bad input', () => {
    expect(levelForXp(-5).level).toBe(1);
    expect(levelForXp(NaN).level).toBe(1);
  });
});
