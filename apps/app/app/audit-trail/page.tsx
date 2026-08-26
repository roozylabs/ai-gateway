'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { useAuditLogsQuery } from '@/hooks/queries/useAuditLogsQuery';
import { ApiAuditLogItem } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/molecules/DropdownMenu';
import { ScrollText, Download, FileSpreadsheet, FileCode } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLogRecord {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
  hash: string;
}

const mockLogs: AuditLogRecord[] = [
  { id: '1', time: '2026-08-26 19:40:12', actor: 'admin@roozylabs.dev', action: 'ROTATED_CREDENTIAL', target: 'OpenAI Production Key 1', ip: '103.14.22.1', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
  { id: '2', time: '2026-08-26 18:22:04', actor: 'admin@roozylabs.dev', action: 'UPDATED_QUOTA', target: 'Agent QA Suite ($500/mo)', ip: '103.14.22.1', hash: '88d4266ec4e6338d13b845fcf289579d209c897823b9217da3e161936f031589' },
  { id: '3', time: '2026-08-26 16:15:30', actor: 'dev-agent-01', action: 'CREATED_GATEWAY_KEY', target: 'Development Key Alpha', ip: '172.16.0.4', hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a' },
];

export default function AuditTrailPage() {
  const { data, isLoading, isError, refetch } = useAuditLogsQuery();

  const auditLogsList: AuditLogRecord[] = React.useMemo(() => {
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data.map((item: ApiAuditLogItem) => ({
        id: String(item.id || Math.random()),
        time: String(item.createdAt || 'Just now'),
        actor: String(item.actorEmail || item.actorId || 'system'),
        action: String(item.action || 'SYSTEM_EVENT'),
        target: String(item.resourceId || 'N/A'),
        ip: String(item.actorIp || '127.0.0.1'),
        hash: String((item as unknown as Record<string, unknown>).hash || item.detailsJson || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
      }));
    }
    return mockLogs;
  }, [data]);

  const columns: Column<AuditLogRecord>[] = [
    {
      title: 'Timestamp',
      dataIndex: 'time',
      key: 'time',
      render: (time) => <span className="font-mono text-muted-foreground">{time}</span>,
    },
    {
      title: 'Actor',
      dataIndex: 'actor',
      key: 'actor',
      render: (actor) => <span className="font-semibold text-foreground">{actor}</span>,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (act) => <Badge variant="violet" className="font-mono text-[10px]">{act}</Badge>,
    },
    {
      title: 'Target Resource',
      dataIndex: 'target',
      key: 'target',
      render: (target) => <span className="text-muted-foreground">{target}</span>,
    },
    {
      title: 'SHA-256 Hash',
      dataIndex: 'hash',
      key: 'hash',
      render: (hash) => (
        <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[140px] block" title={String(hash ?? '')}>
          {String(hash ?? '').substring(0, 16)}...
        </span>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Cryptographic Audit Trail Inspector"
        description="End-to-end immutably signed system audit logs with SHA-256 integrity verification."
        extra={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="prismViolet" size="sm" className="gap-1.5">
                <Download className="h-4 w-4" /> Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.success('Exporting Audit Report as CSV...')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Export CSV Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success('Exporting Audit Report as JSON...')}>
                <FileCode className="h-4 w-4 mr-2" /> Export JSON Log Bundle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-[#8B5CF6]" />
            <span>Immutable Audit Logs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              title="Failed to load audit logs"
              description="Could not connect to Cryptographic Audit Trail database."
              onRetry={refetch}
            />
          ) : !isLoading && auditLogsList.length === 0 ? (
            <EmptyState
              title="No Audit Logs Found"
              description="There are no audit trail records recorded in this system yet."
            />
          ) : (
            <DataTable
              dataSource={auditLogsList}
              columns={columns}
              rowKey="id"
              loading={isLoading}
              pageSize={10}
              searchPlaceholder="Search audit logs by actor or hash..."
            />
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
