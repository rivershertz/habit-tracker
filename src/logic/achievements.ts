import { daysBetween } from './dates';
import { bestRunDays } from './smoking';
import { computeStreaks, streakLengthAt } from './streaks';
import { datesOf, type Habit, type State } from './types';
import { levelForXp, perfectDays, totalXp } from './xp';

/** A habit id, or one of the fixed groups below. */
export type AchievementGroup = string;
export const SMOKE_GROUP = 'smoke';
export const SPECIAL_GROUP = 'special';
export const MASTERY_GROUP = 'mastery';

export type Tier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export const TIERS: Tier[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

/** Facts shared by many achievements, computed once per evaluation. */
interface Ctx {
  state: State;
  now: number;
  perfect: string[];
  xp: number;
}

export interface AchievementDef {
  id: string;
  group: AchievementGroup;
  tier: Tier;
  title: string;
  desc: string;
  icon: string;
  /** current value toward `target` */
  value: (c: Ctx) => number;
  target: number;
}

export interface AchievementStatus extends Omit<AchievementDef, 'value' | 'target'> {
  unlocked: boolean;
  /** 0..1 */
  progress: number;
}

const unique = (dates: string[]) => [...new Set(dates)].sort();

/** Longest run of consecutive days in a sorted, unique list. */
function longestRun(sorted: string[]): number {
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && daysBetween(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

const allDays = (s: State) => unique(s.habits.flatMap((h) => datesOf(s, h.id)));

function longestGapReturn({ state }: Ctx): number {
  const all = allDays(state);
  let gap = 0;
  for (let i = 1; i < all.length; i++) gap = Math.max(gap, daysBetween(all[i - 1], all[i]) - 1);
  return gap;
}

/** Most different habits checked in on a single day. */
function mostHabitsInADay({ state }: Ctx): number {
  const count = new Map<string, number>();
  for (const h of state.habits) for (const d of new Set(datesOf(state, h.id))) count.set(d, (count.get(d) ?? 0) + 1);
  return Math.max(0, ...count.values());
}

/** Best day-ending streak that every habit (existing that day) held at the same time. */
function sharedStreak({ state }: Ctx): number {
  let best = 0;
  for (const d of allDays(state)) {
    const active = state.habits.filter((h) => h.since <= d);
    if (active.length < 2) continue;
    best = Math.max(best, Math.min(...active.map((h) => streakLengthAt(datesOf(state, h.id), d))));
  }
  return best;
}

interface HabitNames {
  first: [string, string];
  streaks: [string, string, string, string, string];
  totals: [string, string, string];
  icon: string;
}

const HABIT_NAMES: Record<string, HabitNames> = {
  workout: {
    first: ['First Rep', 'Log your first workout'],
    streaks: ['Warm-up', 'Iron Week', 'Iron Month', 'Centurion', 'Year of Iron'],
    totals: ['Gym Rat', 'Steel Forged', 'Titan'],
    icon: '🔥',
  },
  reading: {
    first: ['First Page', 'Log your first reading day'],
    streaks: ['Opening Chapter', 'Page Turner', 'Bookworm', 'Library Card', 'Scholar'],
    totals: ['Well Read', 'Living Library', 'Sage of Pages'],
    icon: '📚',
  },
};

const genericNames = (h: Habit): HabitNames => ({
  first: ['First Step', `Check in ${h.name} for the first time`],
  streaks: ['Spark', 'On a Roll', 'Unstoppable', 'Centurion', 'Immortal'],
  totals: ['Dedicated', 'Devoted', 'Lifer'],
  icon: '🔥',
});

const STREAK_STEPS: [number, Tier][] = [
  [3, 'common'],
  [7, 'rare'],
  [30, 'epic'],
  [100, 'legendary'],
  [365, 'mythic'],
];
const TOTAL_STEPS: [number, Tier, string][] = [
  [50, 'rare', '🏅'],
  [250, 'epic', '💎'],
  [1000, 'legendary', '🗿'],
];

function habitDefs(h: Habit): AchievementDef[] {
  const n = HABIT_NAMES[h.id] ?? genericNames(h);
  const best = ({ state }: Ctx) => computeStreaks(datesOf(state, h.id), '9999-12-31').best;
  const total = ({ state }: Ctx) => new Set(datesOf(state, h.id)).size;
  return [
    { id: `first-${h.id}`, group: h.id, tier: 'common', title: n.first[0], desc: n.first[1], icon: h.icon, value: total, target: 1 },
    ...STREAK_STEPS.map(([days, tier], i): AchievementDef => ({
      id: `${h.id}-streak-${days}`,
      group: h.id,
      tier,
      title: n.streaks[i],
      desc: `${h.name} ${days} days in a row`,
      icon: tier === 'mythic' ? '👑' : n.icon,
      value: best,
      target: days,
    })),
    ...TOTAL_STEPS.map(([days, tier, icon], i): AchievementDef => ({
      id: `${h.id}-total-${days}`,
      group: h.id,
      tier,
      title: n.totals[i],
      desc: `${h.name} on ${days.toLocaleString('en-US')} days in total`,
      icon,
      value: total,
      target: days,
    })),
  ];
}

const smokeDef = (n: number, tier: Tier, title: string, desc: string, icon: string): AchievementDef => ({
  id: `smoke-${n}d`,
  group: SMOKE_GROUP,
  tier,
  title,
  desc,
  icon,
  value: ({ state, now }) => bestRunDays(state, now),
  target: n,
});

const SMOKE_DEFS: AchievementDef[] = [
  smokeDef(1, 'common', 'Day One', 'A full day smoke-free', '🌱'),
  smokeDef(3, 'common', 'Nicotine Gone', '3 days smoke-free — nicotine has left your body', '🍃'),
  smokeDef(7, 'rare', 'One Week Free', '7 days smoke-free', '🌿'),
  smokeDef(14, 'rare', 'Two Weeks Strong', '14 days smoke-free', '🌳'),
  smokeDef(30, 'epic', 'Breathing Easy', '30 days smoke-free', '🫁'),
  smokeDef(90, 'epic', 'Lungs Awakening', '90 days smoke-free', '🌬️'),
  smokeDef(180, 'legendary', 'Half a Year Free', '180 days smoke-free', '🏔️'),
  smokeDef(365, 'legendary', 'A Year Free', '365 days smoke-free', '👑'),
  smokeDef(730, 'mythic', 'Reborn', 'Two whole years smoke-free', '🌍'),
];

const level = (c: Ctx) => levelForXp(c.xp).level;

const levelDef = (n: number, tier: Tier, title: string, icon: string): AchievementDef => ({
  id: `level-${n}`,
  group: MASTERY_GROUP,
  tier,
  title,
  desc: `Reach level ${n}`,
  icon,
  value: level,
  target: n,
});

const MASTERY_DEFS: AchievementDef[] = [
  levelDef(5, 'common', 'Challenger', '🥉'),
  levelDef(10, 'rare', 'Contender', '🥈'),
  levelDef(25, 'epic', 'Master', '🥇'),
  levelDef(40, 'legendary', 'Legend', '🏆'),
  levelDef(60, 'mythic', 'Ascended', '🌌'),
  {
    id: 'xp-10000',
    group: MASTERY_GROUP,
    tier: 'epic',
    title: 'Five Figures',
    desc: 'Earn 10,000 XP',
    icon: '💰',
    value: (c) => c.xp,
    target: 10_000,
  },
];

const SPECIAL_DEFS: AchievementDef[] = [
  {
    id: 'perfect-day',
    group: SPECIAL_GROUP,
    tier: 'common',
    title: 'Perfect Day',
    desc: 'Hit every habit and stay smoke-free on the same day',
    icon: '⭐',
    value: (c) => c.perfect.length,
    target: 1,
  },
  {
    id: 'perfect-25',
    group: SPECIAL_GROUP,
    tier: 'rare',
    title: 'Perfectionist',
    desc: '25 perfect days in total',
    icon: '✨',
    value: (c) => c.perfect.length,
    target: 25,
  },
  {
    id: 'perfect-week',
    group: SPECIAL_GROUP,
    tier: 'epic',
    title: 'Flawless Week',
    desc: '7 perfect days in a row',
    icon: '🌟',
    value: (c) => longestRun(c.perfect),
    target: 7,
  },
  {
    id: 'perfect-month',
    group: SPECIAL_GROUP,
    tier: 'mythic',
    title: 'Flawless Month',
    desc: '30 perfect days in a row',
    icon: '💫',
    value: (c) => longestRun(c.perfect),
    target: 30,
  },
  {
    id: 'grand-slam',
    group: SPECIAL_GROUP,
    tier: 'epic',
    title: 'Grand Slam',
    desc: 'Hold a 7-day streak on every habit at once',
    icon: '🎯',
    value: sharedStreak,
    target: 7,
  },
  {
    id: 'pantheon',
    group: SPECIAL_GROUP,
    tier: 'legendary',
    title: 'Pantheon',
    desc: 'Hold a 30-day streak on every habit at once',
    icon: '🏛️',
    value: sharedStreak,
    target: 30,
  },
  {
    id: 'architect',
    group: SPECIAL_GROUP,
    tier: 'common',
    title: 'Architect',
    desc: 'Create your own habit',
    icon: '🛠️',
    value: ({ state }) => state.habits.filter((h) => !h.builtIn).length,
    target: 1,
  },
  {
    id: 'juggler',
    group: SPECIAL_GROUP,
    tier: 'epic',
    title: 'Juggler',
    desc: 'Check in 5 different habits on the same day',
    icon: '🤹',
    value: mostHabitsInADay,
    target: 5,
  },
  {
    id: 'comeback',
    group: SPECIAL_GROUP,
    tier: 'rare',
    title: 'Comeback',
    desc: 'Return to a habit after 3+ missed days',
    icon: '🚀',
    value: longestGapReturn,
    target: 3,
  },
  {
    id: 'phoenix',
    group: SPECIAL_GROUP,
    tier: 'epic',
    title: 'Phoenix Rising',
    desc: 'Return to a habit after 30+ missed days',
    icon: '🦅',
    value: longestGapReturn,
    target: 30,
  },
];

/** Every achievement for the current set of habits, in display order. */
export function achievementDefs(state: State): AchievementDef[] {
  return [...SMOKE_DEFS, ...state.habits.flatMap(habitDefs), ...SPECIAL_DEFS, ...MASTERY_DEFS];
}

export function evaluateAchievements(state: State, now: number): AchievementStatus[] {
  const ctx: Ctx = { state, now, perfect: perfectDays(state, now), xp: totalXp(state, now) };
  return achievementDefs(state).map(({ value, target, ...meta }) => {
    const v = value(ctx);
    return { ...meta, unlocked: v >= target, progress: Math.max(0, Math.min(1, v / target)) };
  });
}

export const unlockedIds = (state: State, now: number): string[] =>
  evaluateAchievements(state, now)
    .filter((a) => a.unlocked)
    .map((a) => a.id);
