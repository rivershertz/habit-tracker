import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface Props {
  size?: number;
  stroke?: number;
  /** 0..1 */
  progress: number;
  color: string;
  glow?: boolean;
  children?: ReactNode;
}

export function Ring({ size = 64, stroke = 6, progress, color, glow = true, children }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - p) }}
          transition={{ type: 'spring', stiffness: 55, damping: 16, mass: 0.8 }}
          style={glow ? { filter: `drop-shadow(0 0 5px ${color}99)` } : undefined}
        />
      </svg>
      <div className="ring-inner">{children}</div>
    </div>
  );
}
