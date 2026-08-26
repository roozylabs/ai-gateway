'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Badge } from '@/components/atoms/Badge';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { useModelsQuery } from '@/hooks/queries/useModelsQuery';
import { ApiModel } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Layers } from 'lucide-react';

interface ModelMatrixRecord {
  id: string;
  name: string;
  slug: string;
  provider: string;
  inputCost: number;
  outputCost: number;
  qualityScore: number;
  costScore: number;
  speedScore: number;
}

const mockModels: ModelMatrixRecord[] = [
  { id: '1', name: 'Claude 3.7 Sonnet', slug: 'claude-3-7-sonnet', provider: 'Anthropic', inputCost: 3.0, outputCost: 15.0, qualityScore: 99, costScore: 82, speedScore: 88 },
  { id: '2', name: 'GPT-5 Turbo', slug: 'gpt-5-turbo', provider: 'OpenAI', inputCost: 2.5, outputCost: 10.0, qualityScore: 98, costScore: 85, speedScore: 95 },
  { id: '3', name: 'Gemini 2.5 Pro', slug: 'gemini-2.5-pro', provider: 'Google', inputCost: 1.25, outputCost: 5.0, qualityScore: 94, costScore: 92, speedScore: 90 },
  { id: '4', name: 'OpenCode Coder 33B', slug: 'opencode-coder-33b', provider: 'OpenCode', inputCost: 0.8, outputCost: 2.4, qualityScore: 91, costScore: 98, speedScore: 96 },
  { id: '5', name: 'GPT-5 Mini', slug: 'gpt-5-mini', provider: 'OpenAI', inputCost: 0.15, outputCost: 0.6, qualityScore: 88, costScore: 99, speedScore: 99 },
];

export default function ModelsPage() {
  const { data, isLoading, isError, refetch } = useModelsQuery();

  const modelsList: ModelMatrixRecord[] = React.useMemo(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      return data.map((item: ApiModel) => ({
        id: String(item.id || Math.random()),
        name: String(item.displayName || item.name || 'Model'),
        slug: String(item.slug || 'model-slug'),
        provider: String(item.providerName || item.providerId || 'AI Provider'),
        inputCost: Number(item.inputPricePer1M ?? 1.0),
        outputCost: Number(item.outputPricePer1M ?? 3.0),
        qualityScore: Number(item.qualityScore ?? 90),
        costScore: 90,
        speedScore: Number(item.speedScore ?? 90),
      }));
    }
    return mockModels;
  }, [data]);

  const columns: Column<ModelMatrixRecord>[] = [
    {
      title: 'Model Name',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span className="font-semibold text-foreground">{name}</span>,
    },
    {
      title: 'Model Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug) => <span className="font-mono text-muted-foreground">{slug}</span>,
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
      render: (provider) => <Badge variant="outline">{provider}</Badge>,
    },
    {
      title: 'Pricing (Input / Output)',
      key: 'pricing',
      render: (_, record) => (
        <span className="font-mono text-xs">
          <span className="text-emerald-500">${record.inputCost.toFixed(2)}</span> / <span className="text-emerald-500">${record.outputCost.toFixed(2)}</span> per 1M tokens
        </span>
      ),
    },
    {
      title: 'Quality Score',
      dataIndex: 'qualityScore',
      key: 'qualityScore',
      render: (score) => (
        <Badge variant="violet" className="font-mono">Q: {score}%</Badge>
      ),
    },
    {
      title: 'Speed Score',
      dataIndex: 'speedScore',
      key: 'speedScore',
      render: (score) => (
        <Badge variant="info" className="font-mono">S: {score}%</Badge>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Model Registry & Routing Score Matrix"
        description="Unified model catalog with JetBrains Mono pricing benchmarks and automated routing scores."
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
            />
          ) : (
            <DataTable
              dataSource={modelsList}
              columns={columns}
              rowKey="id"
              loading={isLoading}
              pageSize={10}
              searchPlaceholder="Search model catalog..."
            />
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
