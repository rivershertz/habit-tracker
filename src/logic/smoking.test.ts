import { describe, it, expect } from 'vitest';
import { emptyState, type State } from './types';
import {
  DAY_MS,
  currentRun,
  bestRunDays,
  relapse,
  startQuit,
  smokeFreeDays,
  smokeFreeBlockDates,
  nextSmokeMilestone,
} from './smoking';

const T0 = new Date(2026, 9, 1, 8, 0).getTime();
const withRuns = (runs: State['smokingRuns']): State => ({ ...emptyState(), smokingRuns: runs });

describe('nextSmokeMilestone', () => {
  it('targets 1 day first, with progress through it', () => {
    const m = nextSmokeMilestone(DAY_MS / 2);
    expect(m).toMatchObject({ days: 1, label: '1 day' });
    expect(m.progress).toBeCloseTo(0.5);
    expect(m.remainingMs).toBe(DAY_MS / 2);
  });

  it('moves to the next milestone once one is reached', () => {
    expect(nextSmokeMilestone(1 * DAY_MS)).toMatchObject({ days: 3 });
    expect(nextSmokeMilestone(7 * DAY_MS)).toMatchObject({ days: 14, label: '2 weeks' });
    expect(nextSmokeMilestone(10 * DAY_MS).label).toBe('2 weeks');
  });

  it('progress is the share of the goal covered since quitting, not since the last milestone', () => {
    // 3 days into a 1-week goal is 3/7 ≈ 43%, not "5% of the way from the 3-day mark"
    const week = nextSmokeMilestone(3 * DAY_MS + 5 * 3_600_000);
    expect(week).toMatchObject({ days: 7, label: '1 week' });
    expect(week.progress).toBeCloseTo((3 + 5 / 24) / 7);
    // 20 days toward 1 month is 20/30 ≈ 67%
    expect(nextSmokeMilestone(20 * DAY_MS).progress).toBeCloseTo(20 / 30);
    // just past a milestone, the next goal's progress is already well above zero
    expect(nextSmokeMilestone(7 * DAY_MS).progress).toBeCloseTo(0.5);
  });

  it('keeps counting in years past the table', () => {
    const m = nextSmokeMilestone(1200 * DAY_MS);
    expect(m.days).toBe(1460);
    expect(m.label).toBe('4 years');
  });

  it('handles zero and negative input', () => {
    expect(nextSmokeMilestone(0).progress).toBe(0);
    expect(nextSmokeMilestone(-5).progress).toBe(0);
  });
});

describe('smoking', () => {
  it('has no active run before the user starts quitting', () => {
    const r = currentRun(emptyState(), T0);
    expect(r).toMatchObject({ active: false, ms: 0, days: 0 });
  });

  it('breaks the current run into days/hours/minutes', () => {
    const s = startQuit(emptyState(), T0);
    const r = currentRun(s, T0 + 3 * DAY_MS + 5 * 3_600_000 + 7 * 60_000 + 30_000);
    expect(r).toMatchObject({ active: true, days: 3, hours: 5, minutes: 7 });
  });

  it('clamps a future quit date to zero', () => {
    const s = startQuit(emptyState(), T0 + DAY_MS);
    expect(currentRun(s, T0).ms).toBe(0);
    expect(currentRun(s, T0).days).toBe(0);
  });

  it('clamps when the clock moves backwards', () => {
    const s = withRuns([{ start: T0 }]);
    expect(currentRun(s, T0 - 5000).ms).toBe(0);
  });

  it('relapse closes the open run and opens a new one', () => {
    const s0 = startQuit(emptyState(), T0);
    const s1 = relapse(s0, T0 + 10 * DAY_MS);
    expect(s1.smokingRuns).toEqual([
      { start: T0, end: T0 + 10 * DAY_MS },
      { start: T0 + 10 * DAY_MS },
    ]);
  });

  it('relapse never produces an end before the start', () => {
    const s0 = startQuit(emptyState(), T0 + DAY_MS);
    const s1 = relapse(s0, T0);
    expect(s1.smokingRuns[0].end).toBeGreaterThanOrEqual(s1.smokingRuns[0].start);
  });

  it('relapse with no runs just starts one', () => {
    expect(relapse(emptyState(), T0).smokingRuns).toEqual([{ start: T0 }]);
  });

  it('bestRunDays considers closed and open runs', () => {
    const s = withRuns([{ start: T0, end: T0 + 12 * DAY_MS }, { start: T0 + 12 * DAY_MS }]);
    expect(bestRunDays(s, T0 + 15 * DAY_MS)).toBe(12);
    expect(bestRunDays(s, T0 + 30 * DAY_MS)).toBe(18);
  });

  it('smokeFreeDays floors completed 24h blocks', () => {
    expect(smokeFreeDays({ start: T0 }, T0 + 2.9 * DAY_MS)).toBe(2);
  });

  it('labels completed blocks with local dates, unique across runs', () => {
    const s = withRuns([{ start: T0, end: T0 + 3 * DAY_MS }, { start: T0 + 3 * DAY_MS }]);
    expect(smokeFreeBlockDates(s, T0 + 5 * DAY_MS)).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
    ]);
  });
});
