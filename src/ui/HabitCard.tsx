import { AnimatePresence, motion } from 'motion/react';
import { todayKey } from '../logic/dates';
import { computeStreaks } from '../logic/streaks';
import type { Habit } from '../logic/types';
import { useStore } from '../store/store';
import { originOf, useActions } from './actions';
import { CheckIcon, FlameIcon, HabitGlyph, UndoIcon } from './icons';
import { Ring } from './Ring';
import { CountUp } from './CountUp';

const LABELS: Record<string, { todo: string; done: string }> = {
  workout: { todo: 'Get your daily workout in', done: 'Crushed it today' },
  reading: { todo: 'Read a few pages', done: 'Pages turned today' },
};
const DEFAULT_LABELS = { todo: 'Check in today', done: 'Done for today' };

export function HabitCard({ habit: h, onOpen }: { habit: Habit; onOpen: () => void }) {
  const { state, now } = useStore();
  const { check, uncheck } = useActions();
  const { id: habit, name: title, color } = h;
  const { todo: todoLabel, done: doneLabel } = LABELS[habit] ?? DEFAULT_LABELS;
  const today = todayKey(now);
  const dates = state.checkins[habit] ?? [];
  const done = dates.includes(today);
  const { current, best } = computeStreaks(dates, today);
  const atRisk = !done && current > 0;

  return (
    <motion.section
      layout
      className={`card habit-card${done ? ' is-done' : ''}`}
      style={{ ['--accent' as string]: color }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <button className="card-hit" onClick={onOpen} aria-label={`Open ${title} details`} />
      <div className="habit-main">
        <div className="habit-icon">
          <HabitGlyph habit={h} size={20} />
        </div>
        <div className="habit-text">
          <h3>{title}</h3>
          <p className={atRisk ? 'risk' : undefined}>
            {done ? doneLabel : atRisk ? `Keep your ${current}-day streak alive` : todoLabel}
          </p>
          <div className="streak-row">
            <span className={`streak${current > 0 ? ' lit' : ''}`}>
              <FlameIcon size={14} />
              <CountUp value={current} />
              <span className="streak-unit">day streak</span>
            </span>
            {best > current && <span className="best">Best {best}</span>}
          </div>
        </div>
      </div>

      <div className="check-wrap">
        <motion.button
          className="check-btn"
          aria-label={done ? `${title} logged for today` : `Log ${title} for today`}
          aria-pressed={done}
          disabled={done}
          whileTap={done ? undefined : { scale: 0.86 }}
          whileHover={done ? undefined : { scale: 1.06 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          onClick={(e) => check(habit, today, originOf(e.currentTarget))}
        >
          <Ring size={64} stroke={5} progress={done ? 1 : 0} color={color}>
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.span
                  key="done"
                  className="check-mark"
                  initial={{ scale: 0, rotate: -40 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 14 }}
                >
                  <CheckIcon size={26} stroke={3} />
                </motion.span>
              ) : (
                <motion.span key="todo" className="check-empty" exit={{ scale: 0.6, opacity: 0 }} />
              )}
            </AnimatePresence>
          </Ring>
        </motion.button>
        <AnimatePresence>
          {done && (
            <motion.button
              className="undo"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => uncheck(habit, today)}
            >
              <UndoIcon size={12} /> Undo
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
