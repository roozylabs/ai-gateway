'use client';

import React, { useState } from 'react';
import { Table, Tag, Typography, Card, Space, App } from 'antd';
import { ArrowRightOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { MOCK_MODELS, ModelRoute } from '@/lib/mock-data';

const { Title, Text } = Typography;

export default function ModelsPage() {
  const [models] = useState<ModelRoute[]>(MOCK_MODELS);

  const columns = [
    {
      title: 'Model Alias / Shortcut',
      dataIndex: 'alias',
      key: 'alias',
      render: (text: string) => <Text code strong>{text}</Text>,
    },
    {
      title: 'Target Provider',
      dataIndex: 'targetProvider',
      key: 'targetProvider',
      render: (provider: string) => <Tag color="blue">{provider}</Tag>,
    },
    {
      title: 'Upstream Model ID',
      dataIndex: 'targetModel',
      key: 'targetModel',
      render: (model: string) => <Text style={{ fontFamily: 'monospace' }}>{model}</Text>,
    },
    {
      title: 'Fallback Provider',
      dataIndex: 'fallbackProvider',
      key: 'fallbackProvider',
      render: (fb?: string) => fb ? <Tag color="orange"><ArrowRightOutlined /> {fb}</Tag> : <Text type="secondary">None</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color="success" icon={<CheckCircleOutlined />}>{status}</Tag>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          Models & Routing
        </Title>
        <Text type="secondary">Map client request model aliases to upstream AI Provider models</Text>
      </div>

      <Card size="small" variant="borderless" style={{ borderRadius: 8 }}>
        <Table dataSource={models} columns={columns} rowKey="id" pagination={false} />
      </Card>
    </div>
  );
}
