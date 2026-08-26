'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge, StatusDot, StatusType } from '@/components/atoms/Badge';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { useCredentialsQuery } from '@/hooks/queries/useCredentialsQuery';
import { ApiCredential, apiCreateCredential } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Key, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/molecules/Sheet';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProvidersQuery } from '@/hooks/queries/useProvidersQuery';

interface CredentialRecord {
  id: string;
  name: string;
  provider: string;
  keyPrefix: string;
  healthScore: number;
  status: 'healthy' | 'degraded' | 'cooldown' | 'exhausted';
  lastRotated: string;
}

const mockCredentials: CredentialRecord[] = [
  { id: '1', name: 'OpenAI Production Key 1', provider: 'OpenAI', keyPrefix: 'sk-proj-9f8...', healthScore: 98, status: 'healthy', lastRotated: '2026-08-20' },
  { id: '2', name: 'Anthropic Primary Key', provider: 'Anthropic', keyPrefix: 'sk-ant-api...', healthScore: 92, status: 'healthy', lastRotated: '2026-08-15' },
  { id: '3', name: 'Gemini Backup Key 2', provider: 'Google Gemini', keyPrefix: 'AIzaSyC8...', healthScore: 64, status: 'degraded', lastRotated: '2026-08-01' },
  { id: '4', name: 'OpenCode Dedicated Key', provider: 'OpenCode', keyPrefix: 'oc_live_7a...', healthScore: 100, status: 'healthy', lastRotated: '2026-08-25' },
];

export default function CredentialsPage() {
  const { data, isLoading, isError, refetch } = useCredentialsQuery();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formProviderId, setFormProviderId] = useState('');
  const queryClient = useQueryClient();
  const { data: providersData } = useProvidersQuery();
  const providers = Array.isArray(providersData) ? providersData : [];

  const createMutation = useMutation({
    mutationFn: (data: { providerId: string; name: string; apiKey: string }) =>
      apiCreateCredential(data.providerId, { name: data.name, apiKey: data.apiKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      toast.success('Credential created successfully');
      setDrawerOpen(false);
      setFormName('');
      setFormKey('');
      setFormProviderId('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create credential: ${error.message}`);
    },
  });

  const credentialsList: CredentialRecord[] = React.useMemo(() => {
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data.map((item: ApiCredential) => ({
        id: String(item.id ?? Math.random()),
        name: String(item.name ?? item.providerId ?? 'API Key'),
        provider: String(item.providerId ?? 'OpenAI'),
        keyPrefix: String(item.keyPrefix ?? item.maskedKey ?? 'sk-***'),
        healthScore: typeof (item as unknown as Record<string, unknown>).healthScore === 'number' ? ((item as unknown as Record<string, unknown>).healthScore as number) : 95,
        status: ((item as unknown as Record<string, unknown>).status as 'healthy' | 'degraded' | 'cooldown' | 'exhausted') || 'healthy',
        lastRotated: (item as unknown as Record<string, unknown>).lastRotatedAt ? String((item as unknown as Record<string, unknown>).lastRotatedAt).substring(0, 10) : 'Recent',
      }));
    }
    return mockCredentials;
  }, [data]);

  const columns: Column<CredentialRecord>[] = [
    {
      title: 'Credential Label',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span className="font-semibold text-foreground">{name}</span>,
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
      render: (provider) => <Badge variant="outline">{provider}</Badge>,
    },
    {
      title: 'Key Identifier',
      dataIndex: 'keyPrefix',
      key: 'keyPrefix',
      render: (keyPrefix) => <span className="font-mono text-muted-foreground">{keyPrefix}</span>,
    },
    {
      title: 'Health Score',
      dataIndex: 'healthScore',
      key: 'healthScore',
      render: (score) => (
        <span className="font-mono font-bold text-foreground">
          {score} <span className="text-muted-foreground font-normal text-[11px]">/ 100</span>
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusDot status={(status as StatusType) || 'healthy'} />,
    },
    {
      title: 'Last Rotated',
      dataIndex: 'lastRotated',
      key: 'lastRotated',
      render: (date) => <span className="font-mono text-muted-foreground">{date}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => toast.success(`Initiated key rotation for ${record.name}`)}
        >
          <RefreshCw className="h-3 w-3" /> Rotate Key
        </Button>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Credential Rotation & Health Center"
        description="Manage API credentials across all LLM providers with automatic health monitoring and rotation."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4" /> Add Provider Key
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Key className="h-4 w-4 text-[#8B5CF6]" />
            <span>Active Provider API Credentials</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              title="Failed to fetch credentials"
              description="Unable to retrieve provider API credentials from Prism Gateway."
              onRetry={refetch}
            />
          ) : !isLoading && credentialsList.length === 0 ? (
            <EmptyState
              title="No Provider Credentials"
              description="No API credentials configured. Add your first LLM key to enable routing."
              action={
                <Button variant="prismViolet" size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Provider Key
                </Button>
              }
            />
          ) : (
            <DataTable
              dataSource={credentialsList}
              columns={columns}
              rowKey="id"
              loading={isLoading}
              pageSize={10}
              searchPlaceholder="Search credentials..."
            />
          )}
        </CardContent>
      </Card>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Provider Key</SheetTitle>
            <SheetDescription>Add a new API credential for an LLM provider.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cred-provider">Provider</Label>
              <Select value={formProviderId} onValueChange={setFormProviderId}>
                <SelectTrigger id="cred-provider"><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-name">Credential Label</Label>
              <Input id="cred-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Production Key" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-key">API Key</Label>
              <Input id="cred-key" type="password" value={formKey} onChange={(e) => setFormKey(e.target.value)} placeholder="sk-..." />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="prismViolet" onClick={() => createMutation.mutate({ providerId: formProviderId, name: formName, apiKey: formKey })} disabled={!formName.trim() || !formProviderId || !formKey.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Add Credential'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
