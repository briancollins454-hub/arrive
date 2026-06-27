import { Skeleton, SkeletonCard, SkeletonRows, SkeletonStats } from '@/components/shared/Skeleton';

type PageLoadingProps = {
  variant?: 'light' | 'dark';
  /** rows = list/table pages, stats = dashboard home, cards = card grids, detail = detail page */
  layout?: 'rows' | 'stats' | 'cards' | 'detail';
  rows?: number;
};

export function PageLoading({
  variant = 'dark',
  layout = 'rows',
  rows = 8,
}: PageLoadingProps) {
  if (layout === 'stats') {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton variant={variant} className="h-8 w-48" />
          <Skeleton variant={variant} className="h-4 w-64" />
        </div>
        <SkeletonStats variant={variant} />
        <SkeletonRows rows={4} variant={variant} />
      </div>
    );
  }

  if (layout === 'cards') {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton variant={variant} className="h-8 w-40" />
          <Skeleton variant={variant} className="h-4 w-56" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} variant={variant} />
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'detail') {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton variant={variant} className="h-9 w-64" />
          <Skeleton variant={variant} className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SkeletonCard variant={variant} />
          <div className="lg:col-span-2 space-y-3">
            <SkeletonRows rows={6} variant={variant} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton variant={variant} className="h-8 w-48" />
        <Skeleton variant={variant} className="h-4 w-64" />
      </div>
      <SkeletonRows rows={rows} variant={variant} />
    </div>
  );
}
