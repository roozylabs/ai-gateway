'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { DataTable, type Column } from '@/components/organisms/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/molecules/Dialog';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Badge } from '@/components/atoms/Badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/molecules/Select';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { useGatewayKeysQuery, useCreateGatewayKey, useDeleteGatewayKey } from '@/hooks/queries/useGatewayKeysQuery';
import { useProvidersQuery } from '@/hooks/queries/useProvidersQuery';
import type { ApiGatewayKey } from '@/lib/api';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GatewayKeysPage() {
  const { data, isLoading, isError, refetch } = useGatewayKeysQuery();
  const createMutation = useCreateGatewayKey();
  const deleteMutation = useDeleteGatewayKey();
  const { data: providers } = useProvidersQuery();

  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRateLimit, setFormRateLimit] = useState('100');
  const [formProviderId, setFormProviderId] = useState('');

  const list = data?.data ?? [];

  const resetForm = () => {
    setFormName('');
    setFormRateLimit('100');
    setFormProviderId('');
  };

  const handleCreate = () => {
    if (!formName.trim()) {
      toast.error('Key name is required');
      return;
    }
    if (!formProviderId) {
      toast.error('Please select a provider');
      return;
    }

    createMutation.mutate(
      {
        name: formName.trim(),
        providerId: formProviderId,
        rateLimit: Number(formRateLimit) || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Gateway key created');
          setModalOpen(false);
          resetForm();
        },
        onError: () => {
          toast.error('Failed to create gateway key');
        },
      }
    );
  };

  const handleDelete = (key: ApiGatewayKey) => {
    deleteMutation.mutate(key.id, {
      onSuccess: () => toast.success('Key deleted'),
      onError: () => toast.error('Failed to delete key'),
    });
  };

  const columns: Column<ApiGatewayKey>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (val) => <span className="font-semibold">{String(val)}</span>,
    },
    {
      title: 'Key Prefix',
      dataIndex: 'keyPrefix',
      key: 'keyPrefix',
      render: (val) => <span className="font-mono text-muted-foreground">{String(val)}</span>,
    },
    {
      title: 'Allowed Models',
      key: 'allowedModels',
      render: (_, record) => (
        <div className="flex gap-1 flex-wrap">
          {record.allowedModels && record.allowedModels.length > 0 ? (
            record.allowedModels.map((m) => <Badge key={m} variant="outline" className="text-[10px] font-mono">{m}</Badge>)
          ) : (
            <Badge variant="violet" className="text-[10px]">All Models (*)</Badge>
          )}
        </div>
      ),
    },
    {
      title: 'Rate Limit',
      dataIndex: 'rateLimit',
      key: 'rateLimit',
      render: (val) => <span className="font-mono">{String(val)} req/min</span>,
    },
    {
      title: 'Requests',
      dataIndex: 'requestCount',
      key: 'requestCount',
      render: (val) => <span className="font-mono">{String(val)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (val) => (
        <Badge variant={val ? 'success' : 'outline'}>
          {val ? 'Active' : 'Disabled'}
        </Badge>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <ConfirmDialog
          title="Delete Gateway Key"
          description={`Delete key "${record.name}"? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={() => handleDelete(record)}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete key"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          }
        />
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Gateway Keys"
        description="Create and manage API keys that authenticate requests through the Prism AI Gateway."
        extra={
          <Button
            variant="prismViolet"
            size="sm"
            className="gap-1.5"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> Create Key
          </Button>
        }
      />

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : !isLoading && list.length === 0 ? (
        <EmptyState
          title="No gateway keys"
          description="Create your first API key to start routing requests through the gateway."
          icon={<KeyRound className="h-6 w-6" />}
          action={
            <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> Create Key
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#8B5CF6]" />
              <span>Active Keys</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              dataSource={list}
              columns={columns}
              rowKey="id"
              loading={isLoading}
              searchPlaceholder="Search gateway keys..."
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Gateway Key</DialogTitle>
            <DialogDescription>
              Generate a new API key to authenticate requests through the gateway.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g. production-key"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={formProviderId} onValueChange={setFormProviderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate-limit">Rate Limit (req/min)</Label>
              <Input
                id="rate-limit"
                type="number"
                placeholder="100"
                value={formRateLimit}
                onChange={(e) => setFormRateLimit(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="prismViolet"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
