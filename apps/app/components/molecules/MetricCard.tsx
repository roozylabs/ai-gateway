import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/molecules/Card';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  loading?: boolean;
}

export function MetricCard({
  title,
  value,
  delta,
  deltaType = 'positive',
  subtitle,
  icon,
  className,
  loading = false,
}: MetricCardProps) {
  return (
    <Card className={cn('overflow-hidden transition-all hover:border-border/80', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          {icon && <div className="text-muted-foreground/70">{icon}</div>}
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <div className="font-mono text-2xl font-bold tracking-tight text-foreground">
            {loading ? <span className="animate-pulse text-muted-foreground">...</span> : value}
          </div>

          {delta && (
            <span
              className={cn(
                'text-xs font-medium px-1.5 py-0.5 rounded',
                deltaType === 'positive' && 'bg-emerald-500/10 text-emerald-500',
                deltaType === 'negative' && 'bg-red-500/10 text-red-500',
                deltaType === 'neutral' && 'bg-slate-500/10 text-slate-500'
              )}
            >
              {delta}
            </span>
          )}
        </div>

        {subtitle && <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
