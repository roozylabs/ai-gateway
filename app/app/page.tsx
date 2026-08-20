'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dayjs, { Dayjs } from 'dayjs';
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
  Button,
} from 'antd';
import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  LineChartOutlined,
  KeyOutlined,
  SyncOutlined,
  CodeOutlined,
  DollarOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import { useSSE } from '@/hooks/useSSE';
import { PageHeader, MetricCard, StatusTag } from '@/components/atoms';
import {
  apiGetDashboardStats,
  apiGetDashboardUsage,
  apiGetDashboardHealth,
  apiGetSettings,
  apiGetLogs,
  ApiRequestLog,
  ApiProviderHealth,
  ApiSetting,
} from '@/lib/api';

const { Text } = Typography;
const { RangePicker } = DatePicker;

export default function DashboardPage() {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const { isConnected } = useSSE();

  const [timeframe, setTimeframe] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Custom'>('Daily');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [metricView, setMetricView] = useState<'requests' | 'estimatedCost'>('requests');

  // Compute params for usage API query
  const usageQueryParams = React.useMemo(() => {
    if (timeframe === 'Daily') return { days: 1 };
    if (timeframe === 'Weekly') return { days: 7 };
    if (timeframe === 'Monthly') return { days: 30 };
    if (timeframe === 'Custom' && dateRange && dateRange[0] && dateRange[1]) {
      return {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      };
    }
    return { days: 30 };
  }, [timeframe, dateRange]);

  // Disable dates beyond 30 days or in the future
  const disabledDate = (current: Dayjs) => {
    if (!current) return false;
    if (current > dayjs().endOf('day')) return true;
    if (current < dayjs().subtract(30, 'days').startOf('day')) return true;
    return false;
  };

  // React Query calls
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: apiGetSettings,
  });

  // Currency & Exchange Rate configuration
  const defaultCurrency = React.useMemo(() => {
    const item = settingsData?.value?.find((s: ApiSetting) => s.key === 'default_currency');
    return item?.value || 'IDR';
  }, [settingsData]);

  const usdToIdrRate = React.useMemo(() => {
    const item = settingsData?.value?.find((s: ApiSetting) => s.key === 'usd_to_idr_rate');
    return Number(item?.value) || 16000;
  }, [settingsData]);

  const formatCost = React.useCallback((usdAmount: number) => {
    if (defaultCurrency === 'USD') return `$${usdAmount.toFixed(4)}`;
    if (defaultCurrency === 'EUR') return `€${(usdAmount * 0.92).toFixed(4)}`;
    if (defaultCurrency === 'SGD') return `S$${(usdAmount * 1.35).toFixed(4)}`;
    // Default IDR
    const idrVal = Math.round(usdAmount * usdToIdrRate);
    return `Rp ${idrVal.toLocaleString('id-ID')}`;
  }, [defaultCurrency, usdToIdrRate]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: apiGetDashboardStats,
  });

  const { data: usageData = [], isLoading: usageLoading } = useQuery({
    queryKey: ['dashboard-usage', usageQueryParams],
    queryFn: () => apiGetDashboardUsage(usageQueryParams),
  });

  const { data: healthData = [], isLoading: healthLoading } = useQuery({
    queryKey: ['dashboard-health'],
    queryFn: apiGetDashboardHealth,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['recent-logs'],
    queryFn: () => apiGetLogs({ limit: 5 }),
  });

  // Calculate per-model totals for summary legend tags
  const modelTotals: Record<string, number> = {};
  const modelCosts: Record<string, number> = {};
  usageData.forEach((item) => {
    const m = item.model || 'default';
    modelTotals[m] = (modelTotals[m] || 0) + (item.requests || 0);
    modelCosts[m] = (modelCosts[m] || 0) + (item.estimatedCost || 0);
  });

  // Ant Design Charts Config
  const chartData = usageData.map((item) => ({
    date: item.date,
    model: item.model || 'default',
    requests: item.requests,
    estimatedCost: item.estimatedCost || 0,
  }));

  // Find peak point for persistent detail callout
  const peakPoint = chartData.length > 0
    ? chartData.reduce((max, p) => (
        metricView === 'requests'
          ? (p.requests > (max?.requests || 0) ? p : max)
          : (p.estimatedCost > (max?.estimatedCost || 0) ? p : max)
      ), chartData[0])
    : null;

  const chartConfig = {
    data: chartData,
    xField: 'date',
    yField: metricView,
    seriesField: 'model',
    colorField: 'model',
    smooth: true,
    height: 280,
    autoFit: true,
    point: {
      size: 5,
      shape: 'diamond',
    },
    label: {
      position: 'top',
      style: {
        fontSize: 11,
        fontWeight: 'bold' as const,
        fill: isDark ? '#ffffff' : '#141414',
      },
      formatter: (val: any) => {
        if (metricView === 'requests') {
          const count = typeof val === 'object' && val !== null ? val.requests : val;
          if (count !== undefined && count !== null && count !== '') {
            return `${count} reqs`;
          }
        } else {
          const cost = typeof val === 'object' && val !== null ? val.estimatedCost : val;
          if (cost !== undefined && cost !== null && cost !== '') {
            return formatCost(Number(cost));
          }
        }
        return '';
      },
    },
    tooltip: {
      showMarkers: true,
    },
    legend: {
      position: 'top-left' as const,
    },
    theme: isDark ? 'dark' : 'light',
  };

  const activityColumns = React.useMemo(() => [
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
      title: 'Credential Used',
      dataIndex: 'credentialName',
      key: 'credentialName',
      render: (name: string) => (
        <Text strong style={{ fontSize: 13 }}>
          {name || '-'}
        </Text>
      ),
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
      title: 'Est. Cost',
      key: 'estimatedCost',
      render: (_: any, record: ApiRequestLog) => (
        <Tag color="gold" style={{ margin: 0, fontWeight: 'bold' }}>
          {formatCost(record.estimatedCost || 0)}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'statusCode',
      key: 'statusCode',
      render: (code: number) => <StatusTag status={code} />,
    },
  ], [formatCost]);

  return (
    <div>
      <PageHeader
        title="Dashboard Overview"
        description="Real-time metrics, model usage analytics, provider health, and live gateway activity"
      />

      {/* Top KPI Cards */}
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
              title={`Est. API Expenses (${defaultCurrency})`}
              value={formatCost(stats?.totalEstimatedCost || 0)}
              prefix={<DollarOutlined style={{ color: '#faad14' }} />}
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
        </Row>
      </Spin>

      {/* Analytics Chart & Health Grid */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space size="middle">
                <Space>
                  <LineChartOutlined style={{ color: '#1677ff' }} />
                  <span>Analytics & Volume</span>
                </Space>
                <Segmented
                  size="small"
                  options={[
                    { label: 'Traffic (Reqs)', value: 'requests' },
                    { label: `Expenses (${defaultCurrency})`, value: 'estimatedCost' },
                  ]}
                  value={metricView}
                  onChange={(val) => setMetricView(val as any)}
                />
              </Space>
            }
            extra={
              <Space>
                <Segmented
                  options={['Daily', 'Weekly', 'Monthly', 'Custom']}
                  value={timeframe}
                  onChange={(val) => setTimeframe(val as any)}
                />
                {timeframe === 'Custom' && (
                  <RangePicker
                    size="small"
                    style={{ width: 230 }}
                    disabledDate={disabledDate}
                    value={dateRange as any}
                    onChange={(dates) => setDateRange(dates as any)}
                  />
                )}
              </Space>
            }
            size="small"
            variant="borderless"
            style={{ borderRadius: 8 }}
          >
            <Spin spinning={usageLoading}>
              <div style={{ paddingTop: 12 }}>
                {Object.keys(modelTotals).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <Space wrap size={[6, 6]}>
                      <Text type="secondary" style={{ fontSize: 12, marginRight: 4 }}>Models Breakdown:</Text>
                      {Object.entries(modelTotals).map(([mName, reqCount], i) => (
                        <Tag
                          key={mName}
                          color={['blue', 'purple', 'cyan', 'magenta', 'green', 'orange', 'gold'][i % 7]}
                          style={{ borderRadius: 12, padding: '2px 10px', fontSize: 12, margin: 0 }}
                        >
                          <Text strong style={{ color: 'inherit' }}>{mName}</Text>: {
                            metricView === 'requests'
                              ? `${reqCount.toLocaleString()} reqs`
                              : formatCost(modelCosts[mName] || 0)
                          }
                        </Tag>
                      ))}
                      {peakPoint && peakPoint.requests > 0 && (
                        <Tag
                          color="red"
                          style={{ borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 'bold', margin: 0 }}
                        >
                          🔥 Peak: {
                            metricView === 'requests'
                              ? `${peakPoint.requests} reqs (${peakPoint.model} on ${peakPoint.date})`
                              : `${formatCost(peakPoint.estimatedCost)} (${peakPoint.model} on ${peakPoint.date})`
                          }
                        </Tag>
                      )}
                    </Space>
                  </div>
                )}
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
          <Space>
            <ThunderboltOutlined style={{ color: '#fa8c16' }} />
            <span>Live Gateway Activity Feed</span>
          </Space>
        }
        extra={
          <Link href="/logs">
            <Button type="link" size="small" icon={<ArrowRightOutlined />}>
              View All Logs
            </Button>
          </Link>
        }
        size="small"
        variant="borderless"
        style={{ borderRadius: 8 }}
      >
        <Table
          dataSource={logsData?.data || []}
          columns={activityColumns}
          loading={logsLoading}
          pagination={false}
          rowKey="id"
          size="small"
        />
      </Card>
    </div>
  );
}
