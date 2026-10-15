import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toDateTimeInput, todayKey } from '../logic/dates';
import { newHabitId, type Habit, type HabitKind } from '../logic/types';
import { useStore } from '../store/store';
import { AddHabit } from './AddHabit';
import { bigBurst, burst, COLORS, haptic } from './fx';
import { CheckIcon, ChevronLeftIcon, PlusIcon } from './icons';
import { ThemePicker } from './ThemePicker';

interface Goal {
  name: string;
  icon: string;
  color: string;
  kind: HabitKind;
}

/** A goal the user picked; `since` is a quit goal's counter start (datetime-local value). */
interface Draft extends Goal {
  since: string;
}

const PRESETS: Goal[] = [
  { name: 'Workout', icon: '💪', color: COLORS.workout, kind: 'check' },
  { name: 'Read', icon: '📖', color: COLORS.reading, kind: 'check' },
  { name: 'Meditate', icon: '🧘', color: '#4da3ff', kind: 'check' },
  { name: 'Drink water', icon: '💧', color: '#2ee6e6', kind: 'check' },
  { name: 'Walk', icon: '🚶', color: '#7bdc4f', kind: 'check' },
  { name: 'Journal', icon: '✍️', color: '#f5d90a', kind: 'check' },
  { name: 'Sleep early', icon: '😴', color: '#9b7bff', kind: 'check' },
  { name: 'Learn', icon: '🧠', color: '#ff5fa2', kind: 'check' },
  { name: 'Smoke-free', icon: '🚭', color: COLORS.smoke, kind: 'quit' },
  { name: 'Alcohol-free', icon: '🍷', color: '#ff6b6b', kind: 'quit' },
  { name: 'No sugar', icon: '🍬', color: '#ff5fa2', kind: 'quit' },
  { name: 'No doomscrolling', icon: '📵', color: '#4da3ff', kind: 'quit' },
];

const SECTIONS: { kind: HabitKind; title: string; sub: string }[] = [
  { kind: 'check', title: 'Build', sub: 'Tap in every day you do it' },
  { kind: 'quit', title: 'Break', sub: 'Counts up on its own until you slip' },
];

const ORBIT = ['💪', '📖', '🧘', '💧', '🚭', '✍️', '🧠', '😴'];

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const page = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -40 }),
};
const list = { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } };
const pop = {
  hidden: { opacity: 0, y: 14, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 320, damping: 24 } },
};

