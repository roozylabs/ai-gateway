'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge, StatusDot } from '@/components/atoms/Badge';
import { useProvidersQuery, useDeleteProvider } from '@/hooks/queries/useProvidersQuery';
import { ApiProvider } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Server, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { getErrorMessage } from '@/types/ui';
import { ProviderFormDialog } from './_components/ProviderFormDialog';

export default function ProvidersPage() {
  const { data, isLoading, isError, refetch } = useProvidersQuery();
  const deleteMutation = useDeleteProvider();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDelete = (provider: ApiProvider) => {
    deleteMutation.mutate(provider.id, {
      onSuccess: () => toast.success(`${provider.name} removed`),
      onError: (err) => toast.error(`Failed to remove: ${getErrorMessage(err)}`),
    });
  };

  const providers: ApiProvider[] = (data && Array.isArray(data)) ? data : [];

  return (
    <AppLayout>
      <PageHeader
        title="AI Model Providers"
        description="Manage connected AI provider adapters, rate limits, and health status."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4" /> Connect New Provider
          </Button>
        }
      />

      {isError ? (
        <ErrorState
          title="Failed to fetch providers"
          description="Could not communicate with Prism AI Adapter backend."
          onRetry={refetch}
        />
      ) : !isLoading && providers.length === 0 ? (
        <EmptyState
          title="No Connected Providers"
          description="There are no AI providers configured in this workspace."
          action={
            <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => setDrawerOpen(true)}>
              <Plus className="h-4 w-4" /> Connect New Provider
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <Card key={provider.id} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Server className="h-5 w-5 text-primary" />
                    <span>{provider.name}</span>
                  </CardTitle>
                  <StatusDot status={provider.enabled ? 'healthy' : 'cooldown'} />
                </div>
                <CardDescription className="font-mono text-xs">type: {provider.type}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={provider.enabled ? 'success' : 'default'}>
                    {provider.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Base URL</span>
                  <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{provider.baseUrl || '-'}</span>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border pt-3">
                <ConfirmDialog
                  title="Remove Provider"
                  description={`Remove provider "${provider.name}"? This cannot be undone.`}
                  confirmText="Remove"
                  onConfirm={() => handleDelete(provider)}
                  trigger={
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full gap-1.5 text-xs"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  }
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <ProviderFormDialog open={drawerOpen} onOpenChange={setDrawerOpen} />
    </AppLayout>
  );
}
