import { motion } from 'motion/react';
import { fromDateKey, todayKey } from '../logic/dates';
import { currentRun } from '../logic/smoking';
import { perfectDays, XP_PERFECT } from '../logic/xp';
import { useStore } from '../store/store';
import { COLORS } from './fx';
import { HabitCard } from './HabitCard';
import { BookIcon, DumbbellIcon } from './icons';
import { SmokeCard } from './SmokeCard';

export type DetailId = 'smoke' | 'workout' | 'reading';

const greeting = (hour: number) =>
  hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
};

export function Today({ onOpen }: { onOpen: (d: DetailId) => void }) {
  const { state, now } = useStore();
  const today = todayKey(now);
  const wDone = state.checkins.workout.includes(today);
  const rDone = state.checkins.reading.includes(today);
  const sDone = currentRun(state, now).active;
  const quests = [
    { id: 'smoke', done: sDone, color: COLORS.smoke },
    { id: 'workout', done: wDone, color: COLORS.workout },
    { id: 'reading', done: rDone, color: COLORS.reading },
  ];
  const doneCount = quests.filter((q) => q.done).length;
  // the bonus only exists once the smoke-free day for `today` has completed, so say so honestly
  const perfectBonusCounted = perfectDays(state, now).includes(today);
  const date = fromDateKey(today).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <motion.div className="screen" variants={container} initial="hidden" animate="show">
      <motion.div className="hello" variants={item}>
        <div>
          <h1>{greeting(new Date(now).getHours())}</h1>
          <p>{date}</p>
        </div>
        <div className="quests" aria-label={`${doneCount} of 3 daily goals done`}>
          {quests.map((q) => (
            <motion.i
              key={q.id}
              className={q.done ? 'on' : ''}
              style={{ ['--c' as string]: q.color }}
              animate={q.done ? { scale: [1, 1.5, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
            />
          ))}
          <span>{doneCount}/3</span>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <SmokeCard onOpen={() => onOpen('smoke')} />
      </motion.div>
      <motion.div variants={item}>
        <HabitCard
          habit="workout"
          title="Workout"
          todoLabel="Get your daily workout in"
          doneLabel="Crushed it today"
          Icon={DumbbellIcon}
          onOpen={() => onOpen('workout')}
        />
      </motion.div>
      <motion.div variants={item}>
        <HabitCard
          habit="reading"
          title="Reading"
          todoLabel="Read a few pages"
          doneLabel="Pages turned today"
          Icon={BookIcon}
          onOpen={() => onOpen('reading')}
        />
      </motion.div>

      {doneCount === 3 && (
        <motion.p className="perfect" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          {perfectBonusCounted
            ? `⭐ Perfect day — +${XP_PERFECT} XP bonus earned`
            : `⭐ All three goals hit — your +${XP_PERFECT} XP Perfect Day bonus lands once today's smoke-free day completes`}
        </motion.p>
      )}
    </motion.div>
  );
}
