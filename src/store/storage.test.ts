import { describe, it, expect } from 'vitest';
import { emptyState, legacyState } from '../logic/types';
import { KEY, loadState, saveState } from './storage';

const memory = (init: Record<string, string> = {}) => {
  const data = { ...init };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => void (data[k] = v),
  };
};

describe('storage', () => {
  it('round-trips state', () => {
    const m = memory();
    const s = { ...legacyState(), smokingRuns: [{ start: 1000 }] };
    expect(saveState(s, m)).toBe(true);
    expect(loadState(m)).toEqual(s);
  });

  it('returns null when nothing is stored', () => {
    expect(loadState(memory())).toBeNull();
  });

  it('returns null for corrupt JSON instead of throwing', () => {
    expect(loadState(memory({ [KEY]: '{not json' }))).toBeNull();
  });

  it('returns null for unknown versions or wrong shapes', () => {
    expect(loadState(memory({ [KEY]: JSON.stringify({ version: 99 }) }))).toBeNull();
    expect(loadState(memory({ [KEY]: JSON.stringify([1, 2, 3]) }))).toBeNull();
    expect(loadState(memory({ [KEY]: 'null' }))).toBeNull();
  });

  it('sanitizes bad fields rather than trusting them', () => {
    const raw = {
      version: 1,
      smokingRuns: [{ start: 5 }, { start: 'x' }, null, { start: 9, end: 'bad' }],
      checkins: { workout: ['2026-10-02', 'garbage', '2026-10-02', '2026-10-01'], reading: 'oops' },
      seenAchievements: ['a', 5],
      seenLevel: -3,
    };
    const s = loadState(memory({ [KEY]: JSON.stringify(raw) }))!;
    expect(s.smokingRuns).toEqual([{ start: 5 }, { start: 9 }]);
    expect(s.checkins.workout).toEqual(['2026-10-01', '2026-10-02']);
    expect(s.checkins.reading).toEqual([]);
    expect(s.seenAchievements).toEqual(['a']);
    expect(s.seenLevel).toBe(1);
  });

  it('migrates v1 data (no habits list) to v3 with the built-ins', () => {
    const raw = { version: 1, smokingRuns: [{ start: 5 }], checkins: { workout: ['2026-10-01'], reading: [] }, seenAchievements: ['first-workout'], seenLevel: 2 };
    const s = loadState(memory({ [KEY]: JSON.stringify(raw) }))!;
    expect(s.version).toBe(3);
    expect(s.habits.map((h) => h.id)).toEqual(['workout', 'reading']);
    expect(s.checkins.workout).toEqual(['2026-10-01']);
    expect(s.seenAchievements).toEqual(['first-workout']);
  });

  it('round-trips custom habits and drops invalid ones', () => {
    const good = { id: 'h-med', name: 'Meditate', icon: '🧘', color: '#4da3ff', since: '2026-10-01' };
    const raw = {
      version: 2,
      smokingRuns: [],
      habits: [good, { ...good, id: 'workout' }, { ...good, id: 'h-bad', color: 'red' }, { ...good }],
      checkins: { workout: [], reading: [], 'h-med': ['2026-10-02'], 'h-bad': ['2026-10-02'] },
      seenAchievements: [],
      seenLevel: 1,
    };
    const s = loadState(memory({ [KEY]: JSON.stringify(raw) }))!;
    expect(s.habits.map((h) => h.id)).toEqual(['workout', 'reading', 'h-med']);
    expect(s.checkins).toEqual({ workout: [], reading: [], 'h-med': ['2026-10-02'] });
  });

  it('v3 keeps exactly the stored habits: none for a first-timer, built-ins only if stored', () => {
    const m = memory();
    saveState(emptyState(), m);
    expect(loadState(m)!.habits).toEqual([]);
    const med = { id: 'h-med', name: 'Meditate', icon: '🧘', color: '#4da3ff', since: '2026-10-01' };
    const withBuiltIn = { ...emptyState(), habits: [legacyState().habits[1], med], checkins: { reading: ['2026-10-02'], 'h-med': [] } };
    saveState(withBuiltIn, m);
    expect(loadState(m)).toEqual(withBuiltIn);
  });

  it('survives storage that throws', () => {
    const boom = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadState(boom)).toBeNull();
    expect(saveState(legacyState(), boom)).toBe(false);
  });

  it('works when storage is unavailable entirely', () => {
    expect(loadState(undefined)).toBeNull();
    expect(saveState(legacyState(), undefined)).toBe(false);
  });
});
