import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, loadTheme, saveTheme, THEME_KEY, THEMES } from './theme';
import type { StorageLike } from './storage';

const mem = (init: Record<string, string> = {}): StorageLike & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
};

describe('theme storage', () => {
  it('defaults to the glow theme when nothing is saved', () => {
    expect(loadTheme(mem())).toBe(DEFAULT_THEME);
    expect(DEFAULT_THEME).toBe('glow');
  });

  it('reads back a saved theme', () => {
    const s = mem();
    expect(saveTheme('varsity', s)).toBe(true);
    expect(s.data[THEME_KEY]).toBe('varsity');
    expect(loadTheme(s)).toBe('varsity');
  });

  it('ignores unknown values', () => {
    expect(loadTheme(mem({ [THEME_KEY]: 'receipt' }))).toBe(DEFAULT_THEME);
  });

  it('survives storage that throws or is missing', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadTheme(broken)).toBe(DEFAULT_THEME);
    expect(saveTheme('nothing', broken)).toBe(false);
    expect(saveTheme('nothing', undefined)).toBe(false);
  });

  it('lists every theme once, default first', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['glow', 'varsity', 'nothing']);
  });
});
