import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
  variant?: 'light' | 'dark';
  label?: string;
}

export function LoadingSpinner({ className, size = 24, variant = 'dark', label }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2
        size={size}
        className={cn(
          'animate-spin',
          variant === 'dark' ? 'text-gold' : 'text-teal'
        )}
      />
      {label && (
        <p className={cn(
          'text-sm font-body',
          variant === 'dark' ? 'text-steel' : 'text-charcoal/60'
        )}>
          {label}
        </p>
      )}
    </div>
  );
}

/** Full page spinner with centered layout */
export function PageSpinner({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  return (
    <div className={cn(
      'flex items-center justify-center min-h-[60vh]',
      variant === 'dark' ? 'bg-midnight' : 'bg-snow'
    )}>
      <LoadingSpinner size={32} variant={variant} label="Loading…" />
    </div>
  );
}
