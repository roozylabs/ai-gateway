'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface MultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
  maxHeight?: string;
}

function MultiSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search...',
  disabled = false,
  className,
  emptyMessage = 'No results found.',
  maxHeight = '280px',
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const query = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query)
    );
  }, [options, search]);

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onValueChange(value.filter((v) => v !== optionValue));
    } else {
      onValueChange([...value, optionValue]);
    }
  };

  const removeValue = (optionValue: string) => {
    onValueChange(value.filter((v) => v !== optionValue));
  };

  const clearAll = () => onValueChange([]);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch('');
    }
  }, [open]);

  const selectedCount = value.length;
  const summary =
    selectedCount === 0
      ? placeholder
      : `${selectedCount} selected`;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex min-h-9 w-full items-center justify-between gap-2 rounded-none border border-input bg-transparent px-3 py-1.5 text-xs shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            {selectedCount === 0 ? (
              <span className="text-muted-foreground truncate">{placeholder}</span>
            ) : (
              value.map((v) => {
                const opt = options.find((o) => o.value === v);
                return (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 rounded-none border border-border bg-muted/80 px-2 py-0.5 text-xs text-foreground font-medium"
                  >
                    <span className="truncate max-w-[150px]">{opt?.label ?? v}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer text-muted-foreground hover:text-foreground rounded-none focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeValue(v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          removeValue(v);
                        }
                      }}
                      aria-label={`Remove ${opt?.label ?? v}`}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </span>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {selectedCount > 0 && (
              <span
                role="button"
                tabIndex={0}
                className="cursor-pointer text-muted-foreground hover:text-foreground p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
                title="Clear all"
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
          {selectedCount > 0 && (
            <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
              {value.map((v) => {
                const opt = options.find((o) => o.value === v);
                return (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 rounded-none border border-border bg-muted px-1.5 py-0.5 text-[10px]"
                  >
                    {opt?.label ?? v}
                    <button
                      type="button"
                      onClick={() => removeValue(v)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${v}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex flex-1 items-center gap-2">
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
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="ml-2 text-[10px] text-muted-foreground underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div
            className="overflow-y-auto p-1 custom-scrollbar"
            style={{ maxHeight }}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const checked = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-none py-1.5 pl-8 pr-2 text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                      option.disabled && 'pointer-events-none opacity-50'
                    )}
                    onClick={() => toggleOption(option.value)}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center rounded-none border border-border">
                      {checked && <Check className="h-3 w-3 text-primary" />}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

MultiSelect.displayName = 'MultiSelect';

export { MultiSelect };
