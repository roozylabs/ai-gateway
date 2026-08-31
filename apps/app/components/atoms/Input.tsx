import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  'data-invalid'?: boolean | 'true' | 'false';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    const isInvalid = error || props['aria-invalid'] === true || props['aria-invalid'] === 'true' || props['data-invalid'] === true || props['data-invalid'] === 'true';

    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-none border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive data-[invalid=true]:border-destructive data-[invalid=true]:focus-visible:ring-destructive',
          isInvalid && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        ref={ref}
        aria-invalid={isInvalid ? true : undefined}
        data-invalid={isInvalid ? 'true' : undefined}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
