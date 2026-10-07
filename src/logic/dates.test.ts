import { describe, it, expect } from 'vitest';
import { toDateKey, addDays, todayKey, daysBetween, fromDateKey } from './dates';

describe('dates', () => {
  it('formats local date keys with zero padding', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('addDays moves exactly one calendar day across DST changes', () => {
    for (const tz of ['America/New_York', 'Europe/London', 'Australia/Sydney']) {
      process.env.TZ = tz;
      expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
      expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
      expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
      expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
      expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
      expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
      expect(addDays('2026-04-04', 1)).toBe('2026-04-05');
      expect(addDays('2026-10-03', 1)).toBe('2026-10-04');
      expect(addDays('2026-10-04', 1)).toBe('2026-10-05');
    }
  });

  it('daysBetween counts calendar days regardless of DST', () => {
    process.env.TZ = 'America/New_York';
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
    expect(daysBetween('2026-05-01', '2026-05-01')).toBe(0);
  });

  it('todayKey uses the local calendar day of the timestamp', () => {
    process.env.TZ = 'America/New_York';
    const lateEvening = new Date(2026, 5, 10, 23, 30).getTime();
    expect(todayKey(lateEvening)).toBe('2026-06-10');
  });

  it('fromDateKey round-trips', () => {
    expect(toDateKey(fromDateKey('2026-07-09'))).toBe('2026-07-09');
  });
});
