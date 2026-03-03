import { cn } from '@/lib/utils';

interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'light' | 'dark';
}

export function Separator({ className, orientation = 'horizontal', variant = 'light' }: SeparatorProps) {
  return (
    <div
      role="separator"
      className={cn(
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        variant === 'dark' ? 'bg-slate' : 'bg-cloud',
        className
      )}
    />
  );
}
