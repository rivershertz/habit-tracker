import { motion } from 'motion/react';
import { fromDateKey, todayKey } from '../logic/dates';
import { currentRun, currentRunOf } from '../logic/smoking';
import { isQuit, runsOf } from '../logic/types';
import { perfectDays, XP_PERFECT } from '../logic/xp';
import { useStore } from '../store/store';
import { COLORS } from './fx';
import { HabitCard } from './HabitCard';
import { HabitGlyph, PlusIcon, WindIcon } from './icons';
import { GlyphStrip } from './GlyphStrip';
import { QuitCard } from './QuitCard';
import { useTheme } from './theme';

/** 'smoke' or a habit id */
export type DetailId = string;

const greeting = (hour: number) =>
  hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
};

export function Today({ onOpen, onAdd }: { onOpen: (d: DetailId) => void; onAdd: () => void }) {
  const { state, now } = useStore();
  const { theme } = useTheme();
  const today = todayKey(now);
  const quests = [
    { id: 'smoke', label: 'Smoke-free', done: currentRun(state, now).active, color: COLORS.smoke },
    ...state.habits.map((h) => ({
      id: h.id,
      label: h.name,
      done: isQuit(h) ? currentRunOf(runsOf(state, h.id), now).active : (state.checkins[h.id] ?? []).includes(today),
      color: h.color,
    })),
  ];
  const doneCount = quests.filter((q) => q.done).length;
  const allDone = doneCount === quests.length;
  // the bonus only exists once the smoke-free day for `today` has completed, so say so honestly
  const perfectBonusCounted = perfectDays(state, now).includes(today);
  // the widget grid (Nothing theme) pairs check-in tiles; an odd one out spans the full row
  const checkIns = state.habits.filter((h) => !isQuit(h));
  const lone = checkIns.length % 2 === 1 ? checkIns[checkIns.length - 1].id : null;
  const date = fromDateKey(today).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <motion.div className="screen today-screen" variants={container} initial="hidden" animate="show">
      <motion.div className="hello slot-wide" variants={item}>
        <div>
          <h1>{greeting(new Date(now).getHours())}</h1>
          <p>{date}</p>
        </div>
        <div className="quests" aria-label={`${doneCount} of ${quests.length} daily goals done`}>
          {quests.map((q) => (
            <motion.i
              key={q.id}
              className={q.done ? 'on' : ''}
              style={{ ['--c' as string]: q.color }}
              animate={q.done ? { scale: [1, 1.5, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
            />
          ))}
          <span>
            {doneCount}/{quests.length}
          </span>
        </div>
      </motion.div>

      {theme === 'nothing' && (
        <motion.div className="slot slot-wide" variants={item}>
          <GlyphStrip quests={quests} />
        </motion.div>
      )}

      <motion.div className="slot slot-wide" variants={item}>
        <QuitCard
          label="Smoke-free"
          glyph={<WindIcon size={14} />}
          color={COLORS.smoke}
          runs={state.smokingRuns}
          onOpen={() => onOpen('smoke')}
        />
      </motion.div>
      {state.habits.map((h) => (
        <motion.div
          key={h.id}
          className={`slot ${isQuit(h) || h.id === lone ? 'slot-wide' : 'slot-habit'}`}
          variants={item}
        >
          {isQuit(h) ? (
            <QuitCard
              label={h.name}
              glyph={<HabitGlyph habit={h} size={14} />}
              color={h.color}
              runs={runsOf(state, h.id)}
              onOpen={() => onOpen(h.id)}
            />
          ) : (
            <HabitCard habit={h} onOpen={() => onOpen(h.id)} />
          )}
        </motion.div>
      ))}

      <motion.button className="add-habit slot-wide" variants={item} whileTap={{ scale: 0.97 }} onClick={onAdd}>
        <PlusIcon size={18} /> New habit
      </motion.button>

      {allDone && (
        <motion.p className="perfect slot-wide" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          {perfectBonusCounted
            ? `⭐ Perfect day — +${XP_PERFECT} XP bonus earned`
            : `⭐ Every goal hit — your +${XP_PERFECT} XP Perfect Day bonus lands once today's smoke-free day completes`}
        </motion.p>
      )}
    </motion.div>
  );
}
