'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { useModelsListQuery } from '@/hooks/queries/useModelsListQuery';
import { useDeleteModel } from '@/hooks/queries/useModelsQuery';
import { useProvidersQuery } from '@/hooks/queries/useProvidersQuery';
import { ApiModel } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { getErrorMessage } from '@/types/ui';
import { ModelFormDialog } from './_components/ModelFormDialog';

export default function ModelsPage() {
  const { data, isLoading, isError, refetch } = useModelsListQuery();
  const { data: providers } = useProvidersQuery();
  const deleteMutation = useDeleteModel();

  const [selectedProviderId, setSelectedProviderId] = useState<string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const allModels: ApiModel[] = data?.data ?? [];

  const modelsList = selectedProviderId === 'all'
    ? allModels
    : allModels.filter((m) => m.providerId === selectedProviderId);

  const providerOptions = Array.isArray(providers) ? providers : [];

  const handleDelete = (model: ApiModel) => {
    deleteMutation.mutate(
      { providerId: model.providerId, modelId: model.id },
      {
        onSuccess: () => toast.success(`${model.displayName || model.name} removed`),
        onError: (err) => toast.error(`Failed to remove: ${getErrorMessage(err)}`),
      }
    );
  };

  const columns: Column<ApiModel>[] = [
    {
      title: 'Model Name',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (displayName, record) => (
        <span className="font-semibold text-foreground">{displayName || record.name}</span>
      ),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug) => <span className="font-mono text-muted-foreground">{slug}</span>,
    },
    {
      title: 'Provider',
      dataIndex: 'providerName',
      key: 'providerName',
      render: (providerName) => <Badge variant="outline">{providerName || '—'}</Badge>,
    },
    {
      title: 'Pricing (Input / Output)',
      key: 'pricing',
      render: (_, record) => (
        <span className="font-mono text-xs">
          <span className="text-emerald-500">${(record.inputPricePer1M ?? 0).toFixed(2)}</span> / <span className="text-emerald-500">${(record.outputPricePer1M ?? 0).toFixed(2)}</span> per 1M tokens
        </span>
      ),
    },
    {
      title: 'Scores (Q / S)',
      key: 'scores',
      render: (_, record) => (
        <div className="flex gap-1.5 flex-wrap">
          <Badge variant="violet" className="font-mono text-[10px]">Q: {record.qualityScore != null ? `${record.qualityScore}%` : '—'}</Badge>
          <Badge variant="info" className="font-mono text-[10px]">S: {record.speedScore != null ? `${record.speedScore}%` : '—'}</Badge>
          {record.codingScore != null && <Badge variant="outline" className="font-mono text-[10px]">Code: {record.codingScore}%</Badge>}
        </div>
      ),
    },
    {
      title: '',
      key: 'actions',
      render: (_, record) => (
        <ConfirmDialog
          title="Remove Model"
          description={`Remove model "${record.displayName || record.name}"? This cannot be undone.`}
          confirmText="Remove"
          onConfirm={() => handleDelete(record)}
          trigger={
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 text-xs"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          }
        />
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Model Registry & Routing Score Matrix"
        description="Unified model catalog with pricing benchmarks and automated routing scores."
        extra={
          <div className="flex items-center gap-3">
            {providerOptions.length > 0 && (
              <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providerOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => setDrawerOpen(true)}>
              <Plus className="h-4 w-4" /> Add Model
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#8B5CF6]" />
            <span>Supported LLM Models Catalog</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              title="Failed to load model catalog"
              description="Could not connect to Prism Model Registry."
              onRetry={refetch}
            />
          ) : !isLoading && modelsList.length === 0 ? (
            <EmptyState
              title="No Models Registered"
              description="No models available in the current matrix."
              action={
                <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => setDrawerOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Model
                </Button>
              }
            />
          ) : (
            <DataTable
              dataSource={modelsList}
              columns={columns}
              rowKey="id"
              loading={isLoading}
              pageSize={10}
              searchPlaceholder="Search model catalog..."
              onRefresh={refetch}
            />
          )}
        </CardContent>
      </Card>

      <ModelFormDialog
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        providerOptions={providerOptions}
      />
    </AppLayout>
  );
}
