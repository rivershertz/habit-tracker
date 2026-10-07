import { motion } from 'motion/react';
import { useState } from 'react';
import { useStore } from '../store/store';
import { burst, COLORS, haptic } from './fx';
import { BookIcon, DumbbellIcon, WindIcon } from './icons';

const pad = (n: number) => String(n).padStart(2, '0');
const toInputValue = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function Onboarding() {
  const { dispatch } = useStore();
  const [maxMs] = useState(() => Date.now());
  const [value, setValue] = useState(() => toInputValue(maxMs));

  const begin = (e: React.MouseEvent<HTMLButtonElement>) => {
    const parsed = new Date(value).getTime();
    const ts = Number.isFinite(parsed) ? Math.min(parsed, Date.now()) : Date.now();
    const r = e.currentTarget.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, COLORS.smoke);
    haptic([12, 40, 18]);
    setTimeout(() => dispatch({ type: 'startQuit', ts }), 350);
  };

  return (
    <motion.main className="onboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
      <motion.div className="logo" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
        <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3ee6b0" />
              <stop offset="1" stopColor="#9b7bff" />
            </linearGradient>
          </defs>
          <path d="M32 8 52 52H40L32 34 24 52H12z" fill="url(#lg)" />
        </svg>
      </motion.div>
      <motion.h1 initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
        Ascend
      </motion.h1>
      <motion.p className="tagline" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
        Level up by showing up.
      </motion.p>

      <motion.div className="habit-chips" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
        <span style={{ ['--c' as string]: COLORS.smoke }}>
          <WindIcon size={14} /> Smoke-free
        </span>
        <span style={{ ['--c' as string]: COLORS.workout }}>
          <DumbbellIcon size={14} /> Workout
        </span>
        <span style={{ ['--c' as string]: COLORS.reading }}>
          <BookIcon size={14} /> Reading
        </span>
      </motion.div>

      <motion.div className="card onboard-card" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45, type: 'spring', stiffness: 220, damping: 24 }}>
        <label htmlFor="quit">When was your last cigarette?</label>
        <input
          id="quit"
          type="datetime-local"
          value={value}
          max={toInputValue(maxMs)}
          onChange={(e) => setValue(e.target.value)}
        />
        <p className="hint">Your smoke-free counter starts from this moment. Leave it as-is to start fresh right now.</p>
        <motion.button className="btn primary" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }} onClick={begin} disabled={!value}>
          Begin my journey
        </motion.button>
      </motion.div>
    </motion.main>
  );
}
