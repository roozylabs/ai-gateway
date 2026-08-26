'use client';

import React from 'react';
import { AlertTriangle, FolderOpen, RefreshCw } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Failed to load data',
  description = 'An error occurred while communicating with the Prism AI Gateway API backend.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-lg border border-red-500/20 bg-red-500/5 text-foreground space-y-3',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground max-w-sm mt-1">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 text-xs mt-2">
          <RefreshCw className="h-3.5 w-3.5" /> Try Again
        </Button>
      )}
    </div>
  );
}

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = 'No records found',
  description = 'There are no active records registered in this workspace yet.',
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-10 text-center rounded-lg border border-dashed border-border bg-card/40 text-foreground space-y-3',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        {icon || <FolderOpen className="h-6 w-6" />}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground max-w-sm mt-1">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
