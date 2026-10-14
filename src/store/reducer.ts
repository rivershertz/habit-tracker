import { evaluateAchievements, type AchievementStatus } from '../logic/achievements';
import { closeAndOpenRuns, relapse, startQuit } from '../logic/smoking';
import { isQuit, runsOf, type Habit, type HabitId, type State } from '../logic/types';
import { levelForXp, totalXp, type LevelInfo } from '../logic/xp';
import { cleanHabit, DAY_KEY } from './storage';

export type Action =
  | { type: 'startQuit'; ts: number }
  | { type: 'relapse'; now: number }
  | { type: 'setCheckin'; habit: HabitId; day: string; on: boolean }
  | { type: 'markSeen'; ids: string[]; level: number }
  /** `quitStart` (epoch ms) is when the counter of a 'quit' habit starts */
  | { type: 'addHabit'; habit: Habit; quitStart?: number }
  | { type: 'removeHabit'; id: HabitId }
  /** a slip on a custom quit habit: restarts its counter */
  | { type: 'slip'; habit: HabitId; now: number };

export function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'startQuit':
      return startQuit(state, action.ts);
    case 'relapse':
      return relapse(state, action.now);
    case 'setCheckin': {
      const habit = state.habits.find((h) => h.id === action.habit);
      if (!DAY_KEY.test(action.day) || !habit || isQuit(habit)) return state;
      const list = state.checkins[action.habit] ?? [];
      const has = list.includes(action.day);
      if (action.on === has) return state; // idempotent: same reference, nothing to celebrate
      const next = action.on ? [...list, action.day].sort() : list.filter((d) => d !== action.day);
      return { ...state, checkins: { ...state.checkins, [action.habit]: next } };
    }
    case 'addHabit': {
      const habit = cleanHabit(action.habit);
      if (!habit || habit.builtIn || state.habits.some((h) => h.id === habit.id)) return state;
      const habits = [...state.habits, habit];
      if (isQuit(habit)) {
        const start = action.quitStart;
        if (start === undefined || !Number.isFinite(start)) return state;
        return { ...state, habits, quitRuns: { ...state.quitRuns, [habit.id]: [{ start }] } };
      }
      return { ...state, habits, checkins: { ...state.checkins, [habit.id]: [] } };
    }
    case 'removeHabit': {
      const target = state.habits.find((h) => h.id === action.id);
      if (!target || target.builtIn) return state;
      const { [action.id]: _removed, ...checkins } = state.checkins;
      const { [action.id]: _runs, ...quitRuns } = state.quitRuns;
      return { ...state, habits: state.habits.filter((h) => h !== target), checkins, quitRuns };
    }
    case 'slip': {
      const habit = state.habits.find((h) => h.id === action.habit);
      if (!habit || !isQuit(habit)) return state;
      return { ...state, quitRuns: { ...state.quitRuns, [habit.id]: closeAndOpenRuns(runsOf(state, habit.id), action.now) } };
    }
    case 'markSeen': {
      const seen = new Set([...state.seenAchievements, ...action.ids]);
      return {
        ...state,
        seenAchievements: [...seen],
        seenLevel: Math.max(state.seenLevel, action.level),
      };
    }
  }
}

export interface Pending {
  achievements: AchievementStatus[];
  /** set when the current level is higher than the last celebrated one */
  level: LevelInfo | null;
}

export function pendingCelebrations(state: State, now: number): Pending {
  const seen = new Set(state.seenAchievements);
  const achievements = evaluateAchievements(state, now).filter((a) => a.unlocked && !seen.has(a.id));
  const info = levelForXp(totalXp(state, now));
  return { achievements, level: info.level > state.seenLevel ? info : null };
}
