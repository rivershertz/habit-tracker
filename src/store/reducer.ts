import { evaluateAchievements, type AchievementStatus } from '../logic/achievements';
import { relapse, startQuit } from '../logic/smoking';
import type { HabitId, State } from '../logic/types';
import { levelForXp, totalXp, type LevelInfo } from '../logic/xp';
import { DAY_KEY } from './storage';

export type Action =
  | { type: 'startQuit'; ts: number }
  | { type: 'relapse'; now: number }
  | { type: 'setCheckin'; habit: HabitId; day: string; on: boolean }
  | { type: 'markSeen'; ids: string[]; level: number };

export function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'startQuit':
      return startQuit(state, action.ts);
    case 'relapse':
      return relapse(state, action.now);
    case 'setCheckin': {
      if (!DAY_KEY.test(action.day)) return state;
      const list = state.checkins[action.habit];
      const has = list.includes(action.day);
      if (action.on === has) return state; // idempotent: same reference, nothing to celebrate
      const next = action.on ? [...list, action.day].sort() : list.filter((d) => d !== action.day);
      return { ...state, checkins: { ...state.checkins, [action.habit]: next } };
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
