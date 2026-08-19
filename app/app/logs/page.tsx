'use client';

import React, { useState } from 'react';
import { Tag, Typography, Select, Space, Drawer, Descriptions, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { DataTable, PageHeader, StatusTag } from '@/components/atoms';
import { apiGetLogs, apiGetProviders, ApiRequestLog, ApiProvider } from '@/lib/api';

const { Text } = Typography;

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
  const { data: logsData, isLoading, refetch, isRefetching } = useQuery({
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
      sorter: true,
      render: (id: string) => <Text code>{id ? id.substring(0, 8) : '-'}</Text>,
    },
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a: ApiRequestLog, b: ApiRequestLog) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
      render: (val: string) => (val ? new Date(val).toLocaleString() : '-'),
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      sorter: true,
      render: (m: string) => <Tag color="blue">{m || 'default'}</Tag>,
    },
    {
      title: 'Latency',
      dataIndex: 'latencyMs',
      key: 'latencyMs',
      sorter: true,
      render: (val: number) => `${val || 0} ms`,
    },
    {
      title: 'Tokens (In / Out)',
      key: 'tokens',
      sorter: (a: ApiRequestLog, b: ApiRequestLog) => (a.totalTokens || 0) - (b.totalTokens || 0),
      render: (_: any, record: ApiRequestLog) => `${record.inputTokens} / ${record.outputTokens}`,
    },
    {
      title: 'Status Code',
      dataIndex: 'statusCode',
      key: 'statusCode',
      sorter: true,
      render: (code: number) => <StatusTag status={code} />,
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

  const extraActions = (
    <Space>
      <Text strong style={{ fontSize: 13 }}>Provider Filter:</Text>
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
    </Space>
  );

  return (
    <div>
      <PageHeader
        title="Request Logs & Observability"
        description="Audit trail of API requests, token consumption, latencies, and failover retries"
      />

      <DataTable
        dataSource={logsData?.value || []}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        searchPlaceholder="Search model or error..."
        searchValue={searchQuery}
        onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
        extraActions={extraActions}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: logsData?.count || 0,
          onChange: (p) => setPage(p),
        }}
      />

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
              <StatusTag status={selectedLog.statusCode} />
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
