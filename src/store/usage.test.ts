import { describe, expect, it } from 'vitest';
import { ageBucket, countUrl, optedOut, parseUsage, recordOpen, trackDailyUsage, USAGE_KEY } from './usage';

const memory = (init: Record<string, string> = {}) => {
  const data = { ...init };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => void (data[k] = v),
  };
};

describe('usage', () => {
  it('sends day-0 events on the very first open', () => {
    const { usage, events } = recordOpen({}, '2026-10-15', false);
    expect(usage).toEqual({ first: '2026-10-15', opens: ['2026-10-15'], ping: '2026-10-15' });
    expect(events).toEqual(['active-1of7', 'age-day0', 'mode-browser']);
  });

  it('sends nothing on a second open the same day', () => {
    const first = recordOpen({}, '2026-10-15', true).usage;
    expect(recordOpen(first, '2026-10-15', true).events).toEqual([]);
  });

  it('counts active days in the last 7 and drops opens older than 30 days', () => {
    const prev = { first: '2026-08-01', opens: ['2026-08-01', '2026-10-08', '2026-10-10', '2026-10-14'], ping: '2026-10-14' };
    const { usage, events } = recordOpen(prev, '2026-10-15', true);
    expect(usage.opens).toEqual(['2026-10-08', '2026-10-10', '2026-10-14', '2026-10-15']);
    expect(events).toEqual(['active-3of7', 'age-1-3m', 'mode-installed']);
  });

  it('backdates the first open to an earlier check-in, never to the future', () => {
    expect(recordOpen({}, '2026-10-15', false, '2026-10-01').usage.first).toBe('2026-10-01');
    expect(recordOpen({}, '2026-10-15', false, '2026-11-01').usage.first).toBe('2026-10-15');
  });

  it('buckets install age', () => {
    expect([0, 1, 6, 7, 29, 30, 89, 90].map(ageBucket)).toEqual(['day0', '1-6d', '1-6d', '1-4w', '1-4w', '1-3m', '1-3m', '3m+']);
  });

  it('ignores corrupt or hostile stored data', () => {
    expect(parseUsage('{nope')).toEqual({});
    expect(parseUsage(JSON.stringify({ first: '<img>', opens: ['2026-10-01', 5, 'x'], ping: 1 }))).toEqual({
      first: undefined,
      opens: ['2026-10-01'],
      ping: undefined,
    });
  });

  it('honors GPC and DNT', () => {
    expect(optedOut({ globalPrivacyControl: true })).toBe(true);
    expect(optedOut({ doNotTrack: '1' })).toBe(true);
    expect(optedOut({ doNotTrack: null })).toBe(false);
  });

  it('builds an event-only GoatCounter URL', () => {
    const url = new URL(countUrl('ascend', 'active-3of7'));
    expect(url.origin).toBe('https://ascend.goatcounter.com');
    expect(url.pathname).toBe('/count');
    expect(url.searchParams.get('p')).toBe('active-3of7');
    expect(url.searchParams.get('e')).toBe('true');
    expect([...url.searchParams.keys()].sort()).toEqual(['e', 'p', 'rnd', 't']);
  });

  it('sends nothing and stores nothing without a site code', () => {
    const m = memory();
    const sent: string[] = [];
    expect(trackDailyUsage({ storage: m, today: '2026-10-15', installed: false, send: (u) => sent.push(u), code: '' })).toEqual([]);
    expect(sent).toEqual([]);
    expect(m.data[USAGE_KEY]).toBeUndefined();
  });

  it('sends once per day with a site code', () => {
    const m = memory();
    const sent: string[] = [];
    const run = () => trackDailyUsage({ storage: m, today: '2026-10-15', installed: false, send: (u) => sent.push(u), code: 'ascend' });
    run();
    run();
    expect(sent).toHaveLength(3);
  });
});
