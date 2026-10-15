export type HabitId = string;

/** 'check' = tap in every day; 'quit' = counts up on its own until you slip */
export type HabitKind = 'check' | 'quit';

export interface Habit {
  id: HabitId;
  name: string;
  /** a single emoji (built-ins render their own SVG icon instead) */
  icon: string;
  color: string;
  /** 'YYYY-MM-DD' the habit was added; it only counts toward perfect days from then on */
  since: string;
  /** absent = 'check' */
  kind?: HabitKind;
  builtIn?: boolean;
}

export const isQuit = (h: Habit) => h.kind === 'quit';

export interface SmokingRun {
  /** epoch ms */
  start: number;
  /** epoch ms; absent = the current, still-running streak */
  end?: number;
}

export interface State {
  version: 3;
  /** the original built-in smoke counter; only pre-v3 users have runs here (new users add a quit habit) */
  smokingRuns: SmokingRun[];
  habits: Habit[];
  /** local 'YYYY-MM-DD' keys per habit id, unique and sorted ascending */
  checkins: Record<HabitId, string[]>;
  /** runs of each custom 'quit' habit (legacy smoking keeps its own `smokingRuns`) */
  quitRuns: Record<HabitId, SmokingRun[]>;
  seenAchievements: string[];
  seenLevel: number;
}

/** Always counted, whatever day they're compared against. */
export const BUILT_IN_SINCE = '0000-01-01';

/** Workout and Reading shipped built in before v3; users who started then keep them. */
export const defaultHabits = (): Habit[] => [
  { id: 'workout', name: 'Workout', icon: '💪', color: '#ff7a45', since: BUILT_IN_SINCE, builtIn: true },
  { id: 'reading', name: 'Reading', icon: '📖', color: '#9b7bff', since: BUILT_IN_SINCE, builtIn: true },
];

export const BUILT_IN_IDS = new Set(['workout', 'reading']);

/** A first-timer: no habits yet, they pick their own in onboarding. */
export const emptyState = (): State => ({
  version: 3,
  smokingRuns: [],
  habits: [],
  checkins: {},
  quitRuns: {},
  seenAchievements: [],
  seenLevel: 1,
});

/** The shape every pre-v3 user had: the two built-ins (and smoking, once onboarded). */
export const legacyState = (): State => ({
  ...emptyState(),
  habits: defaultHabits(),
  checkins: { workout: [], reading: [] },
});

/** Only users from before v3 have the built-in smoke-free counter. */
export const tracksSmoking = (s: State) => s.smokingRuns.length > 0;

export const newHabitId = () => `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Check-ins of a habit (empty for unknown ids). */
export const datesOf = (s: State, id: HabitId): string[] => s.checkins[id] ?? [];

/** Runs of a quit habit (empty for unknown ids). */
export const runsOf = (s: State, id: HabitId): SmokingRun[] => s.quitRuns[id] ?? [];

export const HABIT_COLORS = ['#4da3ff', '#ff5fa2', '#f5d90a', '#2ee6e6', '#ff7a45', '#9b7bff', '#7bdc4f', '#ff6b6b'];

/** Quick picks; any other emoji can be chosen from the full picker. */
export const HABIT_EMOJIS = ['🧘', '💧', '🥗', '😴', '✍️', '🎸', '🏃', '🚴', '🧠', '🌅', '🙏', '💊', '🧹', '💻', '🎨'];
