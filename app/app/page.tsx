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
} from 'antd';
import {
  ThunderboltOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LineChartOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import { useTheme } from '@/context/ThemeContext';
import { MOCK_PROVIDERS, MOCK_LOGS } from '@/lib/mock-data';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Mock data per model for Daily view (hours of the day)
const DAILY_DATA = [
  { time: '00:00', model: 'GPT-4o', value: 120 },
  { time: '04:00', model: 'GPT-4o', value: 90 },
  { time: '08:00', model: 'GPT-4o', value: 450 },
  { time: '12:00', model: 'GPT-4o', value: 890 },
  { time: '16:00', model: 'GPT-4o', value: 1100 },
  { time: '20:00', model: 'GPT-4o', value: 750 },
  { time: '23:59', model: 'GPT-4o', value: 420 },

  { time: '00:00', model: 'Claude Sonnet 4', value: 80 },
  { time: '04:00', model: 'Claude Sonnet 4', value: 50 },
  { time: '08:00', model: 'Claude Sonnet 4', value: 320 },
  { time: '12:00', model: 'Claude Sonnet 4', value: 640 },
  { time: '16:00', model: 'Claude Sonnet 4', value: 810 },
  { time: '20:00', model: 'Claude Sonnet 4', value: 590 },
  { time: '23:59', model: 'Claude Sonnet 4', value: 310 },

  { time: '00:00', model: 'Gemini 1.5 Pro', value: 60 },
  { time: '04:00', model: 'Gemini 1.5 Pro', value: 40 },
  { time: '08:00', model: 'Gemini 1.5 Pro', value: 210 },
  { time: '12:00', model: 'Gemini 1.5 Pro', value: 480 },
  { time: '16:00', model: 'Gemini 1.5 Pro', value: 520 },
  { time: '20:00', model: 'Gemini 1.5 Pro', value: 390 },
  { time: '23:59', model: 'Gemini 1.5 Pro', value: 200 },
];

// Mock data for Weekly view (days of the week)
const WEEKLY_DATA = [
  { time: 'Mon', model: 'GPT-4o', value: 3200 },
  { time: 'Tue', model: 'GPT-4o', value: 4100 },
  { time: 'Wed', model: 'GPT-4o', value: 4800 },
  { time: 'Thu', model: 'GPT-4o', value: 5200 },
  { time: 'Fri', model: 'GPT-4o', value: 4900 },
  { time: 'Sat', model: 'GPT-4o', value: 2800 },
  { time: 'Sun', model: 'GPT-4o', value: 2100 },

  { time: 'Mon', model: 'Claude Sonnet 4', value: 2100 },
  { time: 'Tue', model: 'Claude Sonnet 4', value: 2900 },
  { time: 'Wed', model: 'Claude Sonnet 4', value: 3400 },
  { time: 'Thu', model: 'Claude Sonnet 4', value: 3800 },
  { time: 'Fri', model: 'Claude Sonnet 4', value: 3500 },
  { time: 'Sat', model: 'Claude Sonnet 4', value: 1800 },
  { time: 'Sun', model: 'Claude Sonnet 4', value: 1400 },

  { time: 'Mon', model: 'Gemini 1.5 Pro', value: 1500 },
  { time: 'Tue', model: 'Gemini 1.5 Pro', value: 2100 },
  { time: 'Wed', model: 'Gemini 1.5 Pro', value: 2500 },
  { time: 'Thu', model: 'Gemini 1.5 Pro', value: 2900 },
  { time: 'Fri', model: 'Gemini 1.5 Pro', value: 2600 },
  { time: 'Sat', model: 'Gemini 1.5 Pro', value: 1200 },
  { time: 'Sun', model: 'Gemini 1.5 Pro', value: 900 },
];

// Mock data for Custom Range
const CUSTOM_RANGE_DATA = [
  { time: 'Day 1', model: 'GPT-4o', value: 2800 },
  { time: 'Day 2', model: 'GPT-4o', value: 3500 },
  { time: 'Day 3', model: 'GPT-4o', value: 4200 },
  { time: 'Day 4', model: 'GPT-4o', value: 4900 },
  { time: 'Day 5', model: 'GPT-4o', value: 4600 },
  { time: 'Day 6', model: 'GPT-4o', value: 3100 },
  { time: 'Day 7', model: 'GPT-4o', value: 2400 },

  { time: 'Day 1', model: 'Claude Sonnet 4', value: 1900 },
  { time: 'Day 2', model: 'Claude Sonnet 4', value: 2400 },
  { time: 'Day 3', model: 'Claude Sonnet 4', value: 3100 },
  { time: 'Day 4', model: 'Claude Sonnet 4', value: 3500 },
  { time: 'Day 5', model: 'Claude Sonnet 4', value: 3300 },
  { time: 'Day 6', model: 'Claude Sonnet 4', value: 2100 },
  { time: 'Day 7', model: 'Claude Sonnet 4', value: 1600 },

  { time: 'Day 1', model: 'Gemini 1.5 Pro', value: 1300 },
  { time: 'Day 2', model: 'Gemini 1.5 Pro', value: 1700 },
  { time: 'Day 3', model: 'Gemini 1.5 Pro', value: 2200 },
  { time: 'Day 4', model: 'Gemini 1.5 Pro', value: 2600 },
  { time: 'Day 5', model: 'Gemini 1.5 Pro', value: 2400 },
  { time: 'Day 6', model: 'Gemini 1.5 Pro', value: 1400 },
  { time: 'Day 7', model: 'Gemini 1.5 Pro', value: 1100 },
];

export default function DashboardPage() {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const [timeframe, setTimeframe] = useState<'Daily' | 'Weekly' | 'Custom'>('Daily');

  const rawData =
    timeframe === 'Daily' ? DAILY_DATA : timeframe === 'Weekly' ? WEEKLY_DATA : CUSTOM_RANGE_DATA;

  // Configuration for @ant-design/plots Line chart
  const lineConfig = {
    data: rawData,
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
      dataIndex: 'requestId',
      key: 'requestId',
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
    },
    {
      title: 'Gateway Key',
      dataIndex: 'gatewayKeyName',
      key: 'gatewayKeyName',
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Credential Used',
      dataIndex: 'credentialName',
      key: 'credentialName',
    },
    {
      title: 'Latency',
      dataIndex: 'latencyMs',
      key: 'latencyMs',
      render: (val: number) => `${val} ms`,
    },
    {
      title: 'Tokens (In/Out)',
      key: 'tokens',
      render: (_: any, record: any) => `${record.inputTokens} / ${record.outputTokens}`,
    },
    {
      title: 'Status',
      dataIndex: 'statusCode',
      key: 'statusCode',
      render: (code: number) => {
        if (code === 200) return <Tag color="success">200 OK</Tag>;
        if (code === 429) return <Tag color="warning">429 Rate Limit</Tag>;
        return <Tag color="error">{code}</Tag>;
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
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" variant="borderless" style={{ boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Statistic
              title="Total Requests"
              value={12482}
              prefix={<ThunderboltOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" variant="borderless" style={{ boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Statistic
              title="Total Tokens Processed"
              value={8421902}
              precision={0}
              suffix="Tokens"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" variant="borderless" style={{ boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Statistic
              title="Average Latency"
              value={480}
              suffix="ms"
              prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" variant="borderless" style={{ boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Statistic
              title="Estimated Monthly Cost"
              value={34.18}
              precision={2}
              prefix={<DollarOutlined style={{ color: '#faad14' }} />}
              suffix="USD"
            />
          </Card>
        </Col>
      </Row>

      {/* Model Usage Overview Line Chart Card using @ant-design/plots */}
      <Card
        variant="borderless"
        style={{
          marginBottom: 24,
          borderRadius: 12,
          boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.06)',
          background: isDark ? '#141414' : '#ffffff',
        }}
      >
        {/* Controls Bar: Title and Timeframe Selector */}
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
                Token throughput comparison per model over time (in Thousands of Tokens)
              </Text>
            </div>
          </div>

          <Space size="middle" wrap>
            {/* Timeframe Selector (Daily / Weekly / Custom Range) */}
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

            {/* DateRange Picker when Custom is selected */}
            {timeframe === 'Custom' && (
              <RangePicker
                size="middle"
                style={{ borderRadius: 8 }}
                placeholder={['Start Date', 'End Date']}
              />
            )}
          </Space>
        </div>

        {/* Ant Design Plots Line Component */}
        <div style={{ width: '100%' }}>
          <Line {...lineConfig} />
        </div>
      </Card>

      {/* Provider Health Status */}
      <Title level={4} style={{ marginBottom: 16 }}>
        Provider Health Status
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {MOCK_PROVIDERS.map((prov) => (
          <Col xs={24} sm={12} lg={6} key={prov.id}>
            <Card size="small" style={{ borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong style={{ fontSize: 15 }}>
                    {prov.name}
                  </Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {prov.credentialsCount} Credentials Pool
                    </Text>
                  </div>
                </div>
                {prov.health === 'healthy' && <Tag icon={<CheckCircleOutlined />} color="success">Healthy</Tag>}
                {prov.health === 'degraded' && <Tag icon={<ExclamationCircleOutlined />} color="warning">Degraded</Tag>}
                {prov.health === 'down' && <Tag color="error">Down</Tag>}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Recent Gateway Activity Table */}
      <Title level={4} style={{ marginBottom: 16 }}>
        Recent Gateway Activity
      </Title>

      <Card size="small" variant="borderless" style={{ borderRadius: 8 }}>
        <Table
          dataSource={MOCK_LOGS}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
}
