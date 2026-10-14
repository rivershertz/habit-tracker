import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { currentRunOf, nextSmokeMilestone } from '../logic/smoking';
import type { SmokingRun } from '../logic/types';
import { useNow } from '../store/store';
import { CountUp } from './CountUp';
import { Ring } from './Ring';

const pad = (n: number) => String(n).padStart(2, '0');

/** Largest whole unit left: "80d", "5h", "12m". */
function fmtLeft(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  if (totalMin >= 1440) return `${Math.floor(totalMin / 1440)}d`;
  if (totalMin >= 60) return `${Math.floor(totalMin / 60)}h`;
  return `${totalMin}m`;
}

interface Props {
  /** chip text, e.g. "Smoke-free" */
  label: string;
  glyph: ReactNode;
  color: string;
  runs: SmokingRun[];
  onOpen: () => void;
}

/** A live "time since" counter for a habit you're quitting. */
export function QuitCard({ label, glyph, color, runs, onOpen }: Props) {
  const tick = useNow(1000);
  const run = currentRunOf(runs, tick);
  const next = nextSmokeMilestone(run.ms);
  const seconds = Math.floor((run.ms % 60_000) / 1000);
  const pct = Math.round(next.progress * 100);

  return (
    <motion.section
      className="card smoke-card"
      style={{ ['--accent' as string]: color }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <button className="card-hit" onClick={onOpen} aria-label={`Open ${label} details`} />
      <div className="smoke-head">
        <span className="chip">
          {glyph} {label}
        </span>
        <span className="chip ghost">Next goal · {next.label}</span>
      </div>

      <div className="smoke-body">
        <div className="smoke-count">
          <div className="big-num">
            <CountUp value={run.days} />
            <span className="big-unit">{run.days === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="clock" aria-label="Time without a slip">
            <span>{pad(run.hours)}</span>
            <i>h</i>
            <span>{pad(run.minutes)}</span>
            <i>m</i>
            <motion.span
              key={seconds}
              initial={{ opacity: 0.35, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {pad(seconds)}
            </motion.span>
            <i>s</i>
          </div>
        </div>
        <div role="img" aria-label={`${pct}% of the way to ${next.label}`} title={`${pct}% of the way to ${next.label}`}>
          <Ring size={96} stroke={7} progress={next.progress} color={color}>
            <div className="ring-label">
              <b>{fmtLeft(next.remainingMs)}</b>
              <small>to go</small>
            </div>
          </Ring>
        </div>
      </div>
    </motion.section>
  );
}
