'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { useModelsListQuery } from '@/hooks/queries/useModelsListQuery';
import { useCreateModel, useDeleteModel } from '@/hooks/queries/useModelsQuery';
import { useProvidersQuery } from '@/hooks/queries/useProvidersQuery';
import { ApiModel } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/molecules/Sheet';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';

import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';

export default function ModelsPage() {
  const { data, isLoading, isError, refetch } = useModelsListQuery();
  const { data: providers } = useProvidersQuery();
  const createMutation = useCreateModel();
  const deleteMutation = useDeleteModel();

  const [selectedProviderId, setSelectedProviderId] = useState<string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formProviderId, setFormProviderId] = useState('');
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formInputPrice, setFormInputPrice] = useState('');
  const [formOutputPrice, setFormOutputPrice] = useState('');
  const [formQualityScore, setFormQualityScore] = useState('');
  const [formSpeedScore, setFormSpeedScore] = useState('');

  const allModels: ApiModel[] = data?.data ?? [];

  const modelsList = selectedProviderId === 'all'
    ? allModels
    : allModels.filter((m) => m.providerId === selectedProviderId);

  const providerOptions = Array.isArray(providers) ? providers : [];

  const resetForm = () => {
    setFormProviderId('');
    setFormName('');
    setFormSlug('');
    setFormDisplayName('');
    setFormInputPrice('');
    setFormOutputPrice('');
    setFormQualityScore('');
    setFormSpeedScore('');
  };

  const handleCreate = () => {
    if (!formProviderId || !formName.trim() || !formSlug.trim()) return;
    createMutation.mutate(
      {
        providerId: formProviderId,
        data: {
          name: formName.trim(),
          slug: formSlug.trim(),
          displayName: formDisplayName.trim() || formName.trim(),
          inputPricePer1M: formInputPrice ? parseFloat(formInputPrice) : undefined,
          outputPricePer1M: formOutputPrice ? parseFloat(formOutputPrice) : undefined,
          qualityScore: formQualityScore ? parseInt(formQualityScore, 10) : undefined,
          speedScore: formSpeedScore ? parseInt(formSpeedScore, 10) : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Model created successfully');
          setDrawerOpen(false);
          resetForm();
        },
        onError: (err: Error) => toast.error(`Failed to create model: ${err.message}`),
      }
    );
  };

  const handleDelete = (model: ApiModel) => {
    deleteMutation.mutate(
      { providerId: model.providerId, modelId: model.id },
      {
        onSuccess: () => toast.success(`${model.displayName || model.name} removed`),
        onError: (err: Error) => toast.error(`Failed to remove: ${err.message}`),
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

      <Sheet open={drawerOpen} onOpenChange={(open) => { setDrawerOpen(open); if (!open) resetForm(); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add New Model</SheetTitle>
            <SheetDescription>Register a new LLM model under an existing provider.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="model-provider">Provider</Label>
              <Select value={formProviderId} onValueChange={setFormProviderId}>
                <SelectTrigger id="model-provider"><SelectValue placeholder="Select a provider" /></SelectTrigger>
                <SelectContent>
                  {providerOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-name">Model Name</Label>
              <Input id="model-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., GPT-4o" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-slug">Slug</Label>
              <Input id="model-slug" value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="e.g., gpt-4o" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-display">Display Name (optional)</Label>
              <Input id="model-display" value={formDisplayName} onChange={(e) => setFormDisplayName(e.target.value)} placeholder="e.g., GPT-4o" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model-input-price">Input Price / 1M</Label>
                <Input id="model-input-price" type="number" step="0.01" value={formInputPrice} onChange={(e) => setFormInputPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model-output-price">Output Price / 1M</Label>
                <Input id="model-output-price" type="number" step="0.01" value={formOutputPrice} onChange={(e) => setFormOutputPrice(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model-quality">Quality Score</Label>
                <Input id="model-quality" type="number" min="0" max="100" value={formQualityScore} onChange={(e) => setFormQualityScore(e.target.value)} placeholder="0-100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model-speed">Speed Score</Label>
                <Input id="model-speed" type="number" min="0" max="100" value={formSpeedScore} onChange={(e) => setFormSpeedScore(e.target.value)} placeholder="0-100" />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => { setDrawerOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              variant="prismViolet"
              onClick={handleCreate}
              disabled={!formProviderId || !formName.trim() || !formSlug.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Model'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
