import type { ReactNode } from 'react';
import type { Habit } from '../logic/types';

interface IconProps {
  size?: number;
  stroke?: number;
  className?: string;
}

const make =
  (paths: ReactNode) =>
  ({ size = 24, stroke = 2, className }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths}
    </svg>
  );

export const FlameIcon = make(
  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
);
export const DumbbellIcon = make(
  <>
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </>,
);
export const BookIcon = make(<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />);
export const WindIcon = make(
  <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2" />,
);
export const CheckIcon = make(<path d="M20 6 9 17l-5-5" />);
export const ChevronLeftIcon = make(<path d="m15 18-6-6 6-6" />);
export const CloseIcon = make(<path d="M18 6 6 18M6 6l12 12" />);
export const HomeIcon = make(<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />);
export const TrophyIcon = make(
  <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />,
);
export const LockIcon = make(
  <>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </>,
);
export const UndoIcon = make(<path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />);
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />);
export const TrashIcon = make(<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />);

/** The built-ins keep their line icons; custom habits show their emoji. */
export function HabitGlyph({ habit, size = 20 }: { habit: Habit; size?: number }) {
  if (habit.id === 'workout') return <DumbbellIcon size={size} />;
  if (habit.id === 'reading') return <BookIcon size={size} />;
  return (
    <span className="habit-emoji" style={{ fontSize: size }}>
      {habit.icon}
    </span>
  );
}
