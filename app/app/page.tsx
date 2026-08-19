'use client';

import React, { useState } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Table,
  Space,
  Segmented,
  DatePicker,
  Spin,
  Badge,
  Tag,
} from 'antd';
import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  LineChartOutlined,
  KeyOutlined,
  SyncOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import { useSSE } from '@/hooks/useSSE';
import { PageHeader, MetricCard, StatusTag } from '@/components/atoms';
import {
  apiGetDashboardStats,
  apiGetDashboardUsage,
  apiGetDashboardHealth,
  apiGetLogs,
  ApiRequestLog,
  ApiProviderHealth,
} from '@/lib/api';

const { Text } = Typography;
const { RangePicker } = DatePicker;

export default function DashboardPage() {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const { isConnected } = useSSE();

  const [timeframe, setTimeframe] = useState<'Daily' | 'Weekly' | 'Custom'>('Daily');

  // React Query calls
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: apiGetDashboardStats,
  });

  const daysParam = timeframe === 'Daily' ? 1 : timeframe === 'Weekly' ? 7 : 30;
  const { data: usageData = [], isLoading: usageLoading } = useQuery({
    queryKey: ['dashboard-usage', daysParam],
    queryFn: () => apiGetDashboardUsage(daysParam),
  });

  const { data: healthData = [], isLoading: healthLoading } = useQuery({
    queryKey: ['dashboard-health'],
    queryFn: apiGetDashboardHealth,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['recent-logs'],
    queryFn: () => apiGetLogs({ limit: 5 }),
  });

  // Ant Design Charts Config
  const chartData = usageData.map((item) => ({
    date: item.date,
    requests: item.requests,
  }));

  const chartConfig = {
    data: chartData,
    xField: 'date',
    yField: 'requests',
    smooth: true,
    height: 280,
    autoFit: true,
    color: '#1677ff',
    areaStyle: () => ({
      fill: 'l(270) 0:#ffffff 0.5:#e6f4ff 1:#1677ff',
    }),
    point: {
      size: 4,
      shape: 'diamond',
    },
    tooltip: {
      showMarkers: true,
    },
    theme: isDark ? 'dark' : 'light',
  };

  const columns = React.useMemo(() => [
    {
      title: 'Request ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <Text code>{id ? id.substring(0, 8) : '-'}</Text>,
    },
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => (val ? new Date(val).toLocaleTimeString() : '-'),
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      render: (m: string) => <Tag color="blue">{m || 'default'}</Tag>,
    },
    {
      title: 'Latency',
      dataIndex: 'latencyMs',
      key: 'latencyMs',
      render: (val: number) => `${val || 0} ms`,
    },
    {
      title: 'Tokens (In/Out)',
      key: 'tokens',
      render: (_: any, record: ApiRequestLog) => `${record.inputTokens} / ${record.outputTokens}`,
    },
    {
      title: 'Status',
      dataIndex: 'statusCode',
      key: 'statusCode',
      render: (code: number) => <StatusTag status={code} />,
    },
  ], []);

  return (
    <div>
      <PageHeader
        title="Dashboard Overview"
        description="Real-time metrics, model usage analytics, provider health, and live gateway activity"
      />

      {/* Top 4 KPI Cards */}
      <Spin spinning={statsLoading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="Total Requests"
              value={stats?.totalRequests || 0}
              prefix={<ThunderboltOutlined style={{ color: '#1677ff' }} />}
            />
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="Total Tokens Processed"
              value={stats?.totalTokens || 0}
              prefix={<CodeOutlined style={{ color: '#52c41a' }} />}
            />
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="Avg Latency"
              value={stats?.avgLatency || 0}
              precision={0}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              suffix="ms"
            />
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="Active Gateway Keys"
              value={stats?.activeKeys || 0}
              prefix={<KeyOutlined style={{ color: '#722ed1' }} />}
            />
          </Col>
        </Row>
      </Spin>

      {/* Analytics Chart & Health Grid */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <LineChartOutlined style={{ color: '#1677ff' }} />
                <span>Request Traffic & Volume</span>
              </Space>
            }
            extra={
              <Space>
                <Segmented
                  options={['Daily', 'Weekly', 'Custom']}
                  value={timeframe}
                  onChange={(val) => setTimeframe(val as any)}
                />
                {timeframe === 'Custom' && <RangePicker size="small" style={{ width: 210 }} />}
              </Space>
            }
            size="small"
            variant="borderless"
            style={{ borderRadius: 8 }}
          >
            <Spin spinning={usageLoading}>
              <div style={{ paddingTop: 16 }}>
                {chartData.length > 0 ? (
                  <Line {...chartConfig} />
                ) : (
                  <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text type="secondary">No usage data recorded for selected period</Text>
                  </div>
                )}
              </div>
            </Spin>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>AI Provider Health</span>
              </Space>
            }
            size="small"
            variant="borderless"
            style={{ borderRadius: 8, height: '100%' }}
          >
            <Spin spinning={healthLoading}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
                {healthData.map((provider: ApiProviderHealth) => (
                  <Card
                    key={provider.name}
                    size="small"
                    style={{
                      borderRadius: 6,
                      background: isDark ? '#141414' : '#fafafa',
                      border: `1px solid ${isDark ? '#303030' : '#f0f0f0'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>
                          {provider.name}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {provider.credCount} credential keys configured ({provider.type})
                        </Text>
                      </div>

                      <StatusTag status={provider.status} />
                    </div>
                  </Card>
                ))}

                {healthData.length === 0 && (
                  <Text type="secondary" style={{ textAlign: 'center', margin: '24px 0' }}>
                    No provider status configured
                  </Text>
                )}
              </div>
            </Spin>
          </Card>
        </Col>
      </Row>

      {/* Live Gateway Request Log Table */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <ThunderboltOutlined style={{ color: '#fa8c16' }} />
              <span>Live Gateway Activity Feed</span>
            </Space>
            {isConnected && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <SyncOutlined spin style={{ color: '#52c41a', marginRight: 6 }} />
                Auto-updating via SSE
              </Text>
            )}
          </div>
        }
        size="small"
        variant="borderless"
        style={{ borderRadius: 8 }}
      >
        <Table
          dataSource={logsData?.value || []}
          columns={columns}
          loading={logsLoading}
          pagination={false}
          rowKey="id"
          size="small"
        />
      </Card>
    </div>
  );
}
