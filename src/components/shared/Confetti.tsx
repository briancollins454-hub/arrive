import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

const COLORS = ['#c9a84c', '#e3c96e', '#0ea5a0', '#22d3c6'];

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotate: number;
  drift: number;
}

/**
 * Lightweight CSS confetti burst — no dependencies. Renders once on mount
 * for `durationMs`, then cleans itself up. Respects reduced-motion.
 */
export function Confetti({ count = 80, durationMs = 4000 }: { count?: number; durationMs?: number }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(true);
  const [pieces] = useState<Piece[]>(() =>
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 2.4 + Math.random() * 1.8,
      color: COLORS[i % COLORS.length] ?? '#c9a84c',
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
      drift: (Math.random() - 0.5) * 160,
    })),
  );

  useEffect(() => {
    if (reduce) { setActive(false); return; }
    const t = setTimeout(() => setActive(false), durationMs);
    return () => clearTimeout(t);
  }, [durationMs, reduce]);

  if (reduce || !active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes confettiFall {
          0% { transform: translate3d(0, -10vh, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(var(--drift), 110vh, 0) rotate(720deg); opacity: 0.9; }
        }
      `}</style>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            borderRadius: 2,
            transform: `rotate(${p.rotate}deg)`,
            ['--drift' as string]: `${p.drift}px`,
            animation: `confettiFall ${p.duration}s cubic-bezier(0.16,1,0.3,1) ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
