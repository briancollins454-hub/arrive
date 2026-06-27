import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/Label';

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
  children: ReactNode;
};

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  variant = 'light',
  className,
  children,
}: FormFieldProps) {
  const dark = variant === 'dark';

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} variant={variant}>
        {label}
        {required && <span className={cn('ml-0.5', dark ? 'text-gold' : 'text-danger')}>*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className={cn('text-xs font-body', dark ? 'text-steel/80' : 'text-charcoal/50')}>{hint}</p>
      )}
      {error && <p className="text-xs font-body text-danger">{error}</p>}
    </div>
  );
}
