'use client';

import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Badge } from '@/components/atoms/Badge';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { useLogsQuery } from '@/hooks/queries/useLogsQuery';
import { ApiRequestLog } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Activity } from 'lucide-react';

export default function LogsPage() {
  const { data, isLoading, isError, refetch } = useLogsQuery();

  const logsList = (data?.data ?? []) as ApiRequestLog[];

  const columns: Column<ApiRequestLog>[] = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (t) => <span className="font-mono text-muted-foreground">{t}</span>,
    },
    {
      title: 'Resolved Model',
      dataIndex: 'model',
      key: 'model',
      render: (mod) => <Badge variant="outline">{mod}</Badge>,
    },
    {
      title: 'HTTP Status',
      dataIndex: 'statusCode',
      key: 'statusCode',
      render: (code) => (
        <Badge variant={code === 200 ? 'success' : 'destructive'} className="font-mono">
          {code}
        </Badge>
      ),
    },
    {
      title: 'Latency',
      dataIndex: 'latencyMs',
      key: 'latencyMs',
      render: (lat) => <span className="font-mono">{lat} ms</span>,
    },
    {
      title: 'Token Count',
      dataIndex: 'totalTokens',
      key: 'totalTokens',
      render: (tok) => <span className="font-mono text-muted-foreground">{Number(tok || 0).toLocaleString()}</span>,
    },
    {
      title: 'Cost',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      render: (cost) => <span className="font-mono">{cost != null ? `$${Number(cost).toFixed(4)}` : '—'}</span>,
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Live Request Logs & HTTP Inspector"
        description="Inspect all incoming proxy requests, TTFT latency breakdown, HTTP status codes, and model routing decisions."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#8B5CF6]" />
            <span>Proxy Request Stream</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              title="Failed to load request logs"
              description="Could not connect to Prism Request Logs Inspector."
              onRetry={refetch}
            />
          ) : !isLoading && logsList.length === 0 ? (
            <EmptyState
              title="No Request Logs"
              description="No incoming HTTP proxy requests logged yet."
            />
          ) : (
            <DataTable
              dataSource={logsList}
              columns={columns}
              rowKey="id"
              loading={isLoading}
              pageSize={10}
              searchPlaceholder="Search logs by path or model..."
            />
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
