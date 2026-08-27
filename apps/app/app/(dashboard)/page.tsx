'use client';

import { useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { MetricCard } from '@/components/molecules/MetricCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { StatusDot, Badge, StatusType } from '@/components/atoms/Badge';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { LazyTrafficChart } from '@/components/organisms/ChartContainer';
import {
  useDashboardStatsQuery,
  useUsageChartQuery,
  useDashboardHealthQuery,
} from '@/hooks/queries/useDashboardQuery';
import { useLogsQuery } from '@/hooks/queries/useLogsQuery';
import { ApiRequestLog, ApiProviderHealth } from '@/lib/api';
import {
  Activity,
  Zap,
  DollarSign,
  CheckCircle2,
  Server,
} from 'lucide-react';

function providerStatusToDot(status: ApiProviderHealth['status']): StatusType {
  if (status === 'down') return 'disabled';
  return status;
}

interface RecentActivity {
  id: string;
  time: string;
  route: string;
  model: string;
  latency: number;
  cost: number;
  status: 'success' | 'error';
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStatsQuery();
  const { data: usageData } = useUsageChartQuery();
  const { data: logsData } = useLogsQuery();
  const { data: healthData } = useDashboardHealthQuery();

  const trafficData = useMemo(() => {
    if (!usageData) return [];
    return usageData.map((p) => ({ time: p.date, requests: p.requests }));
  }, [usageData]);

  const activities: RecentActivity[] = useMemo(() => {
    if (!logsData?.data) return [];
    return logsData.data.slice(0, 5).map((log: ApiRequestLog) => ({
      id: log.id,
      time: new Date(log.createdAt).toLocaleTimeString('en-US', { hour12: false }),
      route: log.clientApp || log.model,
      model: log.model,
      latency: log.latencyMs,
      cost: log.estimatedCost ?? 0,
      status: (log.statusCode < 400 ? 'success' : 'error') as 'success' | 'error',
    }));
  }, [logsData]);

  const activityColumns: Column<RecentActivity>[] = [
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      render: (time) => <span className="font-mono text-muted-foreground">{time}</span>,
    },
    {
      title: 'Route Policy',
      dataIndex: 'route',
      key: 'route',
      render: (route) => (
        <span className="font-mono text-[#8B5CF6] font-semibold">{route}</span>
      ),
    },
    {
      title: 'Resolved Model',
      dataIndex: 'model',
      key: 'model',
      render: (model) => <Badge variant="outline">{model}</Badge>,
    },
    {
      title: 'Latency',
      dataIndex: 'latency',
      key: 'latency',
      render: (lat) => <span className="font-mono">{lat} ms</span>,
    },
    {
      title: 'Cost',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost) => <span className="font-mono text-emerald-500">${Number(cost || 0).toFixed(4)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge variant={status === 'success' ? 'success' : 'destructive'}>
          {String(status ?? '').toUpperCase()}
        </Badge>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="AI Infrastructure Overview"
        description="Monitor traffic, model latency, cost breakdown, and real-time credential health across all providers."
      />

      {/* Summary KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          title="Total Requests (24h)"
          value={stats?.totalRequests ? stats.totalRequests.toLocaleString() : '—'}
          subtitle="vs previous 24-hour period"
          icon={<Activity className="h-4 w-4 text-[#8B5CF6]" />}
          loading={isLoading}
        />
        <MetricCard
          title="Tokens Processed"
          value={stats?.totalTokens ? `${(stats.totalTokens / 1000000).toFixed(1)}M` : '—'}
          subtitle={stats ? `${(stats.totalTokens / 1000000 * 0.667).toFixed(1)}M Input / ${(stats.totalTokens / 1000000 * 0.333).toFixed(1)}M Output` : undefined}
          icon={<Zap className="h-4 w-4 text-cyan-500" />}
          loading={isLoading}
        />
        <MetricCard
          title="Total Expenditure"
          value={stats?.totalEstimatedCost != null ? `$${stats.totalEstimatedCost.toFixed(2)}` : '—'}
          subtitle="via Smart Routing"
          icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
          loading={isLoading}
        />
        <MetricCard
          title="Gateway Success Rate"
          value={stats ? `${(100 - stats.errorRate).toFixed(2)}%` : '—'}
          subtitle={stats ? `${stats.errorRate.toFixed(2)}% failover auto-rerouted` : undefined}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          loading={isLoading}
        />
      </div>

      {/* Main Grid: Traffic Chart + Gateway Provider Health */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Real-Time Request Traffic</CardTitle>
              <span className="font-mono text-xs text-muted-foreground">Requests / Hour</span>
            </div>
          </CardHeader>
          <CardContent>
            <LazyTrafficChart data={trafficData} height={260} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-[#8B5CF6]" />
                <span>Provider Availability</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthData && healthData.length > 0 ? (
              healthData.map((provider: ApiProviderHealth) => (
                <div key={provider.name} className="flex items-center justify-between p-2.5 rounded-none border border-border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <StatusDot status={providerStatusToDot(provider.status)} />
                    <span className="font-semibold text-xs">{provider.name}</span>
                  </div>
                  <span className={`font-mono text-xs ${provider.status === 'degraded' ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    {provider.type} ({provider.credCount} cred{provider.credCount !== 1 ? 's' : ''})
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">No provider data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent AI Activity Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#8B5CF6]" />
              <span>Recent AI Gateway Activity Logs</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            dataSource={activities}
            columns={activityColumns}
            rowKey="id"
            pageSize={5}
            searchPlaceholder="Filter activity logs..."
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
}
