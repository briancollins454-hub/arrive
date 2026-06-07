import { cn } from '@/lib/utils';

/**
 * Shimmer skeleton placeholder. Defaults suit the dark dashboard; pass
 * `variant="light"` for the booking engine.
 */
export function Skeleton({
  className,
  variant = 'dark',
}: {
  className?: string;
  variant?: 'light' | 'dark';
}) {
  return (
    <div
      className={cn(
        'rounded-lg animate-pulse',
        variant === 'dark' ? 'shimmer-loading' : 'bg-cloud/60',
        className,
      )}
    />
  );
}

/** A ready-made skeleton card matching the dashboard card rhythm. */
export function SkeletonCard({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  return (
    <div className={cn(variant === 'dark' ? 'card-dark' : 'card-light', 'space-y-3')}>
      <Skeleton variant={variant} className="h-3 w-1/3" />
      <Skeleton variant={variant} className="h-7 w-2/3" />
      <Skeleton variant={variant} className="h-3 w-1/2" />
    </div>
  );
}

/** A grid of skeleton stat cards. */
export function SkeletonStats({ count = 4, variant = 'dark' }: { count?: number; variant?: 'light' | 'dark' }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}

/** Skeleton rows for tables/lists. */
export function SkeletonRows({ rows = 5, variant = 'dark' }: { rows?: number; variant?: 'light' | 'dark' }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant={variant} className="h-12 w-full" />
      ))}
    </div>
  );
}
