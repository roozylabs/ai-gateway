'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { MetricCard } from '@/components/molecules/MetricCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { StatusDot, Badge } from '@/components/atoms/Badge';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { LazyTrafficChart } from '@/components/organisms/ChartContainer';
import { useDashboardStatsQuery } from '@/hooks/queries/useDashboardQuery';
import {
  Activity,
  Zap,
  DollarSign,
  CheckCircle2,
  Server,
  Sparkles,
} from 'lucide-react';

interface RecentActivity {
  id: string;
  time: string;
  route: string;
  model: string;
  latency: number;
  cost: number;
  status: 'success' | 'error';
}

const mockActivities: RecentActivity[] = [
  { id: '1', time: '19:42:01', route: 'prism-auto', model: 'claude-sonnet-3.7', latency: 184, cost: 0.0032, status: 'success' },
  { id: '2', time: '19:41:45', route: 'agent:dev-agent', model: 'gpt-5-turbo', latency: 92, cost: 0.0018, status: 'success' },
  { id: '3', time: '19:41:12', route: 'agent:qa-suite', model: 'gemini-2.5-pro', latency: 211, cost: 0.0009, status: 'success' },
  { id: '4', time: '19:40:33', route: 'prism-auto', model: 'opencode-coder', latency: 145, cost: 0.0012, status: 'success' },
  { id: '5', time: '19:39:58', route: 'direct', model: 'gpt-5-mini', latency: 88, cost: 0.0004, status: 'success' },
];

const mockTraffic = [
  { time: '12:00', requests: 1200 },
  { time: '13:00', requests: 2100 },
  { time: '14:00', requests: 1800 },
  { time: '15:00', requests: 3400 },
  { time: '16:00', requests: 4200 },
  { time: '17:00', requests: 3900 },
  { time: '18:00', requests: 5100 },
];

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStatsQuery();

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
          value={stats?.totalRequests ? stats.totalRequests.toLocaleString() : '1,284,291'}
          delta="+12.4%"
          deltaType="positive"
          subtitle="vs previous 24-hour period"
          icon={<Activity className="h-4 w-4 text-[#8B5CF6]" />}
          loading={isLoading}
        />
        <MetricCard
          title="Tokens Processed"
          value={stats?.totalTokens ? `${(stats.totalTokens / 1000000).toFixed(1)}M` : '48.2M'}
          delta="+8.1%"
          deltaType="positive"
          subtitle="32.1M Input / 16.1M Output"
          icon={<Zap className="h-4 w-4 text-cyan-500" />}
          loading={isLoading}
        />
        <MetricCard
          title="Total Expenditure"
          value={stats?.totalEstimatedCost ? `$${stats.totalEstimatedCost.toFixed(2)}` : '$182.42'}
          delta="-4.2%"
          deltaType="positive"
          subtitle="Saved $34.12 via Smart Routing"
          icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
          loading={isLoading}
        />
        <MetricCard
          title="Gateway Success Rate"
          value="99.94%"
          delta="+0.02%"
          deltaType="positive"
          subtitle="0.06% failover auto-rerouted"
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
            <LazyTrafficChart data={mockTraffic} height={260} />
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
            <div className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <StatusDot status="healthy" />
                <span className="font-semibold text-xs">OpenAI</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">99.98% (124ms)</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <StatusDot status="healthy" />
                <span className="font-semibold text-xs">Anthropic</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">99.94% (182ms)</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <StatusDot status="degraded" />
                <span className="font-semibold text-xs">Google Gemini</span>
              </div>
              <span className="font-mono text-xs text-amber-500">97.21% (240ms)</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <StatusDot status="healthy" />
                <span className="font-semibold text-xs">OpenCode Coder</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">100.0% (92ms)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent AI Activity Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#8B5CF6]" />
              <span>Recent AI Gateway Activity Logs</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            dataSource={mockActivities}
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
