export type HabitId = string;

export interface Habit {
  id: HabitId;
  name: string;
  /** a single emoji (built-ins render their own SVG icon instead) */
  icon: string;
  color: string;
  /** 'YYYY-MM-DD' the habit was added; it only counts toward perfect days from then on */
  since: string;
  builtIn?: boolean;
}

export interface SmokingRun {
  /** epoch ms */
  start: number;
  /** epoch ms; absent = the current, still-running streak */
  end?: number;
}

export interface State {
  version: 2;
  smokingRuns: SmokingRun[];
  habits: Habit[];
  /** local 'YYYY-MM-DD' keys per habit id, unique and sorted ascending */
  checkins: Record<HabitId, string[]>;
  seenAchievements: string[];
  seenLevel: number;
}

/** Always counted, whatever day they're compared against. */
export const BUILT_IN_SINCE = '0000-01-01';

export const defaultHabits = (): Habit[] => [
  { id: 'workout', name: 'Workout', icon: '💪', color: '#ff7a45', since: BUILT_IN_SINCE, builtIn: true },
  { id: 'reading', name: 'Reading', icon: '📖', color: '#9b7bff', since: BUILT_IN_SINCE, builtIn: true },
];

export const emptyState = (): State => ({
  version: 2,
  smokingRuns: [],
  habits: defaultHabits(),
  checkins: { workout: [], reading: [] },
  seenAchievements: [],
  seenLevel: 1,
});

/** Check-ins of a habit (empty for unknown ids). */
export const datesOf = (s: State, id: HabitId): string[] => s.checkins[id] ?? [];

export const HABIT_COLORS = ['#4da3ff', '#ff5fa2', '#f5d90a', '#2ee6e6', '#ff7a45', '#9b7bff', '#7bdc4f', '#ff6b6b'];

/** Quick picks; any other emoji can be chosen from the full picker. */
export const HABIT_EMOJIS = ['🧘', '💧', '🥗', '😴', '✍️', '🎸', '🏃', '🚴', '🧠', '🌅', '🙏', '💊', '🧹', '💻', '🎨'];
