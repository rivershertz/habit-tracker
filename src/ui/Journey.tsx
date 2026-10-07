import { motion } from 'motion/react';
import { evaluateAchievements, type AchievementGroup } from '../logic/achievements';
import { levelForXp, totalXp, xpBreakdown } from '../logic/xp';
import { useStore } from '../store/store';
import { CountUp } from './CountUp';
import { COLORS } from './fx';
import { Ring } from './Ring';

const GROUPS: { id: AchievementGroup; label: string; color: string }[] = [
  { id: 'smoke', label: 'Smoke-free', color: COLORS.smoke },
  { id: 'workout', label: 'Workout', color: COLORS.workout },
  { id: 'reading', label: 'Reading', color: COLORS.reading },
  { id: 'special', label: 'Special', color: COLORS.xp },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
};

export function Journey() {
  const { state, now } = useStore();
  const xp = totalXp(state, now);
  const info = levelForXp(xp);
  const b = xpBreakdown(state, now);
  const achievements = evaluateAchievements(state, now);
  const sources = [
    { label: 'Smoke-free days', value: b.smoke, color: COLORS.smoke },
    { label: 'Workouts', value: b.workout, color: COLORS.workout },
    { label: 'Reading', value: b.reading, color: COLORS.reading },
    { label: 'Perfect days', value: b.perfect, color: COLORS.xp },
  ];
  const max = Math.max(1, ...sources.map((s) => s.value));

  return (
    <motion.div className="screen" variants={container} initial="hidden" animate="show">
      <motion.section className="card hero" variants={item}>
        <Ring size={168} stroke={11} progress={info.progress} color={COLORS.xp}>
          <div className="hero-ring">
            <small>LEVEL</small>
            <b>{info.level}</b>
          </div>
        </Ring>
        <h2 className="rank">{info.rank}</h2>
        <p className="muted">
          <CountUp value={info.xpForNext - info.xpIntoLevel} /> XP to level {info.level + 1}
        </p>
        <p className="total-xp">
          <CountUp value={xp} /> <span>total XP</span>
        </p>
      </motion.section>

      <motion.section className="card" variants={item}>
        <h4 className="section-title">Where your XP comes from</h4>
        <ul className="sources">
          {sources.map((s) => (
            <li key={s.label}>
              <div>
                <span>{s.label}</span>
                <b>{s.value.toLocaleString()}</b>
              </div>
              <div className="bar">
                <motion.i
                  style={{ background: s.color, boxShadow: `0 0 10px ${s.color}66` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.value / max) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 60, damping: 16, delay: 0.2 }}
                />
              </div>
            </li>
          ))}
        </ul>
      </motion.section>

      {GROUPS.map((g) => {
        const list = achievements.filter((a) => a.group === g.id);
        const done = list.filter((a) => a.unlocked).length;
        return (
          <motion.section key={g.id} variants={item}>
            <h4 className="section-title row">
              <span style={{ color: g.color }}>{g.label}</span>
              <span className="muted">
                {done}/{list.length}
              </span>
            </h4>
            <div className="badges">
              {list.map((a) => (
                <motion.div
                  key={a.id}
                  className={`badge${a.unlocked ? ' unlocked' : ''}`}
                  style={{ ['--accent' as string]: g.color }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Ring size={56} stroke={4} progress={a.progress} color={g.color} glow={a.unlocked}>
                    <span className="badge-icon">{a.icon}</span>
                  </Ring>
                  <b>{a.title}</b>
                  <small>{a.desc}</small>
                </motion.div>
              ))}
            </div>
          </motion.section>
        );
      })}
    </motion.div>
  );
}
