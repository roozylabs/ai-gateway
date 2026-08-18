'use client';

import React, { useState } from 'react';
import { Table, Tag, Typography, Card, Radio, Space, Button, App } from 'antd';
import { AppstoreOutlined, ArrowRightOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { MOCK_MODELS, ModelRoute } from '@/lib/mock-data';

const { Title, Text } = Typography;

export default function ModelsPage() {
  const { message } = App.useApp();
  const [strategy, setStrategy] = useState<string>('round-robin');
  const [models] = useState<ModelRoute[]>(MOCK_MODELS);

  const handleStrategyChange = (e: any) => {
    setStrategy(e.target.value);
    message.success(`Routing Strategy updated to ${e.target.value.toUpperCase()}`);
  };

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
          Models & Routing Strategy
        </Title>
        <Text type="secondary">Map client request model aliases to upstream AI Provider models</Text>
      </div>

      <Card size="small" style={{ marginBottom: 24, borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Text strong style={{ display: 'block' }}>
              Credential Allocation Strategy:
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Determines how active provider credentials are selected for incoming API requests.
            </Text>
          </div>

          <Radio.Group value={strategy} onChange={handleStrategyChange} optionType="button" buttonStyle="solid">
            <Radio.Button value="round-robin">Round Robin (Equal)</Radio.Button>
            <Radio.Button value="lru">Least Recently Used (LRU)</Radio.Button>
            <Radio.Button value="fallback">Fallback Cascade</Radio.Button>
          </Radio.Group>
        </div>
      </Card>

      <Card size="small" variant="borderless" style={{ borderRadius: 8 }}>
        <Table dataSource={models} columns={columns} rowKey="id" pagination={false} />
      </Card>
    </div>
  );
}
