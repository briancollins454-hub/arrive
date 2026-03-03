import * as React from 'react';
import { cn } from '@/lib/utils';

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { variant?: 'light' | 'dark' }
>(({ className, variant = 'light', ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-sm font-medium font-body leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      variant === 'dark' ? 'text-silver' : 'text-midnight',
      className
    )}
    {...props}
  />
));
Label.displayName = 'Label';

export { Label };
