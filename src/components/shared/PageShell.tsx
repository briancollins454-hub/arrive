import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageShellProps = {
  children: ReactNode;
  variant?: 'dark' | 'light';
  /** Full-width pages (tape chart, reports) skip max-width cap */
  wide?: boolean;
  className?: string;
};

/**
 * Uniform page container. Dashboard/admin layouts inject outer padding;
 * use `standalone` on auth/legal pages that render outside those layouts.
 */
export function PageShell({
  children,
  variant = 'dark',
  wide = false,
  className,
}: PageShellProps) {
  return (
    <div
      className={cn(
        wide ? 'w-full' : 'max-w-7xl mx-auto w-full',
        variant === 'dark' ? 'text-silver' : 'text-steel',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Padding wrapper for pages outside dashboard/admin layouts */
export function PageShellStandalone({
  children,
  variant = 'dark',
  wide = false,
  className,
}: PageShellProps) {
  return (
    <div
      className={cn(
        'min-h-screen',
        variant === 'dark' ? 'bg-midnight' : 'bg-snow booking-engine',
        className,
      )}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <PageShell variant={variant} wide={wide}>
          {children}
        </PageShell>
      </div>
    </div>
  );
}
