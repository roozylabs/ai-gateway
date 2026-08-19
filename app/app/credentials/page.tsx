'use client';

import React, { useState } from 'react';
import { Button, Tag, Space, Typography, Modal, Form, Input, Select, InputNumber, Alert, Descriptions, App } from 'antd';
import { PlusOutlined, ExperimentOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSSE } from '@/hooks/useSSE';
import { DataTable, PageHeader, StatusTag, ConfirmButton } from '@/components/atoms';
import {
  apiGetProviders,
  apiGetCredentials,
  apiCreateCredential,
  apiDeleteCredential,
  apiTestCredential,
  ApiProvider,
  ApiCredential,
  ApiTestCredentialResult,
} from '@/lib/api';

const { Text } = Typography;

export interface CombinedCredential extends ApiCredential {
  providerName?: string;
}

export default function CredentialsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { isConnected } = useSSE();

  // 'all' represents all providers
  const [selectedProviderId, setSelectedProviderId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testModalResult, setTestModalResult] = useState<{
    credName: string;
    res: ApiTestCredentialResult;
  } | null>(null);

  const [form] = Form.useForm();

  // Fetch Providers list
  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });

  // Fetch Credentials (All or by specific Provider)
  const {
    data: credentials = [],
    isLoading: credentialsLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['credentials', selectedProviderId, providers.map((p) => p.id).join(',')],
    queryFn: async () => {
      if (!providers || providers.length === 0) return [];

      if (selectedProviderId === 'all') {
        const results = await Promise.all(
          providers.map(async (provider) => {
            try {
              const list = await apiGetCredentials(provider.id);
              return list.map((cred) => ({
                ...cred,
                providerId: provider.id,
                providerName: provider.name,
              }));
            } catch {
              return [];
            }
          })
        );
        return results.flat();
      } else {
        const targetProvider = providers.find((p) => p.id === selectedProviderId);
        const list = await apiGetCredentials(selectedProviderId);
        return list.map((cred) => ({
          ...cred,
          providerId: selectedProviderId,
          providerName: targetProvider?.name || 'Unknown',
        }));
      }
    },
    enabled: providers.length > 0,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: Partial<ApiCredential> & { apiKey: string } }) =>
      apiCreateCredential(providerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      message.success('Credential added to pool');
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (err: Error) => message.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ providerId, credId }: { providerId: string; credId: string }) =>
      apiDeleteCredential(providerId, credId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      message.success('Credential deleted');
    },
    onError: (err: Error) => message.error(err.message),
  });

  const handleTestConnection = async (providerId: string, credId: string, name: string) => {
    setTestingId(credId);
    message.loading({ content: `Testing connection for ${name}...`, key: credId });

    try {
      const res = await apiTestCredential(providerId, credId);
      message.destroy(credId);
      setTestModalResult({ credName: name, res });
    } catch (err: any) {
      message.destroy(credId);
      const errRes: ApiTestCredentialResult = {
        success: false,
        latencyMs: err.response?.data?.latencyMs || 0,
        httpStatus: err.response?.data?.httpStatus || err.response?.status || 500,
        error: err.response?.data?.error || err.message || 'Connection test failed',
      };
      setTestModalResult({ credName: name, res: errRes });
    } finally {
      setTestingId(null);
    }
  };

  const handleAddCredential = (values: any) => {
    createMutation.mutate({
      providerId: values.providerId,
      data: {
        name: values.name,
        apiKey: values.apiKey,
        priority: values.priority || 1,
        enabled: true,
      },
    });
  };

  const columns = React.useMemo(
    () => [
      {
        title: 'Credential Name',
        dataIndex: 'name',
        key: 'name',
        sorter: (a: CombinedCredential, b: CombinedCredential) => a.name.localeCompare(b.name),
        render: (text: string) => <Text strong>{text}</Text>,
      },
      {
        title: 'Provider',
        dataIndex: 'providerName',
        key: 'providerName',
        sorter: (a: CombinedCredential, b: CombinedCredential) =>
          (a.providerName || '').localeCompare(b.providerName || ''),
        render: (name: string) => <Tag color="blue">{name || 'Provider'}</Tag>,
      },
      {
        title: 'Masked Key Prefix',
        dataIndex: 'keyPrefix',
        key: 'keyPrefix',
        sorter: true,
        render: (prefix: string, record: CombinedCredential) => (
          <Text code>{record.maskedKey || prefix || 'sk-••••'}</Text>
        ),
      },
      {
        title: 'Priority',
        dataIndex: 'priority',
        key: 'priority',
        sorter: (a: CombinedCredential, b: CombinedCredential) => a.priority - b.priority,
        render: (p: number) => <Tag color="geekblue">Priority {p}</Tag>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        sorter: true,
        render: (status: string) => <StatusTag status={status || 'active'} />,
      },
      {
        title: 'Requests Served',
        dataIndex: 'requestCount',
        key: 'requestCount',
        sorter: (a: CombinedCredential, b: CombinedCredential) => (a.requestCount || 0) - (b.requestCount || 0),
        render: (count: number) => (count || 0).toLocaleString(),
      },
      {
        title: 'Last Used',
        dataIndex: 'lastUsedAt',
        key: 'lastUsedAt',
        sorter: (a: CombinedCredential, b: CombinedCredential) =>
          new Date(a.lastUsedAt || 0).getTime() - new Date(b.lastUsedAt || 0).getTime(),
        render: (val: string) => (val ? new Date(val).toLocaleString() : 'Never'),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: any, record: CombinedCredential) => (
          <Space size="middle">
            <Button
              type="link"
              icon={<ExperimentOutlined />}
              loading={testingId === record.id}
              onClick={() => handleTestConnection(record.providerId, record.id, record.name)}
            >
              Test
            </Button>
            <ConfirmButton
              confirmTitle="Delete Credential?"
              onConfirm={() => deleteMutation.mutate({ providerId: record.providerId, credId: record.id })}
              icon={<DeleteOutlined />}
            >
              Delete
            </ConfirmButton>
          </Space>
        ),
      },
    ],
    [testingId, deleteMutation]
  );

  const extraActions = (
    <Space>
      <Select
        placeholder="Filter by Provider"
        style={{ width: 220 }}
        value={selectedProviderId}
        onChange={(val) => setSelectedProviderId(val)}
        loading={providersLoading}
        options={[
          { label: 'All Providers', value: 'all' },
          ...providers.map((p: ApiProvider) => ({
            label: p.name,
            value: p.id,
          })),
        ]}
      />
    </Space>
  );

  return (
    <div>
      <PageHeader
        title="Credentials Pool"
        description="API Key pools, rotation priority, and rate-limit cooldown states"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Add Credential
          </Button>
        }
      />

      <DataTable
        dataSource={credentials}
        columns={columns}
        loading={credentialsLoading || providersLoading}
        rowKey="id"
        searchPlaceholder="Search credential label, provider, or key prefix..."
        searchFields={['name', 'keyPrefix', 'providerName']}
        extraActions={extraActions}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
      />

      {/* Add Credential Modal */}
      <Modal
        title="Add Provider Credential"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddCredential}
          initialValues={{
            providerId: selectedProviderId !== 'all' ? selectedProviderId : providers[0]?.id,
            priority: 1,
          }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="providerId"
            label="Target Provider"
            rules={[{ required: true, message: 'Please select provider' }]}
          >
            <Select placeholder="Select Provider">
              {providers.map((p: ApiProvider) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="Credential Label"
            rules={[{ required: true, message: 'Please enter credential label' }]}
          >
            <Input placeholder="e.g. Gemini Production Key #1" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="Provider API Secret Key"
            rules={[{ required: true, message: 'Please enter API Key' }]}
          >
            <Input.Password placeholder="AIzaSy... / AQ.Ab8..." />
          </Form.Item>

          <Form.Item name="priority" label="Rotation Priority (1 = Highest)">
            <InputNumber min={1} max={10} style={{ width: '10%' }} />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Save & Encrypt Key
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Test Connection Result Modal */}
      <Modal
        title={`Connection Test Result: ${testModalResult?.credName || ''}`}
        open={!!testModalResult}
        onCancel={() => setTestModalResult(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setTestModalResult(null)}>
            Close
          </Button>,
        ]}
      >
        {testModalResult && (
          <div style={{ marginTop: 16 }}>
            <Alert
              type={testModalResult.res.success ? 'success' : 'error'}
              showIcon
              icon={testModalResult.res.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              message={
                testModalResult.res.success
                  ? 'Connection Test Passed'
                  : `Connection Test Failed (HTTP ${testModalResult.res.httpStatus || 401})`
              }
              description={
                testModalResult.res.success
                  ? `Successfully authenticated and reached upstream provider endpoint in ${testModalResult.res.latencyMs}ms.`
                  : testModalResult.res.error || 'Authentication failed. Please verify that your API secret key is valid and active.'
              }
              style={{ marginBottom: 20 }}
            />

            <Descriptions title="Diagnostic Details" bordered column={1} size="small">
              <Descriptions.Item label="Status">
                <Tag color={testModalResult.res.success ? 'success' : 'error'}>
                  {testModalResult.res.success ? 'SUCCESS' : 'FAILED'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="HTTP Status Code">
                <Text code>{testModalResult.res.httpStatus || 401}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Upstream Latency">
                <Text code>{testModalResult.res.latencyMs} ms</Text>
              </Descriptions.Item>
              {testModalResult.res.error && (
                <Descriptions.Item label="Error Message">
                  <Text type="danger" code style={{ wordBreak: 'break-all' }}>
                    {testModalResult.res.error}
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}
