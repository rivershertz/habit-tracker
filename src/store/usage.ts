import { daysBetween } from '../logic/dates';
import { DAY_KEY, type StorageLike } from './storage';

/**
 * Anonymous usage stats. Once per local day the app sends a few GoatCounter events built from
 * coarse, locally computed buckets: how many of the last 7 days the app was opened, how long ago
 * it was first opened, and whether it runs installed or in a browser tab. No id, no habit data,
 * nothing that tells two devices apart is ever sent — the open history below never leaves the device.
 */
export const USAGE_KEY = 'ascend:usage';

/** GoatCounter site code (https://<code>.goatcounter.com). Empty disables analytics. */
export const GOATCOUNTER_CODE = 'rivshe-ascend';

export interface Usage {
  /** first day the app was opened on this device */
  first: string;
  /** days the app was opened, last 30 at most */
  opens: string[];
  /** last day events were sent */
  ping?: string;
}

const KEEP_DAYS = 30;

export function ageBucket(days: number): string {
  if (days <= 0) return 'day0';
  if (days < 7) return '1-6d';
  if (days < 30) return '1-4w';
  if (days < 90) return '1-3m';
  return '3m+';
}

/** Validate whatever was stored; anything unusable is dropped rather than trusted. */
export function parseUsage(text: string | null): Partial<Usage> {
  try {
    const v: unknown = text ? JSON.parse(text) : null;
    if (typeof v !== 'object' || v === null) return {};
    const { first, opens, ping } = v as Record<string, unknown>;
    return {
      first: typeof first === 'string' && DAY_KEY.test(first) ? first : undefined,
      opens: Array.isArray(opens) ? opens.filter((d): d is string => typeof d === 'string' && DAY_KEY.test(d)) : [],
      ping: typeof ping === 'string' && DAY_KEY.test(ping) ? ping : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Record an open on `today`. Returns the updated usage and the events to send — none if they
 * were already sent today. `seedFirst` backdates the first-open day for people who used the app
 * before usage was recorded (their earliest check-in).
 */
export function recordOpen(
  prev: Partial<Usage>,
  today: string,
  installed: boolean,
  seedFirst?: string,
): { usage: Usage; events: string[] } {
  const candidates = [prev.first, seedFirst, today].filter((d): d is string => !!d && daysBetween(d, today) >= 0);
  const first = candidates.sort()[0];
  const opens = [...new Set([...(prev.opens ?? []), today])]
    .filter((d) => {
      const ago = daysBetween(d, today);
      return ago >= 0 && ago < KEEP_DAYS;
    })
    .sort();
  if (prev.ping === today) return { usage: { first, opens, ping: today }, events: [] };

  const active = opens.filter((d) => daysBetween(d, today) < 7).length;
  const events = [`active-${active}of7`, `age-${ageBucket(daysBetween(first, today))}`, `mode-${installed ? 'installed' : 'browser'}`];
  return { usage: { first, opens, ping: today }, events };
}

/** Respect Global Privacy Control and Do Not Track. */
export function optedOut(nav: { globalPrivacyControl?: boolean; doNotTrack?: string | null }): boolean {
  return nav.globalPrivacyControl === true || nav.doNotTrack === '1';
}

export function countUrl(code: string, event: string): string {
  const q = new URLSearchParams({ p: event, t: event, e: 'true', rnd: Math.random().toString(36).slice(2, 7) });
  return `https://${code}.goatcounter.com/count?${q}`;
}

/** Update local usage and send today's events, if any. Never throws — analytics must not break the app. */
export function trackDailyUsage(opts: {
  storage: StorageLike;
  today: string;
  installed: boolean;
  seedFirst?: string;
  send: (url: string) => void;
  code?: string;
}): string[] {
  const code = opts.code ?? GOATCOUNTER_CODE;
  try {
    if (!code) return [];
    const { usage, events } = recordOpen(parseUsage(opts.storage.getItem(USAGE_KEY)), opts.today, opts.installed, opts.seedFirst);
    opts.storage.setItem(USAGE_KEY, JSON.stringify(usage));
    for (const e of events) opts.send(countUrl(code, e));
    return events;
  } catch {
    return [];
  }
}
