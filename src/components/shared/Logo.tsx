import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export function Logo({ variant = 'dark', size = 'md', showTagline = false }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-7 h-7 rounded-lg text-xs', text: 'text-sm tracking-[3px]' },
    md: { icon: 'w-9 h-9 rounded-xl text-base', text: 'text-lg tracking-[4px]' },
    lg: { icon: 'w-12 h-12 rounded-xl text-2xl', text: 'text-2xl tracking-[5px]' },
  };

  return (
    <div className="flex items-center gap-3">
      {/* Icon Mark */}
      <div
        className={cn(
          sizes[size].icon,
          'flex items-center justify-center font-bold font-display relative',
          'bg-gradient-to-br from-gold via-gold-light to-gold text-midnight',
          'shadow-[0_4px_16px_rgba(201,168,76,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]',
          'ring-1 ring-gold/30',
          'before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-br before:from-white/20 before:to-transparent before:pointer-events-none'
        )}
      >
        A
      </div>

      {/* Wordmark */}
      <div>
        <span
          className={cn(
            sizes[size].text,
            'font-display font-normal',
            variant === 'dark' ? 'gradient-text' : 'text-midnight'
          )}
        >
          ARRIVÉ
        </span>
        {showTagline && (
          <p className={cn(
            'text-[10px] tracking-[2px] uppercase font-body mt-0.5',
            variant === 'dark' ? 'text-steel' : 'text-silver'
          )}>
            by The Supports Desk
          </p>
        )}
      </div>
    </div>
  );
}
