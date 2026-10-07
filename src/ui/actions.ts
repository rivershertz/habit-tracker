import { useCallback } from 'react';
import type { HabitId } from '../logic/types';
import { totalXp } from '../logic/xp';
import { reduce, type Action } from '../store/reducer';
import { useStore } from '../store/store';
import { burst, COLORS, emitXp, haptic } from './fx';

export interface Origin {
  x: number;
  y: number;
}

export const originOf = (el: Element): Origin => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** Check-in / undo / relapse with the confetti + XP-float feedback attached. */
export function useActions() {
  const { state, now, dispatch } = useStore();

  const check = useCallback(
    (habit: HabitId, day: string, origin: Origin, big = true) => {
      const action: Action = { type: 'setCheckin', habit, day, on: true };
      const next = reduce(state, action);
      if (next === state) return; // double-tap: nothing changes, nothing celebrates
      const gained = totalXp(next, now) - totalXp(state, now);
      dispatch(action);
      const color = COLORS[habit];
      if (big) burst(origin.x, origin.y, color);
      haptic(big ? [12, 40, 18] : 10);
      if (gained > 0) emitXp({ x: origin.x, y: origin.y, amount: gained, color });
    },
    [state, now, dispatch],
  );

  const uncheck = useCallback(
    (habit: HabitId, day: string) => {
      dispatch({ type: 'setCheckin', habit, day, on: false });
      haptic(8);
    },
    [dispatch],
  );

  const smoked = useCallback(() => {
    dispatch({ type: 'relapse', now: Date.now() });
    haptic(30);
  }, [dispatch]);

  return { check, uncheck, smoked };
}
