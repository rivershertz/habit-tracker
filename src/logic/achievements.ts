import { daysBetween } from './dates';
import { bestRunDays } from './smoking';
import { computeStreaks } from './streaks';
import { perfectDays } from './xp';
import type { HabitId, State } from './types';

export type AchievementGroup = 'workout' | 'reading' | 'smoke' | 'special';

export interface AchievementDef {
  id: string;
  group: AchievementGroup;
  title: string;
  desc: string;
  icon: string;
  /** current value toward `target` */
  value: (s: State, now: number) => number;
  target: number;
}

export interface AchievementStatus extends Omit<AchievementDef, 'value' | 'target'> {
  unlocked: boolean;
  /** 0..1 */
  progress: number;
}

const bestStreak = (habit: HabitId) => (s: State) =>
  computeStreaks(s.checkins[habit], '9999-12-31').best;

const total = (habit: HabitId) => (s: State) => new Set(s.checkins[habit]).size;

function longestGapReturn(s: State): number {
  const all = [...new Set([...s.checkins.workout, ...s.checkins.reading])].sort();
  let gap = 0;
  for (let i = 1; i < all.length; i++) gap = Math.max(gap, daysBetween(all[i - 1], all[i]) - 1);
  return gap;
}

const streakDefs = (
  habit: HabitId,
  names: [string, string, string, string, string],
  icon: string,
  verb: string,
): AchievementDef[] =>
  ([3, 7, 30, 100, 365] as const).map((n, i) => ({
    id: `${habit}-streak-${n}`,
    group: habit,
    title: names[i],
    desc: `${verb} ${n} days in a row`,
    icon,
    value: bestStreak(habit),
    target: n,
  }));

const smokeDef = (n: number, title: string, desc: string, icon: string): AchievementDef => ({
  id: `smoke-${n}d`,
  group: 'smoke',
  title,
  desc,
  icon,
  value: (s, now) => bestRunDays(s, now),
  target: n,
});

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-workout',
    group: 'workout',
    title: 'First Rep',
    desc: 'Log your first workout',
    icon: '💪',
    value: total('workout'),
    target: 1,
  },
  ...streakDefs('workout', ['Warm-up', 'Iron Week', 'Iron Month', 'Centurion', 'Year of Iron'], '🔥', 'Work out'),
  {
    id: 'first-reading',
    group: 'reading',
    title: 'First Page',
    desc: 'Log your first reading day',
    icon: '📖',
    value: total('reading'),
    target: 1,
  },
  ...streakDefs('reading', ['Opening Chapter', 'Page Turner', 'Bookworm', 'Library Card', 'Scholar'], '📚', 'Read'),
  smokeDef(1, 'Day One', 'A full day smoke-free', '🌱'),
  smokeDef(3, 'Nicotine Gone', '3 days smoke-free — nicotine has left your body', '🍃'),
  smokeDef(7, 'One Week Free', '7 days smoke-free', '🌿'),
  smokeDef(30, 'Breathing Easy', '30 days smoke-free', '🫁'),
  smokeDef(90, 'Lungs Awakening', '90 days smoke-free', '🌬️'),
  smokeDef(365, 'A Year Free', '365 days smoke-free', '👑'),
  {
    id: 'perfect-day',
    group: 'special',
    title: 'Perfect Day',
    desc: 'Workout, read and stay smoke-free on the same day',
    icon: '⭐',
    value: (s, now) => perfectDays(s, now).length,
    target: 1,
  },
  {
    id: 'comeback',
    group: 'special',
    title: 'Comeback',
    desc: 'Return to a habit after 3+ missed days',
    icon: '🚀',
    value: longestGapReturn,
    target: 3,
  },
];

export function evaluateAchievements(state: State, now: number): AchievementStatus[] {
  return ACHIEVEMENTS.map(({ value, target, ...meta }) => {
    const v = value(state, now);
    return { ...meta, unlocked: v >= target, progress: Math.max(0, Math.min(1, v / target)) };
  });
}

export const unlockedIds = (state: State, now: number): string[] =>
  evaluateAchievements(state, now)
    .filter((a) => a.unlocked)
    .map((a) => a.id);
