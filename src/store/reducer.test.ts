import { describe, it, expect } from 'vitest';
import { emptyState, legacyState } from '../logic/types';
import { DAY_MS } from '../logic/smoking';
import { reduce, pendingCelebrations } from './reducer';

const T0 = new Date(2026, 9, 1, 8, 0).getTime();

describe('reduce', () => {
  it('setCheckin adds a date once, sorted, and is idempotent', () => {
    let s = legacyState();
    s = reduce(s, { type: 'setCheckin', habit: 'workout', day: '2026-10-03', on: true });
    s = reduce(s, { type: 'setCheckin', habit: 'workout', day: '2026-10-01', on: true });
    const again = reduce(s, { type: 'setCheckin', habit: 'workout', day: '2026-10-01', on: true });
    expect(again.checkins.workout).toEqual(['2026-10-01', '2026-10-03']);
    expect(again).toBe(s); // no change → same reference, so no re-render/celebration
  });

  it('setCheckin off removes the date and is idempotent', () => {
    let s = reduce(legacyState(), { type: 'setCheckin', habit: 'reading', day: '2026-10-01', on: true });
    s = reduce(s, { type: 'setCheckin', habit: 'reading', day: '2026-10-01', on: false });
    expect(s.checkins.reading).toEqual([]);
    expect(reduce(s, { type: 'setCheckin', habit: 'reading', day: '2026-10-01', on: false })).toBe(s);
  });

  it('rejects malformed day keys', () => {
    const s = legacyState();
    expect(reduce(s, { type: 'setCheckin', habit: 'workout', day: 'nope', on: true })).toBe(s);
  });

  it('startQuit and relapse manage runs', () => {
    let s = reduce(legacyState(), { type: 'startQuit', ts: T0 });
    s = reduce(s, { type: 'relapse', now: T0 + 5 * DAY_MS });
    expect(s.smokingRuns).toHaveLength(2);
  });

  it('markSeen unions ids and never lowers the seen level', () => {
    let s = reduce(legacyState(), { type: 'markSeen', ids: ['a'], level: 3 });
    s = reduce(s, { type: 'markSeen', ids: ['b', 'a'], level: 2 });
    expect(s.seenAchievements.sort()).toEqual(['a', 'b']);
    expect(s.seenLevel).toBe(3);
  });
});

describe('custom habits', () => {
  const habit = { id: 'h-med', name: 'Meditate', icon: '🧘', color: '#4da3ff', since: '2026-10-01' };

  it('addHabit adds a habit with an empty check-in list', () => {
    const s = reduce(legacyState(), { type: 'addHabit', habit });
    expect(s.habits.map((h) => h.id)).toEqual(['workout', 'reading', 'h-med']);
    expect(s.checkins['h-med']).toEqual([]);
  });

  it('addHabit rejects duplicates, built-in ids and invalid habits', () => {
    const s = reduce(legacyState(), { type: 'addHabit', habit });
    expect(reduce(s, { type: 'addHabit', habit })).toBe(s);
    expect(reduce(s, { type: 'addHabit', habit: { ...habit, id: 'workout' } })).toBe(s);
    expect(reduce(s, { type: 'addHabit', habit: { ...habit, id: 'h-x', name: '  ' } })).toBe(s);
  });

  it('setCheckin works for custom habits and ignores unknown ones', () => {
    let s = reduce(legacyState(), { type: 'addHabit', habit });
    s = reduce(s, { type: 'setCheckin', habit: 'h-med', day: '2026-10-02', on: true });
    expect(s.checkins['h-med']).toEqual(['2026-10-02']);
    expect(reduce(s, { type: 'setCheckin', habit: 'h-nope', day: '2026-10-02', on: true })).toBe(s);
  });

  it('removeHabit drops the habit and its history, but never a built-in', () => {
    let s = reduce(legacyState(), { type: 'addHabit', habit });
    s = reduce(s, { type: 'setCheckin', habit: 'h-med', day: '2026-10-02', on: true });
    s = reduce(s, { type: 'removeHabit', id: 'h-med' });
    expect(s.habits.map((h) => h.id)).toEqual(['workout', 'reading']);
    expect('h-med' in s.checkins).toBe(false);
    expect(reduce(s, { type: 'removeHabit', id: 'workout' })).toBe(s);
  });
});

describe('first-timers', () => {
  it('start with no habits and add the goals they picked', () => {
    let s = emptyState();
    expect(s.habits).toEqual([]);
    s = reduce(s, { type: 'addHabit', habit: { id: 'h-run', name: 'Run', icon: '🏃', color: '#4da3ff', since: '2026-10-01' } });
    s = reduce(s, { type: 'addHabit', habit: { id: 'h-sugar', name: 'No sugar', icon: '🍬', color: '#ff5fa2', since: '2026-10-01', kind: 'quit' }, quitStart: T0 });
    expect(s.habits.map((h) => h.id)).toEqual(['h-run', 'h-sugar']);
    expect(s.quitRuns['h-sugar']).toEqual([{ start: T0 }]);
    expect(s.smokingRuns).toEqual([]);
  });
});

describe('pendingCelebrations', () => {
  it('reports newly unlocked achievements and level-ups only once', () => {
    let s = reduce(legacyState(), { type: 'setCheckin', habit: 'workout', day: '2026-10-01', on: true });
    const p = pendingCelebrations(s, T0);
    expect(p.achievements.map((a) => a.id)).toContain('first-workout');
    s = reduce(s, { type: 'markSeen', ids: p.achievements.map((a) => a.id), level: p.level?.level ?? 1 });
    const p2 = pendingCelebrations(s, T0);
    expect(p2.achievements).toEqual([]);
    expect(p2.level).toBeNull();
  });

  it('reports a level-up when xp crosses a threshold', () => {
    // a legacy user whose smoke-free day hasn't completed yet, so no perfect-day bonus
    let s = { ...legacyState(), smokingRuns: [{ start: T0 }] };
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
