import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Show a "current / max" character counter below the field when maxLength is set. */
  counter?: boolean;
  /** Optional label appended to the counter (e.g. "characters"). Defaults to "characters". */
  counterLabel?: string;
  error?: boolean;
  'data-invalid'?: boolean | 'true' | 'false';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, counter, counterLabel = 'characters', error, onChange, value, defaultValue, ...props }, ref) => {
    const [charCount, setCharCount] = React.useState(() =>
      String(value ?? defaultValue ?? '').length
    );

    React.useEffect(() => {
      if (value !== undefined) {
        setCharCount(String(value).length);
      }
    }, [value]);

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (value === undefined) {
        setCharCount(event.target.value.length);
      }
      onChange?.(event);
    };

    const showCounter = Boolean(counter && props.maxLength !== undefined);
    const isInvalid = error || props['aria-invalid'] === true || props['aria-invalid'] === 'true' || props['data-invalid'] === true || props['data-invalid'] === 'true';

    return (
      <div className="w-full">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-none border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono',
            'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive data-[invalid=true]:border-destructive data-[invalid=true]:focus-visible:ring-destructive',
            isInvalid && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          aria-invalid={isInvalid ? true : undefined}
          data-invalid={isInvalid ? 'true' : undefined}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          {...props}
        />
        {showCounter && (
          <div className="mt-1 flex justify-end text-xs tabular-nums text-muted-foreground">
            {charCount} / {props.maxLength} {counterLabel}
          </div>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
