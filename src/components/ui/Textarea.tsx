import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'light' | 'dark';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = 'light', ...props }, ref) => {
    return (
      <textarea
        className={cn(
          variant === 'dark'
            ? 'input-dark min-h-[80px] resize-y'
            : 'input min-h-[80px] resize-y',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
