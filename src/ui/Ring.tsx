import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useTheme } from './theme';

interface Props {
  size?: number;
  stroke?: number;
  /** 0..1 */
  progress: number;
  color: string;
  glow?: boolean;
  children?: ReactNode;
}

export function Ring(props: Props) {
  const { theme } = useTheme();
  return theme === 'nothing' ? <DotRing {...props} /> : <ArcRing {...props} />;
}

function clamp01(progress: number) {
  return Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
}

function ArcRing({ size = 64, stroke = 6, progress, color, glow = true, children }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = clamp01(progress);
  // the arc paints with the theme-adjusted --tint of this color (see styles.css)
  return (
    <div className={`ring${glow ? '' : ' flat'}`} style={{ width: size, height: size, ['--accent' as string]: color }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <motion.circle
          className="ring-arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - p) }}
          transition={{ type: 'spring', stiffness: 55, damping: 16, mass: 0.8 }}
        />
      </svg>
      <div className="ring-inner">{children}</div>
    </div>
  );
}

/** The same progress, drawn as a circle of dots that light up clockwise from 12 o'clock. */
function DotRing({ size = 64, stroke = 6, progress, children }: Props) {
  const dot = Math.max(1.4, Math.min(3.2, stroke * 0.42));
  const r = size / 2 - dot;
  const n = Math.max(12, Math.round((2 * Math.PI * r) / (dot * 3.4)));
  const lit = Math.round(clamp01(progress) * n);
  return (
    <div className="ring dot-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * 2 * Math.PI - Math.PI / 2;
          return (
            <circle
              key={i}
              className={i < lit ? 'on' : undefined}
              cx={size / 2 + r * Math.cos(a)}
              cy={size / 2 + r * Math.sin(a)}
              r={dot}
              style={{ transitionDelay: `${i * 12}ms` }}
            />
          );
        })}
      </svg>
      <div className="ring-inner">{children}</div>
    </div>
  );
}
