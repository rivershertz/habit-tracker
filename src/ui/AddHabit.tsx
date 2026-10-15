import type { EmojiStyle, Theme } from 'emoji-picker-react';
import { AnimatePresence, motion } from 'motion/react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { toDateTimeInput, todayKey } from '../logic/dates';
import { HABIT_COLORS, HABIT_EMOJIS, type HabitKind } from '../logic/types';
import { HABIT_NAME_MAX } from '../store/storage';
import { useStore } from '../store/store';
import { originOf } from './actions';
import { burst, haptic } from './fx';

// the full picker is big, so it only loads when opened
const EmojiPicker = lazy(() => import('emoji-picker-react'));

const newId = () => `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function AddHabit({ onClose }: { onClose: () => void }) {
  const { state, now, dispatch } = useStore();
  const [kind, setKind] = useState<HabitKind>('check');
  const [name, setName] = useState('');
  const [maxMs] = useState(() => Date.now());
  const [since, setSince] = useState(() => toDateTimeInput(maxMs));
  const [icon, setIcon] = useState(HABIT_EMOJIS[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const customIcon = !HABIT_EMOJIS.includes(icon);
  // start on a color no habit is using yet
  const [color, setColor] = useState(
    () => HABIT_COLORS.find((c) => !state.habits.some((h) => h.color === c)) ?? HABIT_COLORS[0],
  );
  const trimmed = name.trim();
  const duplicate = state.habits.some((h) => h.name.toLowerCase() === trimmed.toLowerCase());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pickerOpen) setPickerOpen(false);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, pickerOpen]);

  const create = (el: HTMLElement) => {
    if (!trimmed || duplicate) return;
    const parsed = new Date(since).getTime();
    const quitStart = Number.isFinite(parsed) ? Math.min(parsed, Date.now()) : Date.now();
    const habit = { id: newId(), name: trimmed, icon, color, since: todayKey(now), ...(kind === 'quit' ? { kind } : {}) };
    dispatch({ type: 'addHabit', habit, quitStart: kind === 'quit' ? quitStart : undefined });
    const o = originOf(el);
    burst(o.x, o.y, color);
    haptic([12, 40, 18]);
    onClose();
  };

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form
        className="modal add-modal"
        style={{ ['--accent' as string]: color }}
        initial={{ y: 40, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          create(e.currentTarget.querySelector('button[type=submit]') ?? e.currentTarget);
        }}
        role="dialog"
        aria-label="New habit"
      >
        <div className="add-preview">
          <motion.span key={icon} className="habit-icon" initial={{ scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}>
            <span className="habit-emoji">{icon}</span>
          </motion.span>
          <h3>{trimmed || 'New habit'}</h3>
        </div>

        <div className="kind-toggle" role="radiogroup" aria-label="Habit type">
          {(
            [
              ['check', 'Daily check-in', 'Tap it in every day you do it'],
              ['quit', 'Quit counter', 'Counts up on its own until you slip'],
            ] as const
          ).map(([k, title, desc]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              className={kind === k ? 'on' : ''}
              onClick={() => setKind(k)}
            >
              <b>{title}</b>
              <small>{desc}</small>
            </button>
          ))}
        </div>

        <label className="field-label" htmlFor="habit-name">
          Name
        </label>
        <input
          id="habit-name"
          className="text-input"
          autoFocus
          autoComplete="off"
          maxLength={HABIT_NAME_MAX}
          placeholder={kind === 'quit' ? 'Alcohol-free, no sugar, no doomscrolling…' : 'Meditate, drink water, journal…'}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {duplicate && <p className="field-error">You already track a habit with that name.</p>}

        <span className="field-label">Icon</span>
        <div className="emoji-grid" role="radiogroup" aria-label="Icon">
          {HABIT_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={icon === e}
              className={icon === e ? 'on' : ''}
              onClick={() => setIcon(e)}
            >
              {e}
            </button>
          ))}
          <button
            type="button"
            className={`more-emoji${customIcon ? ' on' : ''}${pickerOpen ? ' open' : ''}`}
            aria-label="All emojis"
            aria-expanded={pickerOpen}
            title="All emojis"
            onClick={() => setPickerOpen((o) => !o)}
          >
            {customIcon ? icon : '＋'}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {pickerOpen && (
            <motion.div
              className="emoji-picker-wrap"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
            >
              <Suspense fallback={<p className="hint picker-loading">Loading emojis…</p>}>
                <EmojiPicker
                  theme={'dark' as Theme}
                  emojiStyle={'native' as EmojiStyle}
                  width="100%"
                  height={360}
                  lazyLoadEmojis
                  autoFocusSearch
                  previewConfig={{ showPreview: false }}
                  onEmojiClick={(d) => {
                    setIcon(d.emoji);
                    setPickerOpen(false);
                  }}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>

        <span className="field-label color-field">Color</span>
        <div className="swatches color-field" role="radiogroup" aria-label="Color">
          {HABIT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              className={color === c ? 'on' : ''}
              style={{ ['--c' as string]: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        {kind === 'quit' && (
          <>
            <label className="field-label" htmlFor="habit-since">
              Last time it happened
            </label>
            <input
              id="habit-since"
              className="text-input"
              type="datetime-local"
              value={since}
              max={toDateTimeInput(maxMs)}
              onChange={(e) => setSince(e.target.value)}
            />
          </>
        )}

        <p className="hint">
          {kind === 'quit'
            ? 'The counter starts from that moment. Every full day earns XP; tap "I slipped" on the habit to restart it.'
            : 'New habits earn XP and badges right away, and join your Perfect Day from today on.'}
        </p>

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn accent" disabled={!trimmed || duplicate}>
            Add habit
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
