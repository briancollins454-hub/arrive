import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Wrap the app once. LazyMotion + domAnimation keeps the motion bundle
 * small (only the DOM animation features are loaded), while still giving
 * us springy, physics-based motion through the `m.*` components.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation} strict>{children}</LazyMotion>;
}

// Reusable variants ------------------------------------------------------

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export const popIn = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 22 } },
};

/**
 * Animates the page in on every route change. Keyed by pathname so each
 * navigation re-mounts and replays the entrance. Respects reduced-motion.
 */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const location = useLocation();
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <m.div
      key={location.pathname}
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </m.div>
  );
}

/**
 * Reveals children with a staggered fade-up as they enter the viewport.
 */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </m.div>
  );
}

/**
 * Smoothly counts up to a numeric value when mounted. Great for stat cards.
 */
export function useCountUp(target: number, durationMs = 1100): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  const startedAt = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) { setValue(target); return; }
    startedAt.current = null;
    const tick = (now: number) => {
      if (startedAt.current === null) startedAt.current = now;
      const elapsed = now - startedAt.current;
      const t = Math.min(elapsed / durationMs, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else setValue(target);
    };
    frame.current = requestAnimationFrame(tick);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, [target, durationMs, reduce]);

  return value;
}

/** Renders a count-up number with an optional formatter. */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const animated = useCountUp(value);
  const display = format ? format(animated) : Math.round(animated).toLocaleString();
  return <span className={className}>{display}</span>;
}
