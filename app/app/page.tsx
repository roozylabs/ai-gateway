'use client';

import React from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Space, Badge } from 'antd';
import {
  ThunderboltOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { MOCK_PROVIDERS, MOCK_LOGS } from '@/lib/mock-data';

const { Title, Text } = Typography;

export default function DashboardPage() {
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
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          Dashboard Overview
        </Title>
        <Text type="secondary">Real-time metrics, provider status, and live gateway activity</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <Statistic
              title="Total Requests"
              value={12482}
              prefix={<ThunderboltOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <Statistic
              title="Total Tokens Processed"
              value={8421902}
              precision={0}
              suffix="Tokens"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <Statistic
              title="Average Latency"
              value={480}
              suffix="ms"
              prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" variant="borderless" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
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
