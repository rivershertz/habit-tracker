export type HabitId = 'workout' | 'reading';

export interface SmokingRun {
  /** epoch ms */
  start: number;
  /** epoch ms; absent = the current, still-running streak */
  end?: number;
}

export interface State {
  version: 1;
  smokingRuns: SmokingRun[];
  /** local 'YYYY-MM-DD' keys, unique and sorted ascending */
  checkins: Record<HabitId, string[]>;
  seenAchievements: string[];
  seenLevel: number;
}

export const emptyState = (): State => ({
  version: 1,
  smokingRuns: [],
  checkins: { workout: [], reading: [] },
  seenAchievements: [],
  seenLevel: 1,
});
