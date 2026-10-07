import { describe, it, expect } from 'vitest';
import { computeStreaks, streakLengthAt } from './streaks';

describe('computeStreaks', () => {
  it('is zero with no check-ins', () => {
    expect(computeStreaks([], '2026-10-07')).toEqual({ current: 0, best: 0, total: 0 });
  });

  it('counts consecutive days ending today', () => {
    const r = computeStreaks(['2026-10-05', '2026-10-06', '2026-10-07'], '2026-10-07');
    expect(r).toEqual({ current: 3, best: 3, total: 3 });
  });

  it('keeps the streak alive if today is not yet logged', () => {
    const r = computeStreaks(['2026-10-05', '2026-10-06'], '2026-10-07');
    expect(r.current).toBe(2);
  });

  it('breaks the streak after a missed day', () => {
    const r = computeStreaks(['2026-10-04', '2026-10-05'], '2026-10-07');
    expect(r.current).toBe(0);
    expect(r.best).toBe(2);
  });

  it('tracks best streak separately from current', () => {
    const dates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-10-06', '2026-10-07'];
    expect(computeStreaks(dates, '2026-10-07')).toEqual({ current: 2, best: 4, total: 6 });
  });

  it('ignores duplicates and unsorted input', () => {
    const r = computeStreaks(['2026-10-07', '2026-10-06', '2026-10-06'], '2026-10-07');
    expect(r).toEqual({ current: 2, best: 2, total: 2 });
  });

  it('survives DST boundaries', () => {
    process.env.TZ = 'America/New_York';
    const r = computeStreaks(['2026-03-07', '2026-03-08', '2026-03-09'], '2026-03-09');
    expect(r.current).toBe(3);
  });

  it('ignores future dates for current streak', () => {
    const r = computeStreaks(['2026-10-09'], '2026-10-07');
    expect(r.current).toBe(0);
  });
});

describe('streakLengthAt', () => {
  it('returns the run length ending on a given day', () => {
    const dates = ['2026-10-05', '2026-10-06', '2026-10-07'];
    expect(streakLengthAt(dates, '2026-10-05')).toBe(1);
    expect(streakLengthAt(dates, '2026-10-07')).toBe(3);
  });
});
