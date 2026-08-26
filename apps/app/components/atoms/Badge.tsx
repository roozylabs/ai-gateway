import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow',
        outline: 'text-foreground border-border',
        success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        warning: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        info: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
        violet: 'border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export type StatusType = 'healthy' | 'degraded' | 'cooldown' | 'exhausted' | 'disabled' | 'operational' | 'maintenance';

export interface StatusDotProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusColorMap: Record<StatusType, { dot: string; text: string }> = {
  healthy: { dot: 'bg-emerald-500', text: 'Healthy' },
  operational: { dot: 'bg-emerald-500', text: 'Operational' },
  degraded: { dot: 'bg-amber-500', text: 'Degraded' },
  cooldown: { dot: 'bg-amber-500 animate-pulse', text: 'Cooldown' },
  exhausted: { dot: 'bg-red-500', text: 'Exhausted' },
  disabled: { dot: 'bg-slate-400', text: 'Disabled' },
  maintenance: { dot: 'bg-cyan-500 animate-pulse', text: 'Maintenance' },
};

function StatusDot({ status, label, className }: StatusDotProps) {
  const cfg = statusColorMap[status] || statusColorMap.disabled;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', className)}>
      <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
      <span>{label || cfg.text}</span>
    </span>
  );
}

export { Badge, badgeVariants, StatusDot };
