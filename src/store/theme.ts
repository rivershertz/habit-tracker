import type { StorageLike } from './storage';

export type ThemeId = 'glow' | 'varsity' | 'nothing';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  blurb: string;
  /** browser chrome color (meta theme-color) */
  chrome: string;
  /** three colors for the picker preview: background, surface, accent */
  preview: [string, string, string];
}

export const THEMES: ThemeMeta[] = [
  { id: 'glow', name: 'Glow', blurb: 'Dark glass and neon', chrome: '#0b0b10', preview: ['#0b0b10', '#9b7bff', '#3ee6b0'] },
  { id: 'varsity', name: 'Varsity', blurb: 'Felt, patches, jersey numbers', chrome: '#123d2f', preview: ['#123d2f', '#f1ead8', '#c8322f'] },
  { id: 'nothing', name: 'Nothing', blurb: 'Dot matrix and Glyph lights', chrome: '#000000', preview: ['#000000', '#f2f2f2', '#d71921'] },
];

export const DEFAULT_THEME: ThemeId = 'glow';
export const THEME_KEY = 'ascend:theme';

const isTheme = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

const defaultStorage = (): StorageLike | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export function loadTheme(storage: StorageLike | undefined = defaultStorage()): ThemeId {
  try {
    const v = storage?.getItem(THEME_KEY);
    return isTheme(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(id: ThemeId, storage: StorageLike | undefined = defaultStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(THEME_KEY, id);
    return true;
  } catch {
    return false;
  }
}

/** Put the theme on <html> (styles key off `data-theme`) and tint the browser chrome. */
export function applyTheme(id: ThemeId): void {
  const meta = THEMES.find((t) => t.id === id) ?? THEMES[0];
  document.documentElement.dataset.theme = meta.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', meta.chrome);
}
