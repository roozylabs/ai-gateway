'use client';

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
import { apiExportAuditLogs } from '@/lib/api';

export default function AuditTrailPage() {
  const { data, isLoading, isError, refetch } = useAuditLogsQuery();
  const auditLogsList: ApiAuditLogItem[] = data?.data ?? [];

  const handleExportCsv = async () => {
    try {
      const blob = await apiExportAuditLogs({ format: 'csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-logs.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported audit logs as CSV');
    } catch {
      toast.error('Failed to export audit logs');
    }
  };

  const handleExportJson = async () => {
    try {
      const blob = await apiExportAuditLogs({ format: 'json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-logs.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported audit logs as JSON');
    } catch {
      toast.error('Failed to export audit logs');
    }
  };

  const columns: Column<ApiAuditLogItem>[] = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => <span className="font-mono text-muted-foreground">{String(val)}</span>,
    },
    {
      title: 'Actor',
      dataIndex: 'actorEmail',
      key: 'actorEmail',
      render: (_val, item) => <span className="font-semibold text-foreground">{item.actorEmail || item.actorId}</span>,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (act) => <Badge variant="violet" className="font-mono text-[10px]">{String(act)}</Badge>,
    },
    {
      title: 'Target Resource',
      dataIndex: 'resource',
      key: 'resource',
      render: (_val, item) => <span className="text-muted-foreground">{item.resource || item.resourceId}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const s = String(status ?? '');
        const variant = s === 'success' ? 'success' : s === 'denied' ? 'destructive' : s === 'flagged' ? 'warning' : 'info';
        return <Badge variant={variant as any} className="text-[10px]">{s}</Badge>;
      },
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Audit Trail"
        description="Immutable system audit logs with actor, action, and status details."
        extra={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="prismViolet" size="sm" className="gap-1.5">
                <Download className="h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCsv}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJson}>
                <FileCode className="h-4 w-4 mr-2" /> Export JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-[#8B5CF6]" />
            <span>Audit Logs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              title="Failed to load audit logs"
              description="Could not connect to the Audit Trail database."
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
              searchPlaceholder="Search audit logs by actor or action..."
            />
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
