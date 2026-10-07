import { describe, it, expect } from 'vitest';
import { emptyState } from '../logic/types';
import { DAY_MS } from '../logic/smoking';
import { reduce, pendingCelebrations } from './reducer';

const T0 = new Date(2026, 9, 1, 8, 0).getTime();

describe('reduce', () => {
  it('setCheckin adds a date once, sorted, and is idempotent', () => {
    let s = emptyState();
    s = reduce(s, { type: 'setCheckin', habit: 'workout', day: '2026-10-03', on: true });
    s = reduce(s, { type: 'setCheckin', habit: 'workout', day: '2026-10-01', on: true });
    const again = reduce(s, { type: 'setCheckin', habit: 'workout', day: '2026-10-01', on: true });
    expect(again.checkins.workout).toEqual(['2026-10-01', '2026-10-03']);
    expect(again).toBe(s); // no change → same reference, so no re-render/celebration
  });

  it('setCheckin off removes the date and is idempotent', () => {
    let s = reduce(emptyState(), { type: 'setCheckin', habit: 'reading', day: '2026-10-01', on: true });
    s = reduce(s, { type: 'setCheckin', habit: 'reading', day: '2026-10-01', on: false });
    expect(s.checkins.reading).toEqual([]);
    expect(reduce(s, { type: 'setCheckin', habit: 'reading', day: '2026-10-01', on: false })).toBe(s);
  });

  it('rejects malformed day keys', () => {
    const s = emptyState();
    expect(reduce(s, { type: 'setCheckin', habit: 'workout', day: 'nope', on: true })).toBe(s);
  });

  it('startQuit and relapse manage runs', () => {
    let s = reduce(emptyState(), { type: 'startQuit', ts: T0 });
    s = reduce(s, { type: 'relapse', now: T0 + 5 * DAY_MS });
    expect(s.smokingRuns).toHaveLength(2);
  });

  it('markSeen unions ids and never lowers the seen level', () => {
    let s = reduce(emptyState(), { type: 'markSeen', ids: ['a'], level: 3 });
    s = reduce(s, { type: 'markSeen', ids: ['b', 'a'], level: 2 });
    expect(s.seenAchievements.sort()).toEqual(['a', 'b']);
    expect(s.seenLevel).toBe(3);
  });
});

describe('pendingCelebrations', () => {
  it('reports newly unlocked achievements and level-ups only once', () => {
    let s = reduce(emptyState(), { type: 'setCheckin', habit: 'workout', day: '2026-10-01', on: true });
    const p = pendingCelebrations(s, T0);
    expect(p.achievements.map((a) => a.id)).toContain('first-workout');
    s = reduce(s, { type: 'markSeen', ids: p.achievements.map((a) => a.id), level: p.level?.level ?? 1 });
    const p2 = pendingCelebrations(s, T0);
    expect(p2.achievements).toEqual([]);
    expect(p2.level).toBeNull();
  });

  it('reports a level-up when xp crosses a threshold', () => {
    let s = emptyState();
    for (const d of ['2026-10-01', '2026-10-02', '2026-10-03']) {
      s = reduce(s, { type: 'setCheckin', habit: 'workout', day: d, on: true });
    }
    // 10 + 11 + 12 = 33 xp → still level 1; add reading for 33 more
    for (const d of ['2026-10-01', '2026-10-02', '2026-10-03']) {
      s = reduce(s, { type: 'setCheckin', habit: 'reading', day: d, on: true });
    }
    expect(pendingCelebrations(s, T0).level?.level).toBe(2);
  });
});
