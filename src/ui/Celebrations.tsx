import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { AchievementStatus } from '../logic/achievements';
import type { LevelInfo } from '../logic/xp';
import { pendingCelebrations } from '../store/reducer';
import { useStore } from '../store/store';
import { bigBurst, COLORS, haptic, onXp, sparkle, type XpEvent } from './fx';

type Item =
  | { kind: 'level'; key: string; info: LevelInfo }
  | { kind: 'ach'; key: string; a: AchievementStatus }
  | { kind: 'multi'; key: string; list: AchievementStatus[] };

const GROUP_COLOR = { workout: COLORS.workout, reading: COLORS.reading, smoke: COLORS.smoke, special: COLORS.xp };

/** More than this many at once (e.g. backfilling old days) collapses into one toast. */
const MAX_INDIVIDUAL_TOASTS = 2;

function toastOf(item: Exclude<Item, { kind: 'level' }>) {
  if (item.kind === 'ach') {
    return { icon: item.a.icon, title: item.a.title, desc: item.a.desc, color: GROUP_COLOR[item.a.group] };
  }
  const names = item.list.slice(0, 3).map((a) => a.title).join(', ');
  return {
    icon: '🏆',
    title: `${item.list.length} achievements unlocked`,
    desc: item.list.length > 3 ? `${names} and more` : names,
    color: COLORS.xp,
  };
}

/** Floating "+N XP" labels that rise from where you tapped. */
export function FloatLayer() {
  const [events, setEvents] = useState<XpEvent[]>([]);
  useEffect(
    () =>
      onXp((e) => {
        setEvents((list) => [...list, e]);
        setTimeout(() => setEvents((list) => list.filter((x) => x.id !== e.id)), 1300);
      }),
    [],
  );
  return (
    <div className="float-layer" aria-hidden="true">
      {events.map((e) => (
        <motion.span
          key={e.id}
          className="float-xp"
          style={{ left: e.x, top: e.y, color: e.color }}
          initial={{ opacity: 0, y: 0, scale: 0.5, x: '-50%' }}
          animate={{ opacity: [0, 1, 1, 0], y: -110, scale: [0.5, 1.25, 1, 1] }}
          transition={{ duration: 1.2, ease: 'easeOut', times: [0, 0.2, 0.7, 1] }}
        >
          +{e.amount} XP
        </motion.span>
      ))}
    </div>
  );
}

export function Celebrations() {
  const { state, now, dispatch, onboarded } = useStore();
  const [queue, setQueue] = useState<Item[]>([]);
  const [shownKey, setShownKey] = useState<string | null>(null);
  const seen = useRef(new Set<string>());

  // Turn newly earned levels / achievements into a queue, and mark them seen right away
  // so a reload (or the next tick) never celebrates them twice.
  useEffect(() => {
    if (!onboarded) return;
    const p = pendingCelebrations(state, now);
    if (!p.level && p.achievements.length === 0) return;
    const items: Item[] = [];
    if (p.level) items.push({ kind: 'level', key: `level-${p.level.level}`, info: p.level });
    if (p.achievements.length > MAX_INDIVIDUAL_TOASTS) {
      items.push({ kind: 'multi', key: `multi-${p.achievements.map((a) => a.id).join('+')}`, list: p.achievements });
    } else {
      for (const a of p.achievements) items.push({ kind: 'ach', key: a.id, a });
    }
    dispatch({ type: 'markSeen', ids: p.achievements.map((a) => a.id), level: p.level?.level ?? 0 });
    const fresh = items.filter((i) => !seen.current.has(i.key));
    fresh.forEach((i) => seen.current.add(i.key));
    if (fresh.length) setQueue((q) => [...q, ...fresh]);
  }, [state, now, dispatch, onboarded]);

  const current = queue[0];

  // brief pause so the check-in confetti lands before the next celebration
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setShownKey(current.key), 700);
    return () => clearTimeout(t);
  }, [current]);

  const visible = current && shownKey === current.key ? current : null;
  const dismiss = () => setQueue((q) => q.slice(1));

  useEffect(() => {
    if (!visible) return;
    if (visible.kind === 'level') {
      bigBurst();
      haptic([20, 60, 20, 60, 40]);
      return;
    }
    sparkle(toastOf(visible).color);
    haptic(20);
    const t = setTimeout(dismiss, 4200);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <>
      <AnimatePresence>
        {visible?.kind === 'level' && (
          <motion.div
            key={visible.key}
            className="levelup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-label="Level up"
          >
            <motion.div
              className="levelup-body"
              initial={{ scale: 0.6, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 15, delay: 0.1 }}
            >
              <motion.small initial={{ letterSpacing: '0.6em', opacity: 0 }} animate={{ letterSpacing: '0.3em', opacity: 1 }} transition={{ delay: 0.25 }}>
                LEVEL UP
              </motion.small>
              <motion.div
                className="levelup-num"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.3 }}
              >
                {visible.info.level}
              </motion.div>
              <h2>{visible.info.rank}</h2>
              <p>Every day you show up makes you stronger.</p>
              <motion.button className="btn primary" whileTap={{ scale: 0.94 }} onClick={dismiss}>
                Keep going
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {visible && visible.kind !== 'level' && (
          <motion.button
            key={visible.key}
            className="toast"
            style={{ ['--accent' as string]: toastOf(visible).color }}
            initial={{ y: -90, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            onClick={dismiss}
          >
            <span className="toast-shine" />
            <span className="toast-icon">{toastOf(visible).icon}</span>
            <span className="toast-text">
              <small>Achievement unlocked</small>
              <b>{toastOf(visible).title}</b>
              <em>{toastOf(visible).desc}</em>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
