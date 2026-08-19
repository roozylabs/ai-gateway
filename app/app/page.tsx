'use client';

import React, { useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Table,
  Tag,
  Space,
  Segmented,
  DatePicker,
  Spin,
} from 'antd';
import {
  ThunderboltOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LineChartOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import {
  apiGetDashboardStats,
  apiGetDashboardUsage,
  apiGetDashboardHealth,
  apiGetLogs,
  ApiRequestLog,
} from '@/lib/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function DashboardPage() {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const [timeframe, setTimeframe] = useState<'Daily' | 'Weekly' | 'Custom'>('Daily');

  // React Query calls
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: apiGetDashboardStats,
    refetchInterval: 10000,
  });

  const daysParam = timeframe === 'Daily' ? 1 : timeframe === 'Weekly' ? 7 : 30;
  const { data: usageData = [], isLoading: usageLoading } = useQuery({
    queryKey: ['dashboard-usage', daysParam],
    queryFn: () => apiGetDashboardUsage(daysParam),
  });

  const { data: healthData = [], isLoading: healthLoading } = useQuery({
    queryKey: ['dashboard-health'],
    queryFn: apiGetDashboardHealth,
    refetchInterval: 15000,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['recent-logs'],
    queryFn: () => apiGetLogs({ limit: 5 }),
    refetchInterval: 10000,
  });

  // Prepare chart data format for @ant-design/plots
  const chartData = usageData.length > 0
    ? usageData.map((pt) => ({
        time: pt.date,
        model: 'Total Requests',
        value: pt.requests,
      }))
    : [{ time: 'Today', model: 'Total Requests', value: 0 }];

  const lineConfig = {
    data: chartData,
    xField: 'time',
    yField: 'value',
    colorField: 'model',
    shapeField: 'smooth',
    scale: {
      color: {
        range: ['#1677ff', '#722ed1', '#fa8c16'],
      },
    },
    point: {
      shapeField: 'circle',
      sizeField: 4,
    },
    axis: {
      x: {
        grid: false,
      },
      y: {
        gridLineDash: [4, 4],
      },
    },
    theme: isDark ? 'dark' : 'light',
    height: 280,
    style: {
      lineWidth: 2.5,
    },
  };

  // Table columns for Recent Gateway Activity
  const columns = [
    {
      title: 'Request ID',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <Text code>{text ? text.substring(0, 8) : '-'}</Text>,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => (val ? new Date(val).toLocaleString() : '-'),
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      render: (text: string) => <Tag color="blue">{text || 'default'}</Tag>,
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
      render: (code: number) => {
        if (code >= 200 && code < 300) return <Tag color="success">{code} OK</Tag>;
        if (code === 429) return <Tag color="warning">429 Rate Limit</Tag>;
        return <Tag color="error">{code || 500}</Tag>;
      },
    },
  ];

  return (
    <div>
      {/* Header Title */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          Dashboard Overview
        </Title>
        <Text type="secondary">
          Real-time metrics, model usage analytics, provider health, and live gateway activity
        </Text>
      </div>

      {/* Top 4 KPI Cards */}
      <Spin spinning={statsLoading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" variant="borderless" style={{ boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Statistic
                title="Total Requests"
                value={stats?.totalRequests || 0}
                prefix={<ThunderboltOutlined style={{ color: '#1677ff' }} />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card size="small" variant="borderless" style={{ boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Statistic
                title="Total Tokens Processed"
                value={stats?.totalTokens || 0}
                precision={0}
                suffix="Tokens"
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card size="small" variant="borderless" style={{ boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Statistic
                title="Average Latency"
                value={Math.round(stats?.avgLatency || 0)}
                suffix="ms"
                prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card size="small" variant="borderless" style={{ boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Statistic
                title="Active Gateway Keys"
                value={stats?.activeKeys || 0}
                prefix={<KeyOutlined style={{ color: '#faad14' }} />}
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* Model Usage Overview Line Chart Card */}
      <Card
        variant="borderless"
        style={{
          marginBottom: 24,
          borderRadius: 12,
          boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.06)',
          background: isDark ? '#141414' : '#ffffff',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <Space align="center">
              <LineChartOutlined style={{ color: '#1677ff', fontSize: 20 }} />
              <Title level={4} style={{ margin: 0 }}>
                Overview Model Usage
              </Title>
            </Space>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Token and request throughput over time
              </Text>
            </div>
          </div>

          <Space size="middle" wrap>
            <Segmented
              value={timeframe}
              onChange={(val) => setTimeframe(val as any)}
              options={[
                { label: 'Daily', value: 'Daily' },
                { label: 'Weekly', value: 'Weekly' },
                { label: 'Custom Range', value: 'Custom' },
              ]}
              shape="round"
            />

            {timeframe === 'Custom' && (
              <RangePicker
                size="middle"
                style={{ borderRadius: 8 }}
                placeholder={['Start Date', 'End Date']}
              />
            )}
          </Space>
        </div>

        <Spin spinning={usageLoading}>
          <div style={{ width: '100%' }}>
            <Line {...lineConfig} />
          </div>
        </Spin>
      </Card>

      {/* Provider Health Status */}
      <Title level={4} style={{ marginBottom: 16 }}>
        Provider Health Status
      </Title>

      <Spin spinning={healthLoading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {healthData.length === 0 ? (
            <Col span={24}>
              <Text type="secondary">No active providers configured.</Text>
            </Col>
          ) : (
            healthData.map((prov, idx) => (
              <Col xs={24} sm={12} lg={6} key={idx}>
                <Card size="small" style={{ borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong style={{ fontSize: 15 }}>
                        {prov.name}
                      </Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {prov.credCount} Credentials Pool
                        </Text>
                      </div>
                    </div>
                    {prov.status === 'healthy' && <Tag icon={<CheckCircleOutlined />} color="success">Healthy</Tag>}
                    {prov.status === 'degraded' && <Tag icon={<ExclamationCircleOutlined />} color="warning">Degraded</Tag>}
                    {prov.status === 'down' && <Tag color="error">Down</Tag>}
                  </div>
                </Card>
              </Col>
            ))
          )}
        </Row>
      </Spin>

      {/* Recent Gateway Activity Table */}
      <Title level={4} style={{ marginBottom: 16 }}>
        Recent Gateway Activity
      </Title>

      <Card size="small" variant="borderless" style={{ borderRadius: 8 }}>
        <Table
          dataSource={logsData?.value || []}
          columns={columns}
          loading={logsLoading}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
}
