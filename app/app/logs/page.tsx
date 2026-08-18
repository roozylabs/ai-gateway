'use client';

import React, { useState } from 'react';
import { Table, Tag, Typography, Card, Select, Input, Space, Drawer, Descriptions, Button } from 'antd';
import { SearchOutlined, EyeOutlined, SyncOutlined } from '@ant-design/icons';
import { MOCK_LOGS, RequestLog } from '@/lib/mock-data';

const { Title, Text } = Typography;

export default function LogsPage() {
  const [logs, setLogs] = useState<RequestLog[]>(MOCK_LOGS);
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');

  const handleFilterProvider = (val: string) => {
    setSelectedProvider(val);
    if (val === 'ALL') {
      setLogs(MOCK_LOGS);
    } else {
      setLogs(MOCK_LOGS.filter((l) => l.provider === val));
    }
  };

  const columns = [
    {
      title: 'Request ID',
      dataIndex: 'requestId',
      key: 'requestId',
      render: (id: string) => <Text code>{id}</Text>,
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
      render: (m: string) => <Tag color="blue">{m}</Tag>,
    },
    {
      title: 'Provider / Credential',
      key: 'providerCred',
      render: (_: any, record: RequestLog) => (
        <div>
          <Text strong style={{ fontSize: 13, display: 'block' }}>{record.provider}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.credentialName}</Text>
        </div>
      ),
    },
    {
      title: 'Latency',
      dataIndex: 'latencyMs',
      key: 'latencyMs',
      render: (val: number) => `${val} ms`,
    },
    {
      title: 'Tokens (In / Out)',
      key: 'tokens',
      render: (_: any, record: RequestLog) => `${record.inputTokens} / ${record.outputTokens}`,
    },
    {
      title: 'Status Code',
      dataIndex: 'statusCode',
      key: 'statusCode',
      render: (code: number, record: RequestLog) => {
        if (code === 200) return <Tag color="success">200 OK</Tag>;
        if (code === 429) return <Tag color="warning">429 Rate Limit (Retry {record.retryCount})</Tag>;
        return <Tag color="error">{code}</Tag>;
      },
    },
    {
      title: 'Details',
      key: 'details',
      render: (_: any, record: RequestLog) => (
        <Button type="text" icon={<EyeOutlined />} onClick={() => setSelectedLog(record)}>
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          Request Logs & Observability
        </Title>
        <Text type="secondary">Audit trail of API requests, token consumption, latencies, and failover retries</Text>
      </div>

      <Card size="small" style={{ marginBottom: 20, borderRadius: 8 }}>
        <Space size="middle">
          <Text strong>Filter Provider:</Text>
          <Select defaultValue="ALL" style={{ width: 160 }} onChange={handleFilterProvider}>
            <Select.Option value="ALL">All Providers</Select.Option>
            <Select.Option value="Anthropic">Anthropic</Select.Option>
            <Select.Option value="OpenAI">OpenAI</Select.Option>
            <Select.Option value="Google">Google</Select.Option>
          </Select>

          <Input prefix={<SearchOutlined />} placeholder="Search Request ID..." style={{ width: 220 }} />
        </Space>
      </Card>

      <Card size="small" variant="borderless" style={{ borderRadius: 8 }}>
        <Table dataSource={logs} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <Drawer
        title="Request Details"
        placement="right"
        width={480}
        onClose={() => setSelectedLog(null)}
        open={!!selectedLog}
      >
        {selectedLog && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Request ID"><Text code>{selectedLog.requestId}</Text></Descriptions.Item>
            <Descriptions.Item label="Timestamp">{selectedLog.timestamp}</Descriptions.Item>
            <Descriptions.Item label="Gateway Key">{selectedLog.gatewayKeyName}</Descriptions.Item>
            <Descriptions.Item label="Provider">{selectedLog.provider}</Descriptions.Item>
            <Descriptions.Item label="Target Model">{selectedLog.model}</Descriptions.Item>
            <Descriptions.Item label="Credential ID">{selectedLog.credentialName}</Descriptions.Item>
            <Descriptions.Item label="Status Code">
              {selectedLog.statusCode === 200 ? <Tag color="success">200 OK</Tag> : <Tag color="warning">{selectedLog.statusCode}</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Latency">{selectedLog.latencyMs} ms</Descriptions.Item>
            <Descriptions.Item label="Input Tokens">{selectedLog.inputTokens}</Descriptions.Item>
            <Descriptions.Item label="Output Tokens">{selectedLog.outputTokens}</Descriptions.Item>
            <Descriptions.Item label="Retry Attempts">{selectedLog.retryCount}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
