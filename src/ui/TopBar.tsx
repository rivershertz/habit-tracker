import { motion } from 'motion/react';
import { levelForXp, totalXp } from '../logic/xp';
import { useStore } from '../store/store';
import { CountUp } from './CountUp';

export function TopBar({ onOpenJourney }: { onOpenJourney: () => void }) {
  const { state, now } = useStore();
  const xp = totalXp(state, now);
  const info = levelForXp(xp);

  return (
    <header className="topbar">
      <button className="level-chip" onClick={onOpenJourney} aria-label={`Level ${info.level} ${info.rank}. Open journey`}>
        <motion.span
          key={info.level}
          className="level-badge"
          initial={{ scale: 0.4, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 14 }}
        >
          {info.level}
        </motion.span>
        <span className="level-meta">
          <span className="level-rank">{info.rank}</span>
          <span className="level-xp">
            <CountUp value={info.xpIntoLevel} /> / {info.xpForNext} XP
          </span>
        </span>
      </button>
      <div className="xp-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(info.progress * 100)}>
        <motion.div
          className="xp-fill"
          initial={{ width: 0 }}
          animate={{ width: `${info.progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 70, damping: 16 }}
        />
        <motion.span
          key={xp}
          className="xp-flash"
          initial={{ opacity: 0.85 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9 }}
        />
      </div>
    </header>
  );
}
