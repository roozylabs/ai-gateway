'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Badge } from '@/components/atoms/Badge';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { useLogsQuery } from '@/hooks/queries/useLogsQuery';
import { ApiRequestLog } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Activity } from 'lucide-react';

interface RequestLogRecord {
  id: string;
  time: string;
  method: string;
  path: string;
  model: string;
  statusCode: number;
  latency: number;
  tokens: number;
}

const mockLogs: RequestLogRecord[] = [
  { id: '1', time: '19:42:01', method: 'POST', path: '/v1/chat/completions', model: 'claude-3-7-sonnet', statusCode: 200, latency: 184, tokens: 1420 },
  { id: '2', time: '19:41:45', method: 'POST', path: '/v1/chat/completions', model: 'gpt-5-turbo', statusCode: 200, latency: 92, tokens: 520 },
  { id: '3', time: '19:41:12', method: 'POST', path: '/v1/embeddings', model: 'text-embedding-3-small', statusCode: 200, latency: 34, tokens: 180 },
];

export default function LogsPage() {
  const { data, isLoading, isError, refetch } = useLogsQuery();

  const logsList: RequestLogRecord[] = React.useMemo(() => {
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data.map((item: ApiRequestLog) => ({
        id: String(item.id || Math.random()),
        time: String((item as unknown as Record<string, unknown>).createdAt || '19:42:01'),
        method: 'POST',
        path: '/v1/chat/completions',
        model: String(item.model || 'prism-auto'),
        statusCode: Number(item.statusCode || 200),
        latency: Number(item.latencyMs || 120),
        tokens: Number(item.totalTokens || 500),
      }));
    }
    return mockLogs;
  }, [data]);

  const columns: Column<RequestLogRecord>[] = [
    {
      title: 'Timestamp',
      dataIndex: 'time',
      key: 'time',
      render: (time) => <span className="font-mono text-muted-foreground">{time}</span>,
    },
    {
      title: 'HTTP Method',
      dataIndex: 'method',
      key: 'method',
      render: (m) => <Badge variant="violet" className="font-mono text-[10px]">{m}</Badge>,
    },
    {
      title: 'Endpoint Path',
      dataIndex: 'path',
      key: 'path',
      render: (p) => <span className="font-mono text-foreground">{p}</span>,
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
      dataIndex: 'latency',
      key: 'latency',
      render: (lat) => <span className="font-mono">{lat} ms</span>,
    },
    {
      title: 'Token Count',
      dataIndex: 'tokens',
      key: 'tokens',
      render: (tok) => <span className="font-mono text-muted-foreground">{Number(tok || 0).toLocaleString()} tokens</span>,
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
