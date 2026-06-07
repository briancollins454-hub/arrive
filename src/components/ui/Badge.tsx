import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { FC, HTMLAttributes } from 'react';

const badgeVariants = cva(
  'inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold font-body tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-steel/10 text-steel border border-steel/10',
        confirmed: 'bg-teal/10 text-teal border border-teal/15',
        arriving: 'bg-gold/10 text-gold border border-gold/15',
        'checked-in': 'bg-success/10 text-success border border-success/15',
        pending: 'bg-steel/10 text-steel border border-steel/10',
        cancelled: 'bg-danger/10 text-danger border border-danger/15',
        'no-show': 'bg-danger/10 text-danger border border-danger/15',
        success: 'bg-success/10 text-success border border-success/15',
        warning: 'bg-warning/10 text-warning border border-warning/15',
        danger: 'bg-danger/10 text-danger border border-danger/15',
        info: 'bg-info/10 text-info border border-info/15',
        gold: 'bg-gold/10 text-gold border border-gold/15',
        purple: 'bg-purple/10 text-purple-light border border-purple/20',
        electric: 'bg-electric/10 text-electric-light border border-electric/20',
        magenta: 'bg-magenta/10 text-magenta-light border border-magenta/20',
        vibrant: 'text-white border-0 bg-[linear-gradient(120deg,#c9a84c,#ff4dd9,#b667ff,#2dd4ff)] bg-[length:200%_100%] animate-gradient-pan shadow-[0_2px_10px_-2px_rgba(182,103,255,0.5)]',
        outline: 'border border-white/[0.12] text-steel bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: FC<BadgeProps> = ({ className, variant, ...props }) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);
