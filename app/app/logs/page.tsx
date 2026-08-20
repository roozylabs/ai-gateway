'use client';

import React, { useState } from 'react';
import { Tag, Typography, Select, Space, Drawer, Descriptions, Button, Switch, Badge } from 'antd';
import { EyeOutlined, SyncOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useSSE } from '@/hooks/useSSE';
import { DataTable, PageHeader, StatusTag } from '@/components/atoms';
import { apiGetLogs, apiGetProviders, apiGetSettings, ApiRequestLog, ApiProvider, ApiSetting } from '@/lib/api';

const { Text } = Typography;

export default function LogsPage() {
  const { isConnected } = useSSE();
  const [selectedLog, setSelectedLog] = useState<ApiRequestLog | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLiveStream, setIsLiveStream] = useState<boolean>(true);

  // Fetch Settings for Currency configuration
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: apiGetSettings,
  });

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

  // Fetch Providers list for filter dropdown
  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });

  // Fetch Request Logs
  const { data: logsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['logs', selectedProvider, searchQuery, page, pageSize],
    queryFn: () =>
      apiGetLogs({
        provider: selectedProvider || undefined,
        search: searchQuery || undefined,
        limit: pageSize,
        page: page,
      }),
    refetchInterval: isLiveStream ? 3000 : false,
  });

  const columns = React.useMemo(() => [
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
      title: 'Credential Used',
      dataIndex: 'credentialName',
      key: 'credentialName',
      render: (c: string) => (
        <Text strong style={{ fontSize: 13 }}>
          {c || '—'}
        </Text>
      ),
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
      title: 'Est. Cost',
      key: 'estimatedCost',
      sorter: (a: ApiRequestLog, b: ApiRequestLog) => (a.estimatedCost || 0) - (b.estimatedCost || 0),
      render: (_: any, record: ApiRequestLog) => (
        <Tag color="gold" style={{ margin: 0, fontWeight: 'bold' }}>
          {formatCost(record.estimatedCost || 0)}
        </Tag>
      ),
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
  ], [formatCost]);

  const extraActions = (
    <Space wrap>
      <Tag color={isConnected && isLiveStream ? 'processing' : 'default'} icon={isConnected && isLiveStream ? <SyncOutlined spin /> : null}>
        <Badge status={isConnected && isLiveStream ? 'success' : 'default'} text={isLiveStream ? 'Live tail -f Stream' : 'Live Stream Paused'} />
      </Tag>

      <Space>
        <Text strong style={{ fontSize: 13 }}>Live Mode:</Text>
        <Switch checked={isLiveStream} onChange={(val) => setIsLiveStream(val)} />
      </Space>

      <Text strong style={{ fontSize: 13, marginLeft: 8 }}>Provider:</Text>
      <Select
        defaultValue=""
        style={{ width: 160 }}
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
        title="Request Logs & Real-time Stream"
        description="Real-time audit trail of API requests, token consumption, latencies, and failover retries"
      />

      <DataTable
        dataSource={logsData?.data || []}
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
          total: logsData?.total || 0,
          onChange: (p, ps) => {
            setPage(p);
            if (ps && ps !== pageSize) {
              setPageSize(ps);
            }
          },
        }}
      />

      {/* Log Details Inspection Drawer */}
      <Drawer
        title="Request Log Inspector"
        placement="right"
        width={540}
        onClose={() => setSelectedLog(null)}
        open={!!selectedLog}
      >
        {selectedLog && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Request ID">
              <Text code>{selectedLog.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Timestamp">
              {new Date(selectedLog.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Gateway Key ID">
              <Text code>{selectedLog.gatewayApiKeyId || 'N/A'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Requested Model">
              <Tag color="blue">{selectedLog.model}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status Code">
              <StatusTag status={selectedLog.statusCode} />
            </Descriptions.Item>
            <Descriptions.Item label="Total Latency">
              {selectedLog.latencyMs} ms
            </Descriptions.Item>
            <Descriptions.Item label="Input / Output Tokens">
              {selectedLog.inputTokens} / {selectedLog.outputTokens} (Total: {selectedLog.totalTokens})
            </Descriptions.Item>
            <Descriptions.Item label="Retry Count">
              {selectedLog.retryCount || 0}
            </Descriptions.Item>
            {(() => {
              const errMsg = (selectedLog.errorMessage && typeof selectedLog.errorMessage === 'object') 
                ? ((selectedLog.errorMessage as any).Valid ? (selectedLog.errorMessage as any).String : '') 
                : selectedLog.errorMessage;
              if (!errMsg) return null;
              return (
                <Descriptions.Item label="Error Details">
                  <Text type="danger">{errMsg}</Text>
                </Descriptions.Item>
              );
            })()}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
