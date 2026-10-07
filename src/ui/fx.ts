import confetti from 'canvas-confetti';

export const COLORS = {
  workout: '#ff7a45',
  reading: '#9b7bff',
  smoke: '#3ee6b0',
  xp: '#ffd166',
} as const;

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
    colors: [color, '#ffffff', COLORS.xp],
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
    colors: [color],
  });
}

/** Full-screen celebration for level-ups. */
export function bigBurst(): void {
  if (reducedMotion()) return;
  const colors = [COLORS.workout, COLORS.reading, COLORS.smoke, COLORS.xp, '#ffffff'];
  const end = Date.now() + 900;
  const frame = () => {
    confetti({ ...base, particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, colors });
    confetti({ ...base, particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
  confetti({ ...base, particleCount: 120, spread: 100, startVelocity: 45, origin: { x: 0.5, y: 0.5 }, colors });
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
    colors: [color, '#ffffff', COLORS.xp],
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
