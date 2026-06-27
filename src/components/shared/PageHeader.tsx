import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  variant?: 'dark' | 'light';
  className?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  variant = 'dark',
  className,
}: PageHeaderProps) {
  const dark = variant === 'dark';

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8',
        className,
      )}
    >
      <div className="min-w-0">
        <h1
          className={cn(
            'text-2xl sm:text-3xl font-display font-semibold tracking-tight',
            dark ? 'text-white' : 'text-midnight',
          )}
        >
          {title}
        </h1>
        {description && (
          <p className={cn('text-sm font-body mt-1.5', dark ? 'text-steel' : 'text-charcoal/70')}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
