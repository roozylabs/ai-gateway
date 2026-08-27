'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge, StatusDot, StatusType } from '@/components/atoms/Badge';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { useCredentialsQuery, useDeleteCredential } from '@/hooks/queries/useCredentialsQuery';
import { ApiCredential, apiCreateCredential } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Key, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/molecules/Sheet';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProvidersQuery } from '@/hooks/queries/useProvidersQuery';

import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';

import { apiTestCredential, apiResetCredentialCooldown } from '@/lib/api';
import { Activity, RefreshCw } from 'lucide-react';

export default function CredentialsPage() {
  const [selectedProviderId, setSelectedProviderId] = useState('all');
  const { data, isLoading, isError, refetch } = useCredentialsQuery(selectedProviderId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formProviderId, setFormProviderId] = useState('');
  const queryClient = useQueryClient();
  const { data: providersData } = useProvidersQuery();
  const providers = Array.isArray(providersData) ? providersData : [];
  const deleteMutation = useDeleteCredential(selectedProviderId);

  const createMutation = useMutation({
    mutationFn: (d: { providerId: string; name: string; apiKey: string }) =>
      apiCreateCredential(d.providerId, { name: d.name, apiKey: d.apiKey }),
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

  const handleTestKey = async (providerId: string, credId: string) => {
    setTestingId(credId);
    try {
      const result = await apiTestCredential(providerId, credId);
      if (result.success) {
        toast.success(`Key Health Check Passed (${result.latencyMs}ms latency)`);
      } else {
        toast.error(`Key Health Check Failed: ${result.error || result.message || 'Invalid key or quota exceeded'}`);
      }
      refetch();
    } catch (err: any) {
      toast.error(`Health check failed: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleResetCooldown = async (providerId: string, credId: string) => {
    try {
      await apiResetCredentialCooldown(providerId, credId);
      toast.success('Credential cooldown reset');
      refetch();
    } catch (err: any) {
      toast.error(`Failed to reset cooldown: ${err.message}`);
    }
  };

  const credentialsList: ApiCredential[] = data?.data && Array.isArray(data.data) ? data.data : [];

  const columns: Column<ApiCredential>[] = [
    {
      title: 'Credential Label',
      dataIndex: 'name' as const,
      key: 'name',
      render: (val) => <span className="font-semibold text-foreground">{String(val)}</span>,
    },
    {
      title: 'Provider',
      dataIndex: 'providerName' as const,
      key: 'provider',
      render: (_val, record) => <Badge variant="outline">{record.providerName || record.providerId}</Badge>,
    },
    {
      title: 'Key Identifier',
      dataIndex: 'keyPrefix' as const,
      key: 'keyPrefix',
      render: (val) => <span className="font-mono text-muted-foreground">{String(val)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status' as const,
      key: 'status',
      render: (val) => <StatusDot status={(String(val) as StatusType) || 'healthy'} />,
    },
    {
      title: 'Request Count',
      dataIndex: 'requestCount' as const,
      key: 'requestCount',
      render: (val) => <span className="font-mono text-muted-foreground">{String(val ?? 0)}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_val, record) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            disabled={testingId === record.id}
            onClick={() => handleTestKey(record.providerId, record.id)}
          >
            {testingId === record.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3 text-[#8B5CF6]" />}
            Test Health
          </Button>

          {record.status === 'cooldown' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-amber-500"
              onClick={() => handleResetCooldown(record.providerId, record.id)}
            >
              <RefreshCw className="h-3 w-3" /> Reset Cooldown
            </Button>
          )}

          <ConfirmDialog
            title="Delete Credential"
            description={`Delete credential "${record.name}"? This cannot be undone.`}
            confirmText="Delete"
            onConfirm={() => {
              deleteMutation.mutate(record.id, {
                onSuccess: () => toast.success('Credential deleted'),
                onError: (error: Error) => toast.error(`Failed to delete: ${error.message}`),
              });
            }}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
            }
          />
        </div>
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

      <div className="mb-4">
        <Label htmlFor="provider-filter" className="text-sm font-medium mb-1 block">Filter by Provider</Label>
        <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
          <SelectTrigger id="provider-filter" className="w-64">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers (Global Pool)</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
              description="No API credentials configured for this provider. Add your first LLM key to enable routing."
              action={
                <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => setDrawerOpen(true)}>
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
