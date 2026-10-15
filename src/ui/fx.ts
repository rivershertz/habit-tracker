import confetti from 'canvas-confetti';
import { MASTERY_GROUP, SMOKE_GROUP, SPECIAL_GROUP, type Tier } from '../logic/achievements';
import type { Habit } from '../logic/types';

export const COLORS = {
  workout: '#ff7a45',
  reading: '#9b7bff',
  smoke: '#3ee6b0',
  xp: '#ffd166',
} as const;

export const TIER_META: Record<Tier, { label: string; color: string }> = {
  common: { label: 'Common', color: '#b8bcc8' },
  rare: { label: 'Rare', color: '#4da3ff' },
  epic: { label: 'Epic', color: '#c26bff' },
  legendary: { label: 'Legendary', color: '#ffb020' },
  mythic: { label: 'Mythic', color: '#ff4f8b' },
};

/** Tiers that get the full-screen treatment when unlocked. */
export const isHeroTier = (t: Tier) => t === 'legendary' || t === 'mythic';

/** Accent color of an achievement group: smoke, special, mastery or a habit id. */
export function groupColor(group: string, habits: Habit[]): string {
  if (group === SMOKE_GROUP) return COLORS.smoke;
  if (group === SPECIAL_GROUP || group === MASTERY_GROUP) return COLORS.xp;
  return habits.find((h) => h.id === group)?.color ?? COLORS.xp;
}

export const reducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export function haptic(pattern: number | number[]): void {
  try {
    // Chrome logs an error if vibrate() runs before the user has interacted with the page
    if (!reducedMotion() && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

const base = { zIndex: 1000, disableForReducedMotion: true } as const;

/** Confetti colors for the active theme: Nothing is monochrome with its red, Varsity uses felt-friendly bone and gold. */
function paint(colors: string[]): { colors: string[]; shapes?: confetti.Shape[] } {
  const theme = document.documentElement.dataset.theme;
  if (theme === 'nothing') return { colors: ['#ffffff', '#ffffff', '#8f8f8f', '#d71921'], shapes: ['circle'] };
  if (theme === 'varsity') return { colors: [colors[0], '#f1ead8', '#e8b53e', '#c8322f'] };
  return { colors };
}

/** Confetti pop from a screen point, tinted with the habit color. */
export function burst(x: number, y: number, color: string): void {
  if (reducedMotion()) return;
  const origin = { x: x / window.innerWidth, y: y / window.innerHeight };
  confetti({
    ...base,
    particleCount: 46,
    spread: 75,
    startVelocity: 32,
    gravity: 1.1,
    ticks: 80,
    scalar: 0.85,
    origin,
    ...paint([color, '#ffffff', COLORS.xp]),
  });
  confetti({
    ...base,
    particleCount: 14,
    spread: 120,
    startVelocity: 18,
    ticks: 60,
    scalar: 0.6,
    shapes: ['circle'],
    origin,
    colors: paint([color]).colors,
  });
}

/** Full-screen celebration for level-ups. */
export function bigBurst(): void {
  if (reducedMotion()) return;
  const look = paint([COLORS.workout, COLORS.reading, COLORS.smoke, COLORS.xp, '#ffffff']);
  const end = Date.now() + 900;
  const frame = () => {
    confetti({ ...base, particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, ...look });
    confetti({ ...base, particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, ...look });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
  confetti({ ...base, particleCount: 120, spread: 100, startVelocity: 45, origin: { x: 0.5, y: 0.5 }, ...look });
}

/** Fireworks from both top corners for epic+ achievements. */
export function epicBurst(color: string): void {
  if (reducedMotion()) return;
  const look = paint([color, '#ffffff', COLORS.xp]);
  for (const x of [0.15, 0.5, 0.85]) {
    confetti({ ...base, particleCount: 60, spread: 110, startVelocity: 38, ticks: 120, origin: { x, y: 0.15 }, ...look });
  }
  confetti({ ...base, particleCount: 30, spread: 360, startVelocity: 20, ticks: 140, shapes: look.shapes ?? ['star'], scalar: 1.3, origin: { x: 0.5, y: 0.35 }, colors: look.colors });
}

/** Small shower from the top (achievement unlocked). */
export function sparkle(color: string): void {
  if (reducedMotion()) return;
  confetti({
    ...base,
    particleCount: 40,
    spread: 90,
    startVelocity: 22,
    ticks: 90,
    scalar: 0.8,
    origin: { x: 0.5, y: 0.08 },
    ...paint([color, '#ffffff', COLORS.xp]),
  });
}

// ---- floating "+XP" events -------------------------------------------------

export interface XpEvent {
  id: number;
  x: number;
  y: number;
  amount: number;
  color: string;
}

type Listener = (e: XpEvent) => void;
const listeners = new Set<Listener>();
let seq = 0;

export function emitXp(e: Omit<XpEvent, 'id'>): void {
  // keep the label (≈120px wide, centered on x) fully on screen
  const half = 64;
  const x = Math.max(half, Math.min(window.innerWidth - half, e.x));
  const ev = { ...e, x, id: ++seq };
  listeners.forEach((l) => l(ev));
}

export function onXp(l: Listener): () => void {
  listeners.add(l);
  return () => void listeners.delete(l);
}
