'use client';

import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/atoms/Input';

interface NumberInputProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

function clamp(value: number, min: number | undefined, max: number | undefined): number {
  let next = Number.isFinite(value) ? value : 0;
  if (typeof min === 'number' && next < min) next = min;
  if (typeof max === 'number' && next > max) next = max;
  return next;
}

function NumberInput({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  placeholder,
  disabled = false,
  id,
  className,
}: NumberInputProps) {
  const [draft, setDraft] = React.useState<string>(String(value));

  React.useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    const next = Number.isFinite(parsed) ? clamp(parsed, min, max) : 0;
    setDraft(String(next));
    if (next !== value) onValueChange(next);
  };

  const stepBy = (delta: number) => {
    const current = Number.isFinite(value) ? value : 0;
    onValueChange(clamp((isNaN(current) ? 0 : current) + delta * step, min, max));
  };

  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          setDraft(e.target.value);
          const parsed = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(parsed)) {
            onValueChange(clamp(parsed, min, max));
          } else if (e.target.value === '') {
            onValueChange(0);
          }
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(draft);
        }}
        className="pr-16"
      />
      <div className="absolute inset-y-0 right-0 flex w-14 items-stretch">
        <button
          type="button"
          aria-label="Decrease"
          disabled={disabled}
          onClick={() => stepBy(-1)}
          className="flex h-full w-7 items-center justify-center border-l border-input text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Increase"
          disabled={disabled}
          onClick={() => stepBy(1)}
          className="flex h-full w-7 items-center justify-center border-l border-input text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

NumberInput.displayName = 'NumberInput';

export { NumberInput };
