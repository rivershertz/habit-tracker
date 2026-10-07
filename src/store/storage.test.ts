import { describe, it, expect } from 'vitest';
import { emptyState } from '../logic/types';
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
    const s = { ...emptyState(), smokingRuns: [{ start: 1000 }] };
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
    expect(saveState(emptyState(), boom)).toBe(false);
  });

  it('works when storage is unavailable entirely', () => {
    expect(loadState(undefined)).toBeNull();
    expect(saveState(emptyState(), undefined)).toBe(false);
  });
});
