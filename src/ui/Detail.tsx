import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { todayKey } from '../logic/dates';
import { bestRunDays, currentRun, smokeFreeBlockDates, smokeFreeDays } from '../logic/smoking';
import { computeStreaks } from '../logic/streaks';
import type { HabitId } from '../logic/types';
import { useStore } from '../store/store';
import { originOf, useActions } from './actions';
import { CountUp } from './CountUp';
import { COLORS } from './fx';
import { BookIcon, ChevronLeftIcon, DumbbellIcon, WindIcon } from './icons';
import { Heatmap } from './Heatmap';
import type { DetailId } from './Today';

const META: Record<DetailId, { title: string; color: string; Icon: ComponentType<{ size?: number }> }> = {
  smoke: { title: 'Smoke-free', color: COLORS.smoke, Icon: WindIcon },
  workout: { title: 'Workout', color: COLORS.workout, Icon: DumbbellIcon },
  reading: { title: 'Reading', color: COLORS.reading, Icon: BookIcon },
};

const fmtDay = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function Stat({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="stat">
      <b>
        <CountUp value={value} />
        {unit && <small>{unit}</small>}
      </b>
      <span>{label}</span>
    </div>
  );
}

export function Detail({ id, onClose }: { id: DetailId; onClose: () => void }) {
  const { state, now } = useStore();
  const { check, uncheck, smoked } = useActions();
  const { title, color, Icon } = META[id];
  const today = todayKey(now);
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (confirm ? setConfirm(false) : onClose());
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, confirm]);

  const isSmoke = id === 'smoke';
  const habit: HabitId | null = isSmoke ? null : id;

  const marked = useMemo(
    () => new Set(isSmoke ? smokeFreeBlockDates(state, now) : state.checkins[id]),
    [isSmoke, state, now, id],
  );

  const run = currentRun(state, now);
  const bestRun = bestRunDays(state, now);
  const streaks = habit ? computeStreaks(state.checkins[habit], today) : null;
  const restarts = state.smokingRuns.filter((r) => r.end !== undefined).length;
  const runs = [...state.smokingRuns].reverse();

  const onToggle = habit
    ? (day: string, el: HTMLElement) =>
        marked.has(day) ? uncheck(habit, day) : check(habit, day, originOf(el), day === today)
    : undefined;

  return (
    <motion.div
      className="sheet"
      style={{ ['--accent' as string]: color }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 34 }}
      role="dialog"
      aria-label={`${title} details`}
    >
      <div className="sheet-inner">
        <header className="sheet-head">
          <button className="icon-btn" onClick={onClose} aria-label="Back">
            <ChevronLeftIcon size={20} />
          </button>
          <div className="sheet-title">
            <span className="habit-icon sm">
              <Icon size={16} />
            </span>
            <h2>{title}</h2>
          </div>
          <span style={{ width: 40 }} />
        </header>

        <AnimatePresence>
          {note && (
            <motion.p className="note" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {note}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="stats">
          {isSmoke ? (
            <>
              <Stat label="Current" value={run.days} unit="d" />
              <Stat label="Best run" value={bestRun} unit="d" />
              <Stat label="Restarts" value={restarts} />
            </>
          ) : (
            <>
              <Stat label="Current streak" value={streaks!.current} unit="d" />
              <Stat label="Best streak" value={streaks!.best} unit="d" />
              <Stat label="Total days" value={streaks!.total} />
            </>
          )}
        </div>

        <section className="panel">
          <h4>Last 18 weeks</h4>
          <Heatmap today={today} marked={marked} color={color} onToggle={onToggle} />
          {!isSmoke && <p className="hint">Tap any day to log or undo it.</p>}
        </section>

        {isSmoke && (
          <>
            <section className="panel">
              <h4>Your runs</h4>
              <ul className="runs">
                {runs.map((r) => (
                  <li key={r.start}>
                    <span>
                      {fmtDay(r.start)} → {r.end === undefined ? 'now' : fmtDay(r.end)}
                    </span>
                    <b>{smokeFreeDays(r, now)} days</b>
                  </li>
                ))}
              </ul>
            </section>

            <button className="slip-btn" onClick={() => setConfirm(true)}>
              I smoked
            </button>
          </>
        )}
      </div>

      <AnimatePresence>
        {confirm && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirm(false)}>
            <motion.div
              className="modal"
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>It happens.</h3>
              <p>
                Resetting starts a fresh counter.{' '}
                {bestRun > 0 ? `Your ${bestRun}-day best run stays on the record, and every` : 'Every'} smoke-free day you
                earned keeps its XP.
              </p>
              <div className="modal-actions">
                <button className="btn ghost" onClick={() => setConfirm(false)}>
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    smoked();
                    setConfirm(false);
                    setNote(
                      bestRun > 0
                        ? `Fresh start. You've already gone ${bestRun} days once — you can do it again.`
                        : 'Fresh start. Every day counts — begin again.',
                    );
                  }}
                >
                  Reset counter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
