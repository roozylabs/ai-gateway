'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormField } from './Form';

export interface SearchableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
  maxHeight?: string;
  clearable?: boolean;
  error?: boolean;
  'aria-invalid'?: boolean | 'true' | 'false';
  'data-invalid'?: boolean | 'true' | 'false';
}

function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  disabled = false,
  className,
  emptyMessage = 'No results found.',
  maxHeight = '280px',
  clearable = true,
  error,
  ...props
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  let isFieldInvalid = false;
  try {
    const field = useFormField();
    if (field?.error) isFieldInvalid = true;
  } catch {
    // Outside FormField context
  }

  const isInvalid =
    error ||
    isFieldInvalid ||
    props['aria-invalid'] === true ||
    props['aria-invalid'] === 'true' ||
    props['data-invalid'] === true ||
    props['data-invalid'] === 'true';

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const query = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query)
    );
  }, [options, search]);

  const selectedLabel = React.useMemo(() => {
    const found = options.find((opt) => opt.value === value);
    return found?.label ?? '';
  }, [options, value]);

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange('');
  };

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch('');
    }
  }, [open]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={isInvalid ? true : undefined}
          data-invalid={isInvalid ? 'true' : undefined}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-none border border-input bg-transparent px-3 py-2 text-xs shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
            'aria-invalid:border-destructive aria-invalid:focus:ring-destructive data-[invalid=true]:border-destructive data-[invalid=true]:focus:ring-destructive',
            isInvalid && 'border-destructive focus:ring-destructive',
            className
          )}
        >
          <span className={cn('truncate flex-1 text-left', !selectedLabel && 'text-muted-foreground')}>
            {selectedLabel || placeholder}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {clearable && value && (
              <span
                role="button"
                tabIndex={0}
                className="cursor-pointer text-muted-foreground hover:text-foreground p-0.5"
                onClick={handleClear}
                title="Clear selection"
              >
                <X className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-50 min-w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-none border border-border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          sideOffset={4}
          align="start"
          style={{ width: 'var(--radix-popover-trigger-width)' }}
        >
          {/* Search Input */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          {/* Scrollable Options List */}
          <div
            className="overflow-y-auto p-1 custom-scrollbar"
            style={{ maxHeight }}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-none py-1.5 pl-8 pr-2 text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                    option.disabled && 'pointer-events-none opacity-50',
                    value === option.value && 'font-medium'
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {value === option.value && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </span>
                  <span className="truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

SearchableSelect.displayName = 'SearchableSelect';

export { SearchableSelect };
