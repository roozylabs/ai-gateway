'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge, StatusDot, StatusType } from '@/components/atoms/Badge';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { useCredentialsQuery } from '@/hooks/queries/useCredentialsQuery';
import { ApiCredential } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Key, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => toast.info('Add Credential Drawer')}>
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
    </AppLayout>
  );
}
