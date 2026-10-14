import { motion } from 'motion/react';
import { useState } from 'react';
import { evaluateAchievements, MASTERY_GROUP, SMOKE_GROUP, SPECIAL_GROUP, TIERS, type Tier } from '../logic/achievements';
import { levelForXp, totalXp, xpBreakdown } from '../logic/xp';
import { useStore } from '../store/store';
import { CountUp } from './CountUp';
import { COLORS, groupColor, TIER_META } from './fx';
import { Ring } from './Ring';

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
  const [tier, setTier] = useState<Tier | null>(null);
  const sources = [
    { label: 'Smoke-free days', value: b.smoke, color: COLORS.smoke },
    ...state.habits.map((h) => ({ label: h.name, value: b.habits[h.id] ?? 0, color: h.color })),
    { label: 'Perfect days', value: b.perfect, color: COLORS.xp },
  ];
  const groups = [
    { id: SMOKE_GROUP, label: 'Smoke-free' },
    ...state.habits.map((h) => ({ id: h.id, label: h.name })),
    { id: SPECIAL_GROUP, label: 'Feats' },
    { id: MASTERY_GROUP, label: 'Mastery' },
  ];
  const unlocked = achievements.filter((a) => a.unlocked).length;
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

      <motion.section className="card trophy-case" variants={item}>
        <h4 className="section-title row">
          <span>Trophy case</span>
          <span className="muted">
            {unlocked}/{achievements.length}
          </span>
        </h4>
        <div className="tiers" role="group" aria-label="Filter badges by rarity">
          {TIERS.map((t) => {
            const list = achievements.filter((a) => a.tier === t);
            const got = list.filter((a) => a.unlocked).length;
            return (
              <motion.button
                key={t}
                className={`tier-chip tier-${t}${tier === t ? ' on' : ''}`}
                style={{ ['--tier' as string]: TIER_META[t].color }}
                aria-pressed={tier === t}
                whileTap={{ scale: 0.92 }}
                onClick={() => setTier(tier === t ? null : t)}
              >
                <b>
                  {got}
                  <small>/{list.length}</small>
                </b>
                <span>{TIER_META[t].label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      {groups.map((g) => {
        const color = groupColor(g.id, state.habits);
        const all = achievements.filter((a) => a.group === g.id);
        const list = tier ? all.filter((a) => a.tier === tier) : all;
        if (list.length === 0) return null;
        const done = all.filter((a) => a.unlocked).length;
        return (
          <motion.section key={g.id} variants={item}>
            <h4 className="section-title row">
              <span style={{ color }}>{g.label}</span>
              <span className="muted">
                {done}/{all.length}
              </span>
            </h4>
            <div className="badges">
              {list.map((a) => (
                <motion.div
                  key={a.id}
                  className={`badge tier-${a.tier}${a.unlocked ? ' unlocked' : ''}`}
                  style={{ ['--accent' as string]: color, ['--tier' as string]: TIER_META[a.tier].color }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="tier-tag">{TIER_META[a.tier].label}</span>
                  <Ring size={56} stroke={4} progress={a.progress} color={a.unlocked ? TIER_META[a.tier].color : color} glow={a.unlocked}>
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
