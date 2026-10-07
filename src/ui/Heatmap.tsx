import { motion } from 'motion/react';
import { useMemo } from 'react';
import { addDays, fromDateKey } from '../logic/dates';

interface Props {
  today: string;
  marked: Set<string>;
  color: string;
  weeks?: number;
  /** when set, cells up to today are tappable */
  onToggle?: (day: string, el: HTMLElement) => void;
}

const DOW = ['M', '', 'W', '', 'F', '', ''];

export function Heatmap({ today, marked, color, weeks = 18, onToggle }: Props) {
  const days = useMemo(() => {
    // Monday-start weeks, ending with the current week
    const dow = (fromDateKey(today).getDay() + 6) % 7; // Mon=0
    const start = addDays(today, -(dow + (weeks - 1) * 7));
    return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  }, [today, weeks]);

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-dow" aria-hidden="true">
        {DOW.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="heatmap" style={{ ['--accent' as string]: color, ['--weeks' as string]: weeks }}>
        {days.map((d, i) => {
          const future = d > today;
          const on = marked.has(d);
          if (future) return <span key={d} className="hm-cell future" />;
          const cls = `hm-cell${on ? ' on' : ''}${d === today ? ' today' : ''}`;
          const common = {
            className: cls,
            initial: { scale: 0, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            transition: { delay: Math.min(i * 0.004, 0.5), type: 'spring' as const, stiffness: 400, damping: 22 },
            title: d,
          };
          return onToggle ? (
            <motion.button
              key={d}
              {...common}
              aria-label={`${d}: ${on ? 'logged' : 'not logged'}`}
              aria-pressed={on}
              whileTap={{ scale: 0.7 }}
              onClick={(e) => onToggle(d, e.currentTarget)}
            />
          ) : (
            <motion.span key={d} {...common} />
          );
        })}
      </div>
    </div>
  );
}
