import { motion } from 'motion/react';
import { HomeIcon, TrophyIcon } from './icons';

export type Tab = 'today' | 'journey';

const TABS: { id: Tab; label: string; Icon: typeof HomeIcon }[] = [
  { id: 'today', label: 'Today', Icon: HomeIcon },
  { id: 'journey', label: 'Journey', Icon: TrophyIcon },
];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button key={id} className={`tab${active ? ' active' : ''}`} onClick={() => onChange(id)} aria-current={active ? 'page' : undefined}>
            {active && (
              <motion.span
                layoutId="tab-pill"
                className="tab-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}
            <motion.span className="tab-content" whileTap={{ scale: 0.9 }}>
              <Icon size={20} />
              <span>{label}</span>
            </motion.span>
          </button>
        );
      })}
    </nav>
  );
}
