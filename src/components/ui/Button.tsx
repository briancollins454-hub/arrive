import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold font-body transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30 focus-visible:ring-offset-1 focus-visible:ring-offset-midnight disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-gold via-gold-light to-gold text-midnight shadow-[0_4px_16px_rgba(201,168,76,0.25),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_8px_rgba(201,168,76,0.2)] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700',
        primary: 'bg-midnight text-white hover:bg-charcoal border border-white/[0.06] hover:border-white/[0.12] hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
        teal: 'bg-gradient-to-r from-teal to-teal-dark text-white shadow-[0_4px_16px_rgba(14,165,160,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_8px_32px_rgba(14,165,160,0.35)] hover:-translate-y-0.5',
        danger: 'bg-gradient-to-r from-danger to-red-700 text-white shadow-[0_4px_16px_rgba(239,68,68,0.2)] hover:shadow-[0_8px_24px_rgba(239,68,68,0.3)]',
        outline: 'border-2 border-cloud bg-transparent text-midnight hover:border-mist hover:bg-snow',
        'outline-dark': 'border border-white/[0.12] bg-white/[0.03] text-silver hover:bg-white/[0.08] hover:text-white hover:border-white/[0.2] backdrop-blur-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]',
        ghost: 'bg-transparent text-midnight hover:bg-snow',
        'ghost-dark': 'bg-transparent text-silver hover:bg-white/[0.06] hover:text-white',
        link: 'text-gold underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-10 px-5 py-2.5',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
