'use client';

import React, { useState } from 'react';
import { Table, Tag, Typography, Card, Select, Input, Space, Drawer, Descriptions, Button, Spin } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { apiGetLogs, apiGetProviders, ApiRequestLog, ApiProvider } from '@/lib/api';

const { Title, Text } = Typography;

export default function LogsPage() {
  const [selectedLog, setSelectedLog] = useState<ApiRequestLog | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Fetch Providers list for filter dropdown
  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });

  // Fetch Request Logs
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['logs', selectedProvider, searchQuery, page],
    queryFn: () =>
      apiGetLogs({
        provider: selectedProvider || undefined,
        search: searchQuery || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    refetchInterval: 10000,
  });

  const columns = [
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
      render: (val: string) => (val ? new Date(val).toLocaleString() : '-'),
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
      title: 'Tokens (In / Out)',
      key: 'tokens',
      render: (_: any, record: ApiRequestLog) => `${record.inputTokens} / ${record.outputTokens}`,
    },
    {
      title: 'Status Code',
      dataIndex: 'statusCode',
      key: 'statusCode',
      render: (code: number, record: ApiRequestLog) => {
        if (code >= 200 && code < 300) return <Tag color="success">{code} OK</Tag>;
        if (code === 429) return <Tag color="warning">429 Rate Limit (Retry {record.retryCount})</Tag>;
        return <Tag color="error">{code || 500}</Tag>;
      },
    },
    {
      title: 'Details',
      key: 'details',
      render: (_: any, record: ApiRequestLog) => (
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
        <Space size="middle" wrap>
          <Text strong>Filter Provider:</Text>
          <Select
            defaultValue=""
            style={{ width: 180 }}
            onChange={(val) => { setSelectedProvider(val); setPage(1); }}
          >
            <Select.Option value="">All Providers</Select.Option>
            {providers.map((p: ApiProvider) => (
              <Select.Option key={p.id} value={p.slug}>
                {p.name}
              </Select.Option>
            ))}
          </Select>

          <Input
            prefix={<SearchOutlined />}
            placeholder="Search model / error..."
            style={{ width: 240 }}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            allowClear
          />
        </Space>
      </Card>

      <Card size="small" variant="borderless" style={{ borderRadius: 8 }}>
        <Table
          dataSource={logsData?.value || []}
          columns={columns}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: pageSize,
            total: logsData?.count || 0,
            onChange: (p) => setPage(p),
          }}
        />
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
            <Descriptions.Item label="Request ID"><Text code>{selectedLog.id}</Text></Descriptions.Item>
            <Descriptions.Item label="Timestamp">{new Date(selectedLog.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Gateway Key ID">{selectedLog.gatewayApiKeyId || 'System / Direct'}</Descriptions.Item>
            <Descriptions.Item label="Provider ID">{selectedLog.providerId || '-'}</Descriptions.Item>
            <Descriptions.Item label="Target Model">{selectedLog.model}</Descriptions.Item>
            <Descriptions.Item label="Credential ID">{selectedLog.credentialId || '-'}</Descriptions.Item>
            <Descriptions.Item label="Status Code">
              {selectedLog.statusCode >= 200 && selectedLog.statusCode < 300 ? (
                <Tag color="success">{selectedLog.statusCode} OK</Tag>
              ) : (
                <Tag color="error">{selectedLog.statusCode}</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Latency">{selectedLog.latencyMs} ms</Descriptions.Item>
            <Descriptions.Item label="Input Tokens">{selectedLog.inputTokens}</Descriptions.Item>
            <Descriptions.Item label="Output Tokens">{selectedLog.outputTokens}</Descriptions.Item>
            <Descriptions.Item label="Total Tokens">{selectedLog.totalTokens}</Descriptions.Item>
            <Descriptions.Item label="Retry Attempts">{selectedLog.retryCount}</Descriptions.Item>
            {selectedLog.errorMessage && (
              <Descriptions.Item label="Error Message">
                <Text type="danger">{selectedLog.errorMessage}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
