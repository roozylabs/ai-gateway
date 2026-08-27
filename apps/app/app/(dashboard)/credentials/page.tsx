'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge, StatusDot, StatusType } from '@/components/atoms/Badge';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { useCredentialsQuery } from '@/hooks/queries/useCredentialsQuery';
import { ApiCredential } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Key, Plus, Trash2, Activity, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/molecules/Sheet';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { useProvidersQuery } from '@/hooks/queries/useProvidersQuery';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { ProviderFilterId, getErrorMessage } from '@/types/ui';
import {
  useTestCredentialMutation,
  useResetCooldownMutation,
  useCreateCredentialMutation,
  useDeleteCredentialMutation,
} from '@/hooks/mutations/useCredentialMutations';

interface CredentialFormData {
  name: string;
  apiKey: string;
  providerId: string;
}

const initialFormData: CredentialFormData = {
  name: '',
  apiKey: '',
  providerId: '',
};

export default function CredentialsPage() {
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderFilterId>('all');
  const { data, isLoading, isError, refetch } = useCredentialsQuery(selectedProviderId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CredentialFormData>(initialFormData);

  const { data: providersData } = useProvidersQuery();
  const providers = Array.isArray(providersData) ? providersData : [];

  const testMutation = useTestCredentialMutation();
  const resetCooldownMutation = useResetCooldownMutation();
  const createMutation = useCreateCredentialMutation();
  const deleteMutation = useDeleteCredentialMutation();

  const handleCreateCredential = () => {
    if (!formData.name.trim() || !formData.providerId || !formData.apiKey.trim()) return;

    createMutation.mutate(
      { providerId: formData.providerId, name: formData.name, apiKey: formData.apiKey },
      {
        onSuccess: () => {
          toast.success('Credential created successfully');
          setDrawerOpen(false);
          setFormData(initialFormData);
        },
        onError: (error) => {
          toast.error(`Failed to create credential: ${getErrorMessage(error)}`);
        },
      }
    );
  };

  const handleTestKey = async (providerId: string, credId: string) => {
    setTestingId(credId);
    try {
      const result = await testMutation.mutateAsync({ providerId, credId });
      if (result.success) {
        toast.success(`Key Health Check Passed (${result.latencyMs}ms latency)`);
      } else {
        toast.error(`Key Health Check Failed: ${result.error || result.message || 'Invalid key or quota exceeded'}`);
      }
      refetch();
    } catch (err: unknown) {
      toast.error(`Health check failed: ${getErrorMessage(err)}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleResetCooldown = async (providerId: string, credId: string) => {
    try {
      await resetCooldownMutation.mutateAsync({ providerId, credId });
      toast.success('Credential cooldown reset');
      refetch();
    } catch (err: unknown) {
      toast.error(`Failed to reset cooldown: ${getErrorMessage(err)}`);
    }
  };

  const credentialsList: ApiCredential[] = data?.data && Array.isArray(data.data) ? data.data : [];

  const columns: Column<ApiCredential>[] = [
    {
      title: 'Credential Label',
      dataIndex: 'name' as const,
      key: 'name',
      render: (val) => <span className="font-semibold text-foreground">{String(val ?? '')}</span>,
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
      render: (val, record) => (
        <span className="font-mono text-xs text-muted-foreground">
          {record.maskedKey || (val ? `${val}...` : '••••••••')}
        </span>
      ),
    },
    {
      title: 'Health Status',
      dataIndex: 'status' as const,
      key: 'status',
      render: (_val, record) => {
        let dotStatus: StatusType = 'healthy';
        if (record.status === 'degraded' || record.status === 'cooldown') dotStatus = 'degraded';
        if (record.status === 'exhausted' || record.status === 'disabled' || record.status === 'invalid') dotStatus = 'disabled';
        return (
          <div className="flex items-center gap-2">
            <StatusDot status={dotStatus} className="font-mono" />
          </div>
        );
      },
    },
    {
      title: 'Usage',
      dataIndex: 'requestCount' as const,
      key: 'requestCount',
      render: (val) => <span className="font-mono text-xs">{String(val ?? 0)} reqs</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_val, record) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1"
            onClick={() => handleTestKey(record.providerId, record.id)}
            disabled={testingId === record.id}
          >
            {testingId === record.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
            <span>Test Health</span>
          </Button>
          {(record.status === 'cooldown' || record.status === 'degraded') && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] text-amber-500 hover:text-amber-600"
              onClick={() => handleResetCooldown(record.providerId, record.id)}
            >
              Reset Cooldown
            </Button>
          )}
          <ConfirmDialog
            title="Delete Credential"
            description={`Are you sure you want to delete "${record.name}"? Active failovers using this key will be updated.`}
            confirmText="Delete"
            variant="destructive"
            onConfirm={() => {
              deleteMutation.mutate(
                { providerId: record.providerId, credId: record.id },
                {
                  onSuccess: () => {
                    toast.success('Credential deleted successfully');
                    refetch();
                  },
                  onError: (err) => {
                    toast.error(`Delete failed: ${getErrorMessage(err)}`);
                  },
                }
              );
            }}
            trigger={
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            }
          />
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Provider Credentials" description="Manage API keys, OAuth credentials, and key health rotation per provider." />
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading credentials...</CardContent></Card>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <PageHeader title="Provider Credentials" description="Manage API keys, OAuth credentials, and key health rotation per provider." />
        <Card><CardContent className="py-8"><ErrorState title="Failed to load credentials" onRetry={() => refetch()} /></CardContent></Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Provider Credentials"
        description="Manage API keys, OAuth credentials, and key health rotation per provider."
        extra={
          <Button variant="prismViolet" onClick={() => setDrawerOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Add Credential</span>
          </Button>
        }
      />

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Select value={selectedProviderId} onValueChange={(val) => setSelectedProviderId(val as ProviderFilterId)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
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
              <span>Configured Provider Credentials</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {credentialsList.length > 0 ? (
              <DataTable dataSource={credentialsList} columns={columns} rowKey="id" pageSize={10} searchPlaceholder="Search credentials by label..." />
            ) : (
              <EmptyState
                title="No Credentials Found"
                description="Add API keys for your AI providers to enable gateway routing."
                action={
                  <Button variant="prismViolet" onClick={() => setDrawerOpen(true)}>
                    Add Credential
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add Provider Credential</SheetTitle>
            <SheetDescription>Configure a new API key or secret credential for upstream AI routing.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="provider-select">Provider</Label>
              <Select value={formData.providerId} onValueChange={(val) => setFormData((prev) => ({ ...prev, providerId: val }))}>
                <SelectTrigger id="provider-select">
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-name">Credential Label</Label>
              <Input
                id="cred-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Production Key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-key">API Key</Label>
              <Input
                id="cred-key"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData((prev) => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-..."
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              variant="prismViolet"
              onClick={handleCreateCredential}
              disabled={!formData.name.trim() || !formData.providerId || !formData.apiKey.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Add Credential'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
