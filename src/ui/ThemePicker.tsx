import { motion } from 'motion/react';
import { THEMES } from '../store/theme';
import { CheckIcon } from './icons';
import { useTheme } from './theme';

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-options" role="radiogroup" aria-label="Theme">
      {THEMES.map((t) => {
        const on = t.id === theme;
        return (
          <motion.button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${t.name}: ${t.blurb}`}
            className={`theme-opt theme-opt-${t.id}${on ? ' on' : ''}`}
            style={{ ['--p0' as string]: t.preview[0], ['--p1' as string]: t.preview[1], ['--p2' as string]: t.preview[2] }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setTheme(t.id)}
          >
            <span className="theme-swatch" aria-hidden="true">
              <b>{t.name}</b>
              <i />
              {on && (
                <span className="theme-check">
                  <CheckIcon size={12} stroke={3} />
                </span>
              )}
            </span>
            <small>{t.blurb}</small>
          </motion.button>
        );
      })}
    </div>
  );
}
