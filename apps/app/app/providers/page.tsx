'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge, StatusDot } from '@/components/atoms/Badge';
import { useProvidersQuery } from '@/hooks/queries/useProvidersQuery';
import { ApiProvider, apiCreateProvider } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Server, Plus, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/molecules/Sheet';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ProviderCardProps {
  name: string;
  slug: string;
  modelsCount: number;
  avgLatency: string;
  status: 'healthy' | 'degraded' | 'cooldown';
  activeCredentials: number;
}

const mockProviders: ProviderCardProps[] = [
  { name: 'OpenAI', slug: 'openai', modelsCount: 14, avgLatency: '124 ms', status: 'healthy', activeCredentials: 3 },
  { name: 'Anthropic', slug: 'anthropic', modelsCount: 8, avgLatency: '182 ms', status: 'healthy', activeCredentials: 2 },
  { name: 'Google Gemini', slug: 'google', modelsCount: 6, avgLatency: '240 ms', status: 'degraded', activeCredentials: 2 },
  { name: 'OpenCode Platform', slug: 'opencode', modelsCount: 4, avgLatency: '92 ms', status: 'healthy', activeCredentials: 1 },
];

export default function ProvidersPage() {
  const { data, isLoading, isError, refetch } = useProvidersQuery();
  const queryClient = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('openai');
  const [formBaseUrl, setFormBaseUrl] = useState('');

  const createMutation = useMutation({
    mutationFn: (providerData: { name: string; type: string; baseUrl: string }) =>
      apiCreateProvider({ name: providerData.name, type: providerData.type, baseUrl: providerData.baseUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toast.success('Provider created successfully');
      setDrawerOpen(false);
      setFormName('');
      setFormType('openai');
      setFormBaseUrl('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create provider: ${error.message}`);
    },
  });

  const providersList: ProviderCardProps[] = React.useMemo(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      return data.map((item: ApiProvider) => ({
        name: String(item.name || 'Provider'),
        slug: String(item.id || 'provider-slug'),
        modelsCount: 4,
        avgLatency: '120 ms',
        status: item.enabled ? 'healthy' : 'cooldown',
        activeCredentials: 1,
      }));
    }
    return mockProviders;
  }, [data]);

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
      ) : !isLoading && providersList.length === 0 ? (
        <EmptyState
          title="No Connected Providers"
          description="There are no AI providers configured in this workspace."
          action={
            <Button variant="prismViolet" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Connect New Provider
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {providersList.map((provider) => (
            <Card key={provider.slug} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Server className="h-5 w-5 text-[#8B5CF6]" />
                    <span>{provider.name}</span>
                  </CardTitle>
                  <StatusDot status={provider.status} />
                </div>
                <CardDescription className="font-mono text-xs">slug: {provider.slug}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                  <span className="text-muted-foreground">Supported Models</span>
                  <span className="font-mono font-bold text-foreground">{provider.modelsCount} models</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                  <span className="text-muted-foreground">Average Latency</span>
                  <span className="font-mono font-semibold text-foreground">{provider.avgLatency}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Active Key Pool</span>
                  <Badge variant="success">{provider.activeCredentials} active keys</Badge>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => toast.info(`Viewing details for ${provider.name}`)}
                >
                  Configure Adapter <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Connect New Provider</SheetTitle>
            <SheetDescription>Add a new AI provider adapter to your workspace.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="provider-name">Provider Name</Label>
              <Input id="provider-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., OpenAI Production" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-type">Provider Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger id="provider-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google Gemini</SelectItem>
                  <SelectItem value="opencode">OpenCode</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-url">Base URL</Label>
              <Input id="provider-url" value={formBaseUrl} onChange={(e) => setFormBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              variant="prismViolet"
              onClick={() => createMutation.mutate({ name: formName, type: formType, baseUrl: formBaseUrl })}
              disabled={!formName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Provider'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
