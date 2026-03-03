import { useEffect, useState, type FC } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  color?: string;
  accent?: string;
  ringValue?: number; // 0-100 for ring chart
}

// Animated counter component
function AnimatedValue({ value, className }: { value: string; className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(true); }, []);
  return (
    <span className={cn(
      'inline-block transition-all duration-700',
      show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      className,
    )}>
      {value}
    </span>
  );
}

// SVG ring chart
function RingChart({ value, color = '#0ea5a0', size = 60 }: { value: number; color?: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <svg width={size} height={size} className="ring-chart" style={{ filter: `drop-shadow(0 0 6px ${color}30)` }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)' }}
      />
      {/* Glow overlay ring */}
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={2} strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        opacity={0.3}
        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)', filter: `blur(3px)` }}
      />
    </svg>
  );
}

export const DashboardStats: FC<{ stats: StatCardProps[] }> = ({ stats }) => {
  // Map color classes to glow + shimmer color values
  const glowColorMap: Record<string, string> = {
    'text-teal': 'rgba(14,165,160,0.15)',
    'text-gold': 'rgba(201,168,76,0.15)',
    'text-teal-light': 'rgba(45,212,191,0.12)',
    'text-silver': 'rgba(148,163,184,0.08)',
  };

  const shimmerMap: Record<string, { c1: string; c2: string }> = {
    'text-teal': { c1: 'rgba(14,165,160,0.35)', c2: 'rgba(34,211,198,0.2)' },
    'text-gold': { c1: 'rgba(201,168,76,0.35)', c2: 'rgba(227,201,110,0.2)' },
    'text-teal-light': { c1: 'rgba(45,212,191,0.3)', c2: 'rgba(110,231,183,0.2)' },
    'text-silver': { c1: 'rgba(148,163,184,0.2)', c2: 'rgba(255,255,255,0.1)' },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {stats.map((stat, i) => {
        const shimmer = shimmerMap[stat.color ?? ''] ?? { c1: 'rgba(255,255,255,0.1)', c2: 'rgba(255,255,255,0.05)' };
        return (
        <div
          key={stat.label}
          style={{
            '--glow-color': glowColorMap[stat.color ?? ''] ?? 'rgba(255,255,255,0.05)',
            '--shimmer-color-1': shimmer.c1,
            '--shimmer-color-2': shimmer.c2,
          } as React.CSSProperties}
          className={cn(
            'card-dark relative overflow-hidden group stat-card-glow stat-shimmer-border',
            'border border-white/[0.06] hover:border-white/[0.14]',
            'opacity-0 animate-slide-up',
            i === 0 && 'animate-stagger-1',
            i === 1 && 'animate-stagger-2',
            i === 2 && 'animate-stagger-3',
            i === 3 && 'animate-stagger-4',
          )}
        >
          {/* Large ambient glow orb */}
          <div className={cn(
            'absolute -top-12 -right-12 w-36 h-36 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-all duration-700',
            stat.accent ?? 'bg-gold/10',
          )} />
          {/* Secondary inner glow */}
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-[40px] opacity-0 group-hover:opacity-60 transition-all duration-1000 bg-white/[0.03]" />

          <div className="relative flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-[10px] text-steel/70 font-body uppercase tracking-[0.15em] font-semibold">
                {stat.label}
              </p>
              <div className="flex items-baseline gap-2.5">
                <AnimatedValue
                  value={String(stat.value)}
                  className={cn('text-[28px] font-bold font-body tracking-tight drop-shadow-sm', stat.color ?? 'text-white')}
                />
                {stat.change && (
                  <span className={cn(
                    'text-[10px] font-semibold font-body px-2 py-0.5 rounded-md backdrop-blur-sm',
                    stat.change.startsWith('+')
                      ? 'text-success bg-success/10 border border-success/15 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                      : stat.change === '—'
                      ? 'text-steel bg-white/[0.04]'
                      : 'text-danger bg-danger/10 border border-danger/15 shadow-[0_0_8px_rgba(239,68,68,0.1)]'
                  )}>
                    {stat.change}
                  </span>
                )}
              </div>
            </div>

            {stat.ringValue !== undefined ? (
              <div className="relative group-hover:scale-105 transition-transform duration-500">
                <RingChart
                  value={stat.ringValue}
                  color={stat.color === 'text-teal' ? '#0ea5a0' : stat.color === 'text-gold' ? '#c9a84c' : '#94A3B8'}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white font-body">
                  {stat.ringValue}%
                </span>
              </div>
            ) : (
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg',
                'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.06]',
              )}>
                <stat.icon size={20} className={cn(stat.color ?? 'text-steel', 'transition-all duration-500 group-hover:drop-shadow-[0_0_8px_currentColor]')} />
              </div>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
};
