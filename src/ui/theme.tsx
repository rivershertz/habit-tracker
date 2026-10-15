import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { applyTheme, loadTheme, saveTheme, type ThemeId } from '../store/theme';
import { reducedMotion } from './fx';

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: 'glow', setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => loadTheme());

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  const setTheme = useCallback((id: ThemeId) => {
    const swap = () => {
      flushSync(() => setThemeState(id));
      applyTheme(id);
    };
    // cross-fade the whole page between themes where the browser supports it
    if (!reducedMotion() && typeof document.startViewTransition === 'function') document.startViewTransition(swap);
    else swap();
  }, []);

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
