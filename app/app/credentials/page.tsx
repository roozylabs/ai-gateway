'use client';

import React, { useState, useEffect } from 'react';
import { Typography, Space, Button, Modal, Form, Input, InputNumber, Select, Tag, Table, Alert, App } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ExperimentOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, EyeOutlined, EyeInvisibleOutlined, GoogleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, PageHeader, StatusTag, ConfirmButton } from '@/components/atoms';
import {
  apiGetProviders,
  apiGetCredentials,
  apiCreateCredential,
  apiUpdateCredential,
  apiDeleteCredential,
  apiTestCredential,
  apiRevealCredential,
  ApiProvider,
  ApiCredential,
  ApiTestCredentialResult,
} from '@/lib/api';

const { Text } = Typography;

export interface CombinedCredential extends ApiCredential {
  providerName?: string;
}

function CooldownCountdownTag({ initialTtl, status, onExpire }: { initialTtl: number; status: string; onExpire?: () => void }) {
  const [seconds, setSeconds] = useState(initialTtl);

  useEffect(() => {
    setSeconds(initialTtl);
  }, [initialTtl]);

  useEffect(() => {
    if (seconds <= 0) return;
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds, onExpire]);

  if (seconds > 0) {
    return (
      <Tag color="warning" icon={<ClockCircleOutlined />}>
        Cooldown ({seconds}s)
      </Tag>
    );
  }

  return <StatusTag status={status || 'active'} />;
}

