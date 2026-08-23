'use client';

import React, { useState } from 'react';
import { Tag, Typography, Select, Space, Drawer, Descriptions, Button, Card, Row, Col, Segmented, Table } from 'antd';
import { EyeOutlined, DownloadOutlined, ThunderboltOutlined, BranchesOutlined, AreaChartOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useSSE } from '@/hooks/useSSE';
import { DataTable, PageHeader, StatusTag } from '@/components/atoms';
import {
  apiGetLogs,
  apiGetProviders,
  apiGetSettings,
  apiGetRoutingDecisions,
  apiGetLogAnalytics,
  ApiRequestLog,
  ApiSetting,
  ApiRoutingDecision,
  ApiClientAppStat,
  ApiModelStat,
} from '@/lib/api';

const { Text, Title, Paragraph } = Typography;

export default function LogsPage() {
  const { isConnected } = useSSE();
  const [activeTab, setActiveTab] = useState<'logs' | 'routing' | 'analytics'>('logs');
  const [selectedLog, setSelectedLog] = useState<ApiRequestLog | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<ApiRoutingDecision | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeRangeDays, setTimeRangeDays] = useState<number>(30);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    const idrVal = Math.round(usdAmount * usdToIdrRate);
    return `Rp ${idrVal.toLocaleString('id-ID')}`;
  }, [defaultCurrency, usdToIdrRate]);

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });

  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs, isRefetching: isRefetchingLogs } = useQuery({
    queryKey: ['logs', selectedProvider, searchQuery, page, pageSize],
    queryFn: () =>
      apiGetLogs({
        provider: selectedProvider || undefined,
        search: searchQuery || undefined,
        limit: pageSize,
        page: page,
      }),
    enabled: activeTab === 'logs',
  });

  const { data: decisionsData, isLoading: decisionsLoading, refetch: refetchDecisions, isRefetching: isRefetchingDecisions } = useQuery({
    queryKey: ['routing-decisions', page, pageSize],
    queryFn: () => apiGetRoutingDecisions({ page, limit: pageSize }),
    enabled: activeTab === 'routing',
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics-logs', timeRangeDays],
    queryFn: () => apiGetLogAnalytics({ days: timeRangeDays }),
  });

  const handleExportCSV = React.useCallback(() => {
    const logs = logsData?.data || [];
    if (logs.length === 0) return;

    const headers = ['Request ID', 'Timestamp', 'Client App', 'Client IP', 'Model', 'Status Code', 'Latency (ms)', 'TTFT (ms)', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Cost (USD)'];
    const rows = logs.map((log: any) => [
      `"${log.id || ''}"`,
      `"${log.createdAt ? new Date(log.createdAt).toISOString() : ''}"`,
      `"${log.clientApp || 'API Client'}"`,
      `"${log.clientIp || ''}"`,
      `"${log.model || ''}"`,
      log.statusCode || 200,
      log.latencyMs || 0,
      log.ttftMs || 0,
      log.inputTokens || 0,
      log.outputTokens || 0,
      log.totalTokens || 0,
      (log.costUsd || 0).toFixed(6),
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ai_gateway_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [logsData]);

  const columnsLogs = React.useMemo(() => [
    { title: 'Request ID', dataIndex: 'id', key: 'id', render: (id: string) => <Text code>{id ? id.substring(0, 8) : '-'}</Text> },
    { title: 'Timestamp', dataIndex: 'createdAt', key: 'createdAt', render: (val: string) => (val ? new Date(val).toLocaleString() : '-') },
    { title: 'Model', dataIndex: 'model', key: 'model', render: (val: string) => <Tag color="cyan">{val || 'default'}</Tag> },
    { title: 'Status', dataIndex: 'statusCode', key: 'statusCode', render: (code: number) => <StatusTag status={code} /> },
    {
      title: 'TTFT / Latency',
      key: 'latencyMs',
      render: (_: any, record: ApiRequestLog) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{record.latencyMs} ms</Text>
          {record.ttftMs ? <Text type="secondary" style={{ fontSize: 11 }}><ThunderboltOutlined style={{ color: '#faad14' }} /> {record.ttftMs}ms TTFT</Text> : null}
        </Space>
      ),
    },
    { title: 'Tokens', key: 'tokens', render: (_: any, record: ApiRequestLog) => <Text style={{ fontSize: 12 }}>{record.inputTokens} / {record.outputTokens}</Text> },
    { title: 'Cost', dataIndex: 'costUsd', key: 'costUsd', render: (costUsd: number) => <Text code style={{ color: '#52c41a' }}>{formatCost(costUsd || 0)}</Text> },
    { title: 'Action', key: 'action', render: (_: any, record: ApiRequestLog) => <Button type="text" icon={<EyeOutlined />} onClick={() => setSelectedLog(record)}>Details</Button> },
  ], [formatCost]);

  const safeStr = React.useCallback((v: any): string => {
    if (!v) return '';
    if (typeof v === 'object') return v.String || '';
    return String(v);
  }, []);

  const columnsRouting = React.useMemo(() => [
    { title: 'Request ID', dataIndex: 'requestId', key: 'requestId', render: (id: string) => <Text code>{id ? id.substring(0, 8) : '-'}</Text> },
    { title: 'Timestamp', dataIndex: 'createdAt', key: 'createdAt', render: (val: string) => (val ? new Date(val).toLocaleString() : '-') },
    { title: 'Task Classifier', dataIndex: 'taskType', key: 'taskType', render: (task: string) => <Tag color="purple">{safeStr(task) || 'general'}</Tag> },
    { title: 'Complexity', dataIndex: 'complexity', key: 'complexity', render: (comp: string) => {
        let color = 'blue';
        if (comp === 'complex') color = 'volcano';
        if (comp === 'simple') color = 'green';
        return <Tag color={color}>{safeStr(comp) || 'standard'}</Tag>;
      }
    },
    { title: 'Active Policy', dataIndex: 'policyName', key: 'policyName', render: (pol: string) => <Tag color="geekblue">{safeStr(pol) || 'balanced'}</Tag> },
    { title: 'Winning Model', dataIndex: 'selectedModel', key: 'selectedModel', render: (model: string, record: ApiRoutingDecision) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1677ff' }}>{safeStr(model)}</Text>
          {record.downgradeReason && <Text type="warning" style={{ fontSize: 11 }}>{safeStr(record.downgradeReason)}</Text>}
        </Space>
      )
    },
    { title: 'Budget Status', dataIndex: 'budgetStatus', key: 'budgetStatus', render: (st: string) => {
        let color = 'success';
        if (st === 'warning') color = 'warning';
        if (st === 'critical' || st === 'exceeded') color = 'error';
        return <Tag color={color}>{(safeStr(st) || 'healthy').toUpperCase()}</Tag>;
      }
    },
    { title: 'Cost USD', dataIndex: 'actualCost', key: 'actualCost', render: (cost: number) => <Text code style={{ color: '#52c41a' }}>{formatCost(cost || 0)}</Text> },
    { title: 'Action', key: 'action', render: (_: any, record: ApiRoutingDecision) => <Button type="text" icon={<EyeOutlined />} onClick={() => setSelectedDecision(record)}>Details</Button> },
  ], [formatCost, safeStr]);

  const extraActions = (
    <Space wrap>
      {activeTab === 'logs' && (
        <Select
          style={{ width: 180 }}
          placeholder="All Providers"
          allowClear
          value={selectedProvider || undefined}
          onChange={(val) => { setSelectedProvider(val || ''); setPage(1); }}
          options={[{ label: 'All Providers', value: '' }, ...providers.map((p) => ({ label: p.name, value: p.id }))]}
        />
      )}
      <Button icon={<DownloadOutlined />} onClick={handleExportCSV} disabled={!logsData?.data || logsData.data.length === 0}>Export CSV</Button>
    </Space>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader title="Logs & Observability" description="Real-time audit trail, Smart Router decisions, and token spend analytics" />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Space direction="vertical" size={2}>
              <Text type="secondary" style={{ fontSize: 12 }}>Total Spend ({timeRangeDays}d)</Text>
              <Title level={4} style={{ margin: 0, color: '#52c41a' }}>{formatCost(analyticsData?.totalSpendUsd || 0)}</Title>
              <Text type="secondary" style={{ fontSize: 11 }}>From {analyticsData?.clientApps?.length || 0} active client apps</Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Space direction="vertical" size={2}>
              <Text type="secondary" style={{ fontSize: 12 }}>Smart Router Savings</Text>
              <Title level={4} style={{ margin: 0, color: '#1677ff' }}>{formatCost(analyticsData?.estimatedSavingsUsd || 0)}</Title>
              <Text type="secondary" style={{ fontSize: 11 }}>Saved vs flagship model baseline</Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Space direction="vertical" size={2}>
              <Text type="secondary" style={{ fontSize: 12 }}>Avg TTFT (Streaming)</Text>
              <Title level={4} style={{ margin: 0, color: '#faad14' }}>{Math.round(analyticsData?.avgTtftMs || 0)} ms</Title>
              <Text type="secondary" style={{ fontSize: 11 }}>Time to First Token latency</Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Space direction="vertical" size={2}>
              <Text type="secondary" style={{ fontSize: 12 }}>Avg Total Latency</Text>
              <Title level={4} style={{ margin: 0, color: '#722ed1' }}>{Math.round(analyticsData?.avgLatencyMs || 0)} ms</Title>
              <Text type="secondary" style={{ fontSize: 11 }}>End-to-end request duration</Text>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card bodyStyle={{ padding: 16 }} style={{ marginBottom: 16, borderRadius: 8 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Segmented
              options={[
                { label: 'Request Audit Logs', value: 'logs', icon: <BranchesOutlined /> },
                { label: 'Smart Router Decisions', value: 'routing', icon: <ThunderboltOutlined /> },
                { label: 'Client & Model Analytics', value: 'analytics', icon: <AreaChartOutlined /> },
              ]}
              value={activeTab}
              onChange={(val) => { setActiveTab(val as any); setPage(1); }}
            />
          </Col>
          <Col>
            <Space wrap>
              <Text type="secondary">Window:</Text>
              <Select
                value={timeRangeDays}
                onChange={(val) => setTimeRangeDays(val)}
                options={[{ label: 'Last 24 Hours', value: 1 }, { label: 'Last 7 Days', value: 7 }, { label: 'Last 30 Days', value: 30 }]}
                style={{ width: 150 }}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {activeTab === 'logs' ? (
        <DataTable<ApiRequestLog>
          dataSource={logsData?.data || []}
          columns={columnsLogs}
          loading={logsLoading}
          rowKey="id"
          searchPlaceholder="Search model or error..."
          searchValue={searchQuery}
          onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
          extraActions={extraActions}
          onRefresh={() => refetchLogs()}
          refreshing={isRefetchingLogs}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: logsData?.total || 0,
            onChange: (p, ps) => { setPage(p); if (ps && ps !== pageSize) setPageSize(ps); },
          }}
        />
      ) : activeTab === 'routing' ? (
        <DataTable<ApiRoutingDecision>
          dataSource={decisionsData?.data || []}
          columns={columnsRouting}
          loading={decisionsLoading}
          rowKey="id"
          extraActions={extraActions}
          onRefresh={() => refetchDecisions()}
          refreshing={isRefetchingDecisions}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: decisionsData?.total || 0,
            onChange: (p, ps) => { setPage(p); if (ps && ps !== pageSize) setPageSize(ps); },
          }}
        />
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Client App Spend & Volume Breakdown" loading={analyticsLoading} style={{ borderRadius: 8 }}>
              <Table<ApiClientAppStat>
                dataSource={analyticsData?.clientApps || []}
                rowKey="clientApp"
                pagination={false}
                size="small"
                columns={[
                  { title: 'Client Application', dataIndex: 'clientApp', key: 'clientApp', render: (app: string) => <Text strong>{app}</Text> },
                  { title: 'Requests', dataIndex: 'requests', key: 'requests', render: (req: number) => req.toLocaleString() },
                  { title: 'Tokens', dataIndex: 'tokens', key: 'tokens', render: (tok: number) => tok.toLocaleString() },
                  { title: 'Cost', dataIndex: 'costUsd', key: 'costUsd', render: (cost: number) => <Text code style={{ color: '#52c41a' }}>{formatCost(cost)}</Text> },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Model Performance & SLA Breakdown" loading={analyticsLoading} style={{ borderRadius: 8 }}>
              <Table<ApiModelStat>
                dataSource={analyticsData?.models || []}
                rowKey="model"
                pagination={false}
                size="small"
                columns={[
                  { title: 'Model Slug', dataIndex: 'model', key: 'model', render: (m: string) => <Tag color="blue">{m}</Tag> },
                  { title: 'Requests', dataIndex: 'requests', key: 'requests', render: (req: number) => req.toLocaleString() },
                  { title: 'Avg TTFT', dataIndex: 'avgTtftMs', key: 'avgTtftMs', render: (ttft: number) => `${Math.round(ttft)} ms` },
                  { title: 'Avg Latency', dataIndex: 'avgLatencyMs', key: 'avgLatencyMs', render: (lat: number) => `${Math.round(lat)} ms` },
                  { title: 'Cost', dataIndex: 'costUsd', key: 'costUsd', render: (cost: number) => <Text code style={{ color: '#52c41a' }}>{formatCost(cost)}</Text> },
                ]}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Drawer
        title="Request Log Inspector"
        placement="right"
        width={540}
        onClose={() => setSelectedLog(null)}
        open={!!selectedLog}
      >
        {selectedLog && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Client Application">{selectedLog.clientApp || 'API Client'}</Descriptions.Item>
            <Descriptions.Item label="Request ID"><Text code>{selectedLog.id}</Text></Descriptions.Item>
            <Descriptions.Item label="Timestamp">{new Date(selectedLog.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Model"><Tag color="blue">{selectedLog.model}</Tag></Descriptions.Item>
            <Descriptions.Item label="Status Code"><StatusTag status={selectedLog.statusCode} /></Descriptions.Item>
            <Descriptions.Item label="Total Latency">{selectedLog.latencyMs} ms</Descriptions.Item>
            <Descriptions.Item label="Tokens">{selectedLog.inputTokens} / {selectedLog.outputTokens}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Drawer
        title="Smart Router Decision Details"
        placement="right"
        width={580}
        onClose={() => setSelectedDecision(null)}
        open={!!selectedDecision}
      >
        {selectedDecision && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {selectedDecision.promptPreview && (
              <Card size="small" title="Request Prompt Preview" style={{ borderRadius: 8 }}>
                <Paragraph copyable style={{ margin: 0, fontFamily: 'monospace', fontSize: 12 }}>
                  {selectedDecision.promptPreview}
                </Paragraph>
              </Card>
            )}

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Request ID"><Text code>{selectedDecision.requestId || selectedDecision.id}</Text></Descriptions.Item>
              <Descriptions.Item label="Timestamp">{selectedDecision.createdAt ? new Date(selectedDecision.createdAt).toLocaleString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="Task Classifier"><Tag color="purple">{safeStr(selectedDecision.taskType) || 'general'}</Tag></Descriptions.Item>
              <Descriptions.Item label="Complexity"><Tag color="blue">{safeStr(selectedDecision.complexity) || 'standard'}</Tag></Descriptions.Item>
              <Descriptions.Item label="Active Policy"><Tag color="geekblue">{safeStr(selectedDecision.policyName) || 'balanced'}</Tag></Descriptions.Item>
              <Descriptions.Item label="Winning Model"><Text strong style={{ color: '#1677ff' }}>{safeStr(selectedDecision.selectedModel)}</Text></Descriptions.Item>
              <Descriptions.Item label="Winning Provider"><Tag color="cyan">{safeStr(selectedDecision.selectedProvider)}</Tag></Descriptions.Item>
              <Descriptions.Item label="Budget Status"><Tag color={selectedDecision.budgetStatus === 'healthy' ? 'success' : 'warning'}>{(safeStr(selectedDecision.budgetStatus) || 'healthy').toUpperCase()}</Tag></Descriptions.Item>
              {selectedDecision.downgradeReason && (
                <Descriptions.Item label="Downgrade Reason">
                  <Tag color="volcano">{safeStr(selectedDecision.downgradeReason)}</Tag>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                    Model score penalized to protect monthly budget or prioritize cost efficiency.
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedDecision.scoresBreakdown && Object.keys(selectedDecision.scoresBreakdown).length > 0 && (
              <Card size="small" title="Candidate Models Scoring Breakdown" style={{ borderRadius: 8 }}>
                <Table
                  dataSource={Object.entries(selectedDecision.scoresBreakdown).map(([slug, info]: [string, any]) => ({
                    key: slug,
                    slug,
                    score: typeof info === 'object' ? info.score : info,
                    reason: typeof info === 'object' && Array.isArray(info.reason) ? info.reason.join(', ') : '-',
                  }))}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Candidate Model', dataIndex: 'slug', key: 'slug', render: (m: string) => <Tag color={m === selectedDecision.selectedModel ? 'blue' : 'default'}>{m}</Tag> },
                    { title: 'Score', dataIndex: 'score', key: 'score', render: (s: number) => <Text strong style={{ color: typeof s === 'number' && s > 0.7 ? '#52c41a' : '#faad14' }}>{typeof s === 'number' ? s.toFixed(3) : s}</Text> },
                    { title: 'Notes / Penalties', dataIndex: 'reason', key: 'reason', render: (r: string) => <Text type="secondary" style={{ fontSize: 11 }}>{r}</Text> },
                  ]}
                />
              </Card>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
}
