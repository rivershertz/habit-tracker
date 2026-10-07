import { motion } from 'motion/react';
import { currentRun, nextSmokeMilestone } from '../logic/smoking';
import { useNow, useStore } from '../store/store';
import { CountUp } from './CountUp';
import { COLORS } from './fx';
import { WindIcon } from './icons';
import { Ring } from './Ring';

const pad = (n: number) => String(n).padStart(2, '0');

export function fmtRemaining(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function SmokeCard({ onOpen }: { onOpen: () => void }) {
  const { state } = useStore();
  const tick = useNow(1000);
  const run = currentRun(state, tick);
  const next = nextSmokeMilestone(run.ms);
  const seconds = Math.floor((run.ms % 60_000) / 1000);

  return (
    <motion.section
      className="card smoke-card"
      style={{ ['--accent' as string]: COLORS.smoke }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <button className="card-hit" onClick={onOpen} aria-label="Open smoke-free details" />
      <div className="smoke-head">
        <span className="chip">
          <WindIcon size={14} /> Smoke-free
        </span>
        <span className="chip ghost">Next · {next.label}</span>
      </div>

      <div className="smoke-body">
        <div className="smoke-count">
          <div className="big-num">
            <CountUp value={run.days} />
            <span className="big-unit">{run.days === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="clock" aria-label="Time smoke-free">
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
        <Ring size={96} stroke={7} progress={next.progress} color={COLORS.smoke}>
          <div className="ring-label">
            <b>{Math.round(next.progress * 100)}%</b>
            <small>{fmtRemaining(next.remainingMs)}</small>
          </div>
        </Ring>
      </div>
    </motion.section>
  );
}
