import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { todayKey } from '../logic/dates';
import { bestRunDays, currentRun, smokeFreeBlockDates, smokeFreeDays } from '../logic/smoking';
import { computeStreaks } from '../logic/streaks';
import { useStore } from '../store/store';
import { originOf, useActions } from './actions';
import { CountUp } from './CountUp';
import { COLORS } from './fx';
import { ChevronLeftIcon, HabitGlyph, TrashIcon, WindIcon } from './icons';
import { Heatmap } from './Heatmap';
import type { DetailId } from './Today';

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
  const { state, now, dispatch } = useStore();
  const { check, uncheck, smoked } = useActions();
  const isSmoke = id === 'smoke';
  const habitObj = isSmoke ? null : state.habits.find((h) => h.id === id) ?? null;
  const title = habitObj?.name ?? 'Smoke-free';
  const color = habitObj?.color ?? COLORS.smoke;
  const glyph: ReactNode = habitObj ? <HabitGlyph habit={habitObj} size={16} /> : <WindIcon size={16} />;
  const today = todayKey(now);
  const [confirm, setConfirm] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirm) setConfirm(false);
      else if (confirmRemove) setConfirmRemove(false);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, confirm, confirmRemove]);

  const habit = habitObj?.id ?? null;

  const marked = useMemo(
    () => new Set(isSmoke ? smokeFreeBlockDates(state, now) : state.checkins[id] ?? []),
    [isSmoke, state, now, id],
  );

  const run = currentRun(state, now);
  const bestRun = bestRunDays(state, now);
  const streaks = habit ? computeStreaks(state.checkins[habit] ?? [], today) : null;
  const restarts = state.smokingRuns.filter((r) => r.end !== undefined).length;
  const runs = [...state.smokingRuns].reverse();

  const onToggle = habit
    ? (day: string, el: HTMLElement) =>
        marked.has(day) ? uncheck(habit, day) : check(habit, day, originOf(el), day === today)
    : undefined;

  if (!isSmoke && !habitObj) return null; // the habit was just removed

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
            <span className="habit-icon sm">{glyph}</span>
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

        {habitObj && !habitObj.builtIn && (
          <button className="slip-btn remove-btn" onClick={() => setConfirmRemove(true)}>
            <TrashIcon size={16} /> Remove habit
          </button>
        )}

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
        {confirmRemove && habitObj && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmRemove(false)}>
            <motion.div
              className="modal"
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Remove {habitObj.name}?</h3>
              <p>
                Its history ({streaks!.total} logged {streaks!.total === 1 ? 'day' : 'days'}), the XP it earned and its badges
                go with it. This can't be undone.
              </p>
              <div className="modal-actions">
                <button className="btn ghost" onClick={() => setConfirmRemove(false)}>
                  Keep it
                </button>
                <button
                  className="btn danger"
                  onClick={() => {
                    onClose();
                    dispatch({ type: 'removeHabit', id: habitObj.id });
                  }}
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