export default function CredentialsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  // 'all' represents all providers
  const [selectedProviderId, setSelectedProviderId] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalTargetProviderId, setModalTargetProviderId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addAuthType, setAddAuthType] = useState<'api_key' | 'gcp_user_oauth'>('api_key');
  const [editAuthType, setEditAuthType] = useState<'api_key' | 'gcp_user_oauth'>('api_key');
  const [editingCredential, setEditingCredential] = useState<CombinedCredential | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testModalResult, setTestModalResult] = useState<{
    credName: string;
    res: ApiTestCredentialResult;
  } | null>(null);
  const [revealedNames, setRevealedNames] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const toggleReveal = async (record: CombinedCredential) => {
    if (revealedNames[record.id]) {
      setRevealedNames((prev) => {
        const next = { ...prev };
        delete next[record.id];
        return next;
      });
    } else {
      setRevealingId(record.id);
      try {
        const res = await apiRevealCredential(record.providerId, record.id);
        setRevealedNames((prev) => ({ ...prev, [record.id]: res.name }));
      } catch (err: any) {
        message.error(err.response?.data?.error || 'Failed to reveal credential info');
      } finally {
        setRevealingId(null);
      }
    }
  };

  const [form] = Form.useForm();

  // Fetch Providers list
  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });

  // Fetch Credentials (All or by specific Provider)
  const {
    data: credentialsData,
    isLoading: credentialsLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['credentials', selectedProviderId, page, pageSize, searchQuery],
    queryFn: () => apiGetCredentials(selectedProviderId, { page, limit: pageSize, search: searchQuery || undefined }),
    staleTime: 5000,
    refetchInterval: 5000,
  });

  const credentials = credentialsData?.data || [];

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

  const [editForm] = Form.useForm();

  const updateMutation = useMutation({
    mutationFn: ({ providerId, credId, data }: { providerId: string; credId: string; data: Partial<ApiCredential> & { apiKey?: string } }) =>
      apiUpdateCredential(providerId, credId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      message.success('Credential updated successfully');
      setEditingCredential(null);
      editForm.resetFields();
    },
    onError: (err: Error) => message.error(err.message),
  });

  const handleEditOpen = (record: CombinedCredential) => {
    setEditingCredential(record);
    editForm.setFieldsValue({
      name: record.name,
      priority: record.priority || 1,
      status: record.status || 'active',
      apiKey: '',
    });
  };

  const handleEditSubmit = (values: any) => {
    if (!editingCredential) return;
    updateMutation.mutate({
      providerId: editingCredential.providerId,
      credId: editingCredential.id,
      data: {
        name: values.name,
        priority: values.priority,
        status: values.status,
        ...(values.apiKey ? { apiKey: values.apiKey } : {}),
      },
    });
  };

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

  const activeModalProvider = providers.find((p: ApiProvider) => p.id === (modalTargetProviderId || form.getFieldValue('providerId')));
  const isGoogleProvider = activeModalProvider
    ? activeModalProvider.type === 'google' ||
      (activeModalProvider.slug || '').includes('google') ||
      (activeModalProvider.slug || '').includes('gemini') ||
      (activeModalProvider.name || '').toLowerCase().includes('google') ||
      (activeModalProvider.name || '').toLowerCase().includes('gemini')
    : false;

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'google_oauth_success') {
        message.success(`Google Account connected: ${event.data.email || 'Success'}`);
        queryClient.invalidateQueries({ queryKey: ['credentials'] });
        setIsModalOpen(false);
      } else if (event.data && event.data.type === 'google_oauth_error') {
        message.error(event.data.error || 'Failed to connect Google Account');
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [queryClient, message]);

  const handleGoogleConnect = () => {
    const provId = modalTargetProviderId || form.getFieldValue('providerId');
    if (!provId) {
      message.error('Please select a target provider first');
      return;
    }
    const width = 550;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      `/api/auth/google/login?provider_id=${provId}`,
      'GoogleOAuthPopup',
      `width=${width},height=${height},top=${top},left=${left}`
    );
  };

  const openAddModal = () => {
    const initialProvId = selectedProviderId !== 'all' ? selectedProviderId : providers[0]?.id || '';
    setModalTargetProviderId(initialProvId);
    const provCreds = credentials.filter((c) => c.providerId === initialProvId);
    const nextPriority = provCreds.length > 0 ? Math.max(...provCreds.map((c) => c.priority)) + 1 : 1;
    form.resetFields();
    setAddAuthType('api_key');
    form.setFieldsValue({
      providerId: initialProvId,
      authType: 'api_key',
      priority: nextPriority,
    });
    setIsModalOpen(true);
  };

  const handleTargetProviderChange = (provId: string) => {
    setModalTargetProviderId(provId);
    const prov = providers.find((p: ApiProvider) => p.id === provId);
    const isGoogle = prov
      ? prov.type === 'google' ||
        (prov.slug || '').includes('google') ||
        (prov.slug || '').includes('gemini') ||
        (prov.name || '').toLowerCase().includes('google') ||
        (prov.name || '').toLowerCase().includes('gemini')
      : false;

    if (!isGoogle) {
      setAddAuthType('api_key');
      form.setFieldsValue({ authType: 'api_key' });
    }

    const provCreds = credentials.filter((c) => c.providerId === provId);
    const nextPriority = provCreds.length > 0 ? Math.max(...provCreds.map((c) => c.priority)) + 1 : 1;
    form.setFieldsValue({ priority: nextPriority });
    form.validateFields(['priority']);
  };

  const handleAddCredential = (values: any) => {
    createMutation.mutate({
      providerId: values.providerId,
      data: {
        name: values.name,
        authType: values.authType || 'api_key',
        apiKey: values.apiKey,
        metadata: values.metadata,
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
        render: (text: string, record: CombinedCredential) => {
          const isRevealed = !!revealedNames[record.id];
          const displayName = isRevealed ? revealedNames[record.id] : text;
          const isRedacted = text.includes('***') || isRevealed;

          return (
            <Space align="center" size="small">
              <Text strong>{displayName}</Text>
              {isRedacted && (
                <Button
                  type="text"
                  size="small"
                  icon={isRevealed ? <EyeInvisibleOutlined style={{ color: '#ff4d4f' }} /> : <EyeOutlined style={{ color: '#1890ff' }} />}
                  loading={revealingId === record.id}
                  onClick={() => toggleReveal(record)}
                  title={isRevealed ? 'Hide credential info' : 'Reveal unmasked info'}
                />
              )}
            </Space>
          );
        },
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
        title: 'Auth Type',
        dataIndex: 'authType',
        key: 'authType',
        render: (authType: string) => {
          if (authType === 'gcp_user_oauth') {
            return <Tag color="purple">🔐 GCP OAuth</Tag>;
          }
          return <Tag color="default">🔑 API Key</Tag>;
        },
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
        render: (status: string, record: CombinedCredential) => (
          <CooldownCountdownTag
            initialTtl={record.cooldownTtl || 0}
            status={status || 'active'}
            onExpire={() => refetch()}
          />
        ),
      },
      {
        title: 'Requests Served',
        dataIndex: 'requestCount',
        key: 'requestCount',
        defaultSortOrder: 'descend' as const,
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
              icon={<EditOutlined />}
              onClick={() => handleEditOpen(record)}
            >
              Edit
            </Button>
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
    [testingId, deleteMutation, revealedNames, revealingId]
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
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            Add Credential
          </Button>
        }
      />

      <DataTable
        dataSource={credentialsData?.data || []}
        columns={columns}
        loading={credentialsLoading || providersLoading}
        rowKey="id"
        searchPlaceholder="Search credential label, provider, or key prefix..."
        searchValue={searchQuery}
        onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
        extraActions={extraActions}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: credentialsData?.total || 0,
          onChange: (p, ps) => {
            setPage(p);
            if (ps && ps !== pageSize) {
              setPageSize(ps);
            }
          },
        }}
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
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="providerId"
            label="Target Provider"
            rules={[{ required: true, message: 'Please select provider' }]}
          >
            <Select placeholder="Select Provider" onChange={handleTargetProviderChange}>
              {providers.map((p: ApiProvider) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="authType"
            label="Authentication Type"
            initialValue="api_key"
            tooltip="Select API Key for standard provider key or GCP User OAuth for free-tier Google Gemini OAuth account."
          >
            <Select
              value={addAuthType}
              onChange={(val) => setAddAuthType(val)}
              options={[
                { label: 'API Key (Standard)', value: 'api_key' },
                {
                  label: isGoogleProvider
                    ? 'GCP User OAuth (Gemini Account)'
                    : 'GCP User OAuth (Google Provider Only)',
                  value: 'gcp_user_oauth',
                  disabled: !isGoogleProvider,
                },
              ]}
            />
          </Form.Item>

          {addAuthType === 'gcp_user_oauth' ? (
            <div style={{ background: '#1f1f1f', padding: '24px 20px', borderRadius: 8, textAlign: 'center', margin: '20px 0', border: '1px solid #303030' }}>
              <GoogleOutlined style={{ fontSize: 40, color: '#4285F4', marginBottom: 12 }} />
              <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                Connect Google Account
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 20 }}>
                Sign in with your Google / Gmail account to grant Gemini API access.
              </Typography.Paragraph>
              <Button
                type="primary"
                size="large"
                icon={<GoogleOutlined />}
                onClick={handleGoogleConnect}
                style={{ background: '#4285F4', borderColor: '#4285F4', fontWeight: 600, paddingLeft: 24, paddingRight: 24 }}
              >
                Sign in with Google
              </Button>
            </div>
          ) : (
            <>
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
            </>
          )}

          <Form.Item
            name="priority"
            label="Rotation Priority (1 = Highest)"
            tooltip="Priority number for this credential. Smaller numbers are rotated first. Must be unique for the selected provider."
            rules={[
              { required: true, message: 'Please enter priority' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const activeProvId = modalTargetProviderId || form.getFieldValue('providerId');
                  const usedPriorities = credentials
                    .filter((c) => c.providerId === activeProvId)
                    .map((c) => c.priority);
                  if (usedPriorities.includes(value)) {
                    return Promise.reject(
                      new Error(`Priority ${value} is already assigned to another key for this provider. Suggested next priority: ${Math.max(0, ...usedPriorities) + 1}`)
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
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
            {testModalResult.res.success ? (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined style={{ fontSize: 24 }} />}
                message="Connection Test Passed"
                description={`Successfully authenticated and reached upstream provider endpoint in ${testModalResult.res.latencyMs}ms.`}
                style={{ marginBottom: 20 }}
              />
            ) : (
              <Alert
                type="error"
                showIcon
                icon={<CloseCircleOutlined style={{ fontSize: 24 }} />}
                message="Connection Test Failed"
                description={testModalResult.res.error || 'Failed to authenticate with upstream provider API.'}
                style={{ marginBottom: 20 }}
              />
            )}

            <Typography.Title level={5} style={{ marginBottom: 12 }}>
              Diagnostic Details
            </Typography.Title>

            <Table
              bordered
              pagination={false}
              size="small"
              dataSource={[
                {
                  key: 'status',
                  metric: 'Status',
                  value: testModalResult.res.success ? (
                    <Tag color="success">SUCCESS</Tag>
                  ) : (
                    <Tag color="error">FAILED</Tag>
                  ),
                },
                {
                  key: 'httpStatus',
                  metric: 'HTTP Status Code',
                  value: testModalResult.res.httpStatus || '-',
                },
                {
                  key: 'latency',
                  metric: 'Upstream Latency',
                  value: `${testModalResult.res.latencyMs} ms`,
                },
                ...(testModalResult.res.error
                  ? [
                      {
                        key: 'error',
                        metric: 'Error Message',
                        value: (
                          <Text type="danger" code style={{ wordBreak: 'break-word' }}>
                            {testModalResult.res.error}
                          </Text>
                        ),
                      },
                    ]
                  : []),
              ]}
              columns={[
                { title: '', dataIndex: 'metric', key: 'metric', width: '40%' },
                { title: '', dataIndex: 'value', key: 'value' },
              ]}
              showHeader={false}
            />
          </div>
        )}
      </Modal>

      {/* Edit Credential Modal */}
      <Modal
        title="Edit Credential"
        open={!!editingCredential}
        onCancel={() => {
          setEditingCredential(null);
          editForm.resetFields();
        }}
        footer={null}
      >
        {editingCredential && (
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleEditSubmit}
            style={{ marginTop: 16 }}
          >
            <Form.Item
              name="name"
              label="Credential Name"
              rules={[{ required: true, message: 'Please enter credential name' }]}
            >
              <Input placeholder="e.g. Production Key #1" />
            </Form.Item>

            <Form.Item
              name="apiKey"
              label="API Key"
              tooltip="Leave empty if you do not wish to change the existing API key."
            >
              <Input.Password placeholder="Leave empty to keep existing key" />
            </Form.Item>

            <Form.Item
              name="priority"
              label="Rotation Priority"
              tooltip="Lower number means higher priority in credential allocation."
              rules={[{ required: true, message: 'Please enter priority' }]}
            >
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="status" label="Status">
              <Select
                options={[
                  { label: 'Active', value: 'active' },
                  { label: 'Disabled', value: 'disabled' },
                ]}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setEditingCredential(null)}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                  Save Changes
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