export function Onboarding() {
  const { now, dispatch } = useStore();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [creating, setCreating] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [maxMs] = useState(() => Date.now());

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
    window.scrollTo({ top: 0 });
  };

  const picked = (name: string) => drafts.some((d) => same(d.name, name));
  const toggle = (g: Goal) => {
    haptic(8);
    setDrafts((ds) => (ds.some((d) => same(d.name, g.name)) ? ds.filter((d) => !same(d.name, g.name)) : [...ds, { ...g, since: toDateTimeInput(Date.now()) }]));
  };
  const setSince = (name: string, since: string) => setDrafts((ds) => ds.map((d) => (d.name === name ? { ...d, since } : d)));
  // goals the user made up themselves get their own tiles next to the suggestions
  const custom = drafts.filter((d) => !PRESETS.some((p) => same(p.name, d.name)));

  const begin = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (leaving || drafts.length === 0) return;
    setLeaving(true);
    const r = e.currentTarget.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, drafts[0].color);
    bigBurst();
    haptic([12, 40, 18]);
    const since = todayKey(now);
    setTimeout(() => {
      for (const d of drafts) {
        const habit: Habit = { id: newHabitId(), name: d.name, icon: d.icon, color: d.color, since, ...(d.kind === 'quit' ? { kind: d.kind } : {}) };
        const parsed = new Date(d.since).getTime();
        const quitStart = d.kind === 'quit' ? (Number.isFinite(parsed) ? Math.min(parsed, Date.now()) : Date.now()) : undefined;
        dispatch({ type: 'addHabit', habit, quitStart });
      }
    }, 450);
  };

  return (
    <main className={`onboard onboard-step-${step}`}>
      {step > 0 && (
        <header className="onboard-top">
          <button className="icon-btn" aria-label="Back" onClick={() => go(step - 1)}>
            <ChevronLeftIcon size={20} />
          </button>
          <div className="onboard-steps" aria-label={`Step ${step} of 2`}>
            {[1, 2].map((s) => (
              <i key={s} className={s <= step ? 'on' : ''} />
            ))}
          </div>
          <span className="onboard-top-spacer" />
        </header>
      )}

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        {step === 0 && (
          <motion.section
            key="welcome"
            className="onboard-page onboard-welcome"
            custom={dir}
            variants={page}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22 }}
          >
            <div className="onboard-hero">
              <div className="orbit" aria-hidden="true">
                {ORBIT.map((e, i) => (
                  <span key={e} style={{ ['--i' as string]: i, ['--n' as string]: ORBIT.length }}>
                    <b>{e}</b>
                  </span>
                ))}
              </div>
              <motion.div
                className="logo"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              >
                <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
                  <defs>
                    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" style={{ stopColor: 'var(--logo-a, #3ee6b0)' }} />
                      <stop offset="1" style={{ stopColor: 'var(--logo-b, #9b7bff)' }} />
                    </linearGradient>
                  </defs>
                  <path d="M32 8 52 52H40L32 34 24 52H12z" fill="url(#lg)" />
                </svg>
              </motion.div>
            </div>
            <motion.h1 initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
              Ascend
            </motion.h1>
            <motion.p className="tagline" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
              Level up by showing up.
            </motion.p>

            <motion.div className="onboard-vibe" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
              <span className="field-label">Pick your look</span>
              <ThemePicker />
            </motion.div>

            <motion.button
              className="btn primary"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => go(1)}
            >
              Choose my goals
            </motion.button>
          </motion.section>
        )}

        {step === 1 && (
          <motion.section
            key="goals"
            className="onboard-page"
            custom={dir}
            variants={page}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22 }}
          >
            <h2 className="onboard-title">What do you want to level up?</h2>
            <p className="onboard-sub">Pick as many as you like. You can add more later.</p>

            {SECTIONS.map((sec) => (
              <div key={sec.kind} className="goal-section">
                <h4 className="section-title row">
                  <span>{sec.title}</span>
                  <span className="muted">{sec.sub}</span>
                </h4>
                <motion.div className="goal-grid" variants={list} initial="hidden" animate="show">
                  {[...PRESETS.filter((p) => p.kind === sec.kind), ...custom.filter((c) => c.kind === sec.kind)].map((g) => {
                    const on = picked(g.name);
                    return (
                      <motion.button
                        key={g.name}
                        type="button"
                        className={`goal-tile${on ? ' on' : ''}`}
                        style={{ ['--accent' as string]: g.color }}
                        aria-pressed={on}
                        variants={pop}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => toggle(g)}
                      >
                        <span className="goal-emoji">{g.icon}</span>
                        <span className="goal-name">{g.name}</span>
                        <AnimatePresence>
                          {on && (
                            <motion.span
                              className="goal-check"
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0 }}
                              transition={{ type: 'spring', stiffness: 520, damping: 16 }}
                            >
                              <CheckIcon size={12} stroke={3.5} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </div>
            ))}

            <motion.button className="add-habit" whileTap={{ scale: 0.97 }} onClick={() => setCreating(true)}>
              <PlusIcon size={18} /> Create your own
            </motion.button>

            <div className="onboard-foot">
              <motion.button
                className="btn primary"
                whileTap={drafts.length ? { scale: 0.95 } : undefined}
                disabled={drafts.length === 0}
                onClick={() => go(2)}
              >
                {drafts.length === 0 ? 'Pick at least one' : `Continue with ${drafts.length}`}
              </motion.button>
            </div>
          </motion.section>
        )}

        {step === 2 && (
          <motion.section
            key="ready"
            className="onboard-page"
            custom={dir}
            variants={page}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22 }}
          >
            <h2 className="onboard-title">Your quests</h2>
            <p className="onboard-sub">
              {drafts.length} {drafts.length === 1 ? 'habit' : 'habits'}, every one worth XP from day one.
            </p>

            <motion.ul className="quest-list" variants={list} initial="hidden" animate="show">
              {drafts.map((d) => (
                <motion.li key={d.name} className="card quest-row" style={{ ['--accent' as string]: d.color }} variants={pop}>
                  <div className="quest-main">
                    <span className="habit-icon">
                      <span className="habit-emoji">{d.icon}</span>
                    </span>
                    <div>
                      <b>{d.name}</b>
                      <small>{d.kind === 'quit' ? 'Quit counter' : 'Daily check-in'}</small>
                    </div>
                  </div>
                  {d.kind === 'quit' && (
                    <label className="quest-since">
                      <span>Last time it happened</span>
                      <input
                        className="text-input"
                        type="datetime-local"
                        value={d.since}
                        max={toDateTimeInput(maxMs)}
                        onChange={(e) => setSince(d.name, e.target.value)}
                      />
                    </label>
                  )}
                </motion.li>
              ))}
            </motion.ul>

            <div className="onboard-foot">
              <motion.button className="btn primary" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }} onClick={begin} disabled={leaving}>
                Begin my journey
              </motion.button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creating && (
          <AddHabit
            onClose={() => setCreating(false)}
            taken={drafts}
            onCreate={(h, quitStart) =>
              setDrafts((ds) => [
                ...ds,
                { name: h.name, icon: h.icon, color: h.color, kind: h.kind ?? 'check', since: toDateTimeInput(quitStart ?? Date.now()) },
              ])
            }
          />
        )}
      </AnimatePresence>
    </main>
  );
}
