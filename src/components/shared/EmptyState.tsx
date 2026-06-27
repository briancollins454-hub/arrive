import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Characterful empty state with a glowing gradient icon halo.
 * Use across dashboard (dark) and booking engine (light).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'dark',
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'light' | 'dark';
  className?: string;
}) {
  const dark = variant === 'dark';
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-6', className)}>
      <div className="relative mb-5">
        {/* Vibrant glow halo */}
        <div className="absolute inset-0 -m-4 rounded-full bg-gold/10 blur-2xl" />
        <div
          className={cn(
            'relative w-16 h-16 rounded-2xl flex items-center justify-center border',
            dark
              ? 'bg-white/[0.04] border-white/[0.08]'
              : 'bg-white border-cloud shadow-card',
          )}
        >
          <Icon size={28} className={dark ? 'text-silver' : 'text-steel'} />
        </div>
      </div>
      <h3 className={cn('text-lg font-display mb-1.5', dark ? 'text-white' : 'text-midnight')}>{title}</h3>
      {description && (
        <p className={cn('text-sm font-body max-w-sm mb-5', dark ? 'text-steel' : 'text-charcoal/60')}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
