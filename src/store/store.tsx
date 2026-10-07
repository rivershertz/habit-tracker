import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { emptyState, type State } from '../logic/types';
import { reduce, type Action } from './reducer';
import { loadState, saveState } from './storage';

interface Store {
  state: State;
  /** coarse clock (refreshes every 15s and on focus) — use useNow() for second-level ticking */
  now: number;
  dispatch: (a: Action) => void;
  /** false when localStorage is unavailable and progress can't be saved */
  persisted: boolean;
  onboarded: boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reduce, undefined, () => loadState() ?? emptyState());
  const [now, setNow] = useState(() => Date.now());
  const [persisted, setPersisted] = useState(true);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setPersisted(saveState(state));
  }, [state]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 15_000);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, []);

  const dispatch = useCallback((a: Action) => {
    setNow(Date.now());
    rawDispatch(a);
  }, []);

  const value = useMemo<Store>(
    () => ({ state, now, dispatch, persisted, onboarded: state.smokingRuns.length > 0 }),
    [state, now, dispatch, persisted],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}

/** A ticking clock for components that show seconds. */
export function useNow(intervalMs: number): number {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setN(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return n;
}
