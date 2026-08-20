'use client';

import React, { useState, useEffect } from 'react';
import { Button, Space, Typography, Modal, Form, Input, Select, InputNumber, Alert, Tooltip, Tag, App, Tabs } from 'antd';
import { PlusOutlined, CopyOutlined, DeleteOutlined, InfoCircleOutlined, SyncOutlined, CodeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import { DataTable, PageHeader, StatusTag, ConfirmButton } from '@/components/atoms';
import {
  apiGetProviders,
  apiGetCredentials,
  apiGetGatewayKeys,
  apiCreateGatewayKey,
  apiDeleteGatewayKey,
  apiGetModels,
  ApiGatewayKey,
  ApiProvider,
  ApiModel,
} from '@/lib/api';

const { Text } = Typography;

export default function GatewayKeysPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [integrationKey, setIntegrationKey] = useState<ApiGatewayKey | null>(null);
  const [newGeneratedKey, setNewGeneratedKey] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Fetch Providers for dropdown
  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });

  // Fetch All Credentials to filter active provider keys
  const { data: allCredentialsData, isLoading: credentialsLoading } = useQuery({
    queryKey: ['credentials', 'all'],
    queryFn: () => apiGetCredentials('all', { limit: 200 }),
    staleTime: 5000,
  });

  const activeProviderIds = React.useMemo(() => {
    const creds = allCredentialsData?.data || [];
    const set = new Set<string>();
    creds.forEach((c) => {
      if (c.enabled && (c.status === 'active' || !c.status)) {
        set.add(c.providerId);
      }
    });
    return set;
  }, [allCredentialsData]);

  // Build provider lookup map
  const providerMap = React.useMemo(() => {
    const map: Record<string, ApiProvider> = {};
    providers.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [providers]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Gateway Keys
  const { data: keysData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['gateway-keys', page, pageSize, searchQuery],
    queryFn: () => apiGetGatewayKeys({ page, limit: pageSize, search: searchQuery || undefined }),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (values: { name: string; providerId: string; rateLimit?: number; expiresInDays?: number }) =>
      apiCreateGatewayKey(values),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['gateway-keys'] });
      message.success('Gateway API Key created!');
      const rawKey = res.key || res.rawKey || res.keyPrefix;
      setNewGeneratedKey(rawKey);
    },
    onError: (err: Error) => message.error(err.message),
  });

  // Revoke / Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: apiDeleteGatewayKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateway-keys'] });
      message.success('Gateway API Key revoked');
    },
    onError: (err: Error) => message.error(err.message),
  });

  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async (record: ApiGatewayKey) => {
    try {
      setIsRegenerating(true);
      
      let expiresInDays = 0;
      if (record.expiresAt) {
        const days = Math.ceil((new Date(record.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        expiresInDays = days > 0 ? days : 1;
      }

      // 1. Create new key
      const res = await apiCreateGatewayKey({
        name: record.name,
        providerId: record.providerId || '',
        rateLimit: 100, // default
        expiresInDays,
      });
      const rawRes = res as any;
      const newKey = rawRes.key || rawRes.rawKey || rawRes.keyPrefix;
      
      // 2. Revoke old key
      await apiDeleteGatewayKey(record.id);
      
      // 3. Update UI
      queryClient.invalidateQueries({ queryKey: ['gateway-keys'] });
      message.success('Gateway API Key regenerated successfully!');
      
      setNewGeneratedKey(newKey);
      setIsModalOpen(true);
    } catch (err: any) {
      message.error(`Failed to regenerate key: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCreateKey = (values: any) => {
    createMutation.mutate({
      name: values.name,
      providerId: values.providerId,
      rateLimit: values.rateLimit || 100,
      expiresInDays: values.expiresInDays || 0,
    });
  };

  const handleCopyKey = async (text: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        textArea.remove();
        if (!successful) throw new Error('execCommand copy failed');
      }
      message.success('Copied to clipboard!');
    } catch (err) {
      console.error('Copy failed:', err);
      message.error('Failed to copy to clipboard');
    }
  };

  const columns = React.useMemo(
    () => [
      {
        title: 'Key Name / Application',
        dataIndex: 'name',
        key: 'name',
        sorter: true,
        render: (text: string) => <Text strong>{text}</Text>,
      },
      {
        title: 'Provider',
        dataIndex: 'providerId',
        key: 'providerId',
        sorter: (a: ApiGatewayKey, b: ApiGatewayKey) => {
          const nameA = (a.providerId && providerMap[a.providerId]?.name) || '';
          const nameB = (b.providerId && providerMap[b.providerId]?.name) || '';
          return nameA.localeCompare(nameB);
        },
        render: (providerId?: string) => {
          if (!providerId) return <Text type="secondary">All</Text>;
          const provider = providerMap[providerId];
          return provider ? <Tag color="blue">{provider.name}</Tag> : <Text type="secondary">{providerId.slice(0, 8)}...</Text>;
        },
      },
      {
        title: (
          <Space>
            <span>Key Identifier</span>
            <Tooltip title="Full secret API keys are hashed and shown ONCE upon creation. For security, only the Prefix is stored in the database.">
              <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
            </Tooltip>
          </Space>
        ),
        dataIndex: 'keyPrefix',
        key: 'keyPrefix',
        sorter: true,
        render: (prefix: string) => <Text code>{prefix || 'gw_sk_••••'}</Text>,
      },
      {
        title: 'Expiration',
        dataIndex: 'expiresAt',
        key: 'expiresAt',
        sorter: (a: ApiGatewayKey, b: ApiGatewayKey) =>
          new Date(a.expiresAt || 0).getTime() - new Date(b.expiresAt || 0).getTime(),
        render: (val?: string) =>
          val ? (
            <Text>{new Date(val).toLocaleDateString()}</Text>
          ) : (
            <Text type="secondary">Never</Text>
          ),
      },
      {
        title: 'Status',
        dataIndex: 'enabled',
        key: 'enabled',
        sorter: (a: ApiGatewayKey, b: ApiGatewayKey) => Number(a.enabled) - Number(b.enabled),
        render: (enabled: boolean) => <StatusTag status={enabled ? 'active' : 'revoked'} />,
      },
      {
        title: 'Created At',
        dataIndex: 'createdAt',
        key: 'createdAt',
        sorter: (a: ApiGatewayKey, b: ApiGatewayKey) =>
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
        render: (val: string) => (val ? new Date(val).toLocaleDateString() : '-'),
      },
      {
        title: 'Requests Served',
        dataIndex: 'requestCount',
        key: 'requestCount',
        sorter: true,
        render: (count: number) => (count || 0).toLocaleString(),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: any, record: ApiGatewayKey) => (
          <Space size="middle">
            <Button
              type="text"
              icon={<CodeOutlined />}
              onClick={() => setIntegrationKey(record)}
            >
              Integration
            </Button>
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleCopyKey(record.keyPrefix)}
            >
              Copy Prefix
            </Button>
            {record.enabled && (
              <>
                <ConfirmButton
                  confirmTitle="Regenerate Gateway Key"
                  confirmDescription="Are you sure you want to regenerate this API Key? The current key will be revoked immediately, and a new key will be provided."
                  onConfirm={() => handleRegenerate(record)}
                  okText="Yes, Regenerate"
                  cancelText="Cancel"
                  icon={<SyncOutlined />}
                  loading={isRegenerating}
                >
                  Regenerate
                </ConfirmButton>
                <ConfirmButton
                  confirmTitle="Revoke Gateway Key"
                  confirmDescription="Are you sure you want to revoke this API Key? Clients using it will be blocked."
                  onConfirm={() => deleteMutation.mutate(record.id)}
                  okText="Yes, Revoke"
                  cancelText="Cancel"
                  icon={<DeleteOutlined />}
                  danger
                >
                  Revoke
                </ConfirmButton>
              </>
            )}
          </Space>
        ),
      },
    ],
    [deleteMutation, providerMap, isRegenerating]
  );

  return (
    <div>
      <PageHeader
        title="Gateway API Keys"
        description="Client authentication keys bound to a specific provider's credential pool for use in OpenCode / external applications"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Create Gateway API Key
          </Button>
        }
      />

      <DataTable
        dataSource={keysData?.data || []}
        columns={columns}
        loading={isLoading || providersLoading}
        rowKey="id"
        searchPlaceholder="Search key name or prefix..."
        searchValue={searchQuery}
        onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: keysData?.total || 0,
          onChange: (p, ps) => {
            setPage(p);
            if (ps && ps !== pageSize) {
              setPageSize(ps);
            }
          },
        }}
      />

      <Modal
        title={newGeneratedKey ? 'Gateway API Key Generated' : 'Generate Gateway API Key'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setNewGeneratedKey(null);
          form.resetFields();
        }}
        footer={null}
      >
        {!newGeneratedKey ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateKey}
            initialValues={{ rateLimit: 100, expiresInDays: 0 }}
            style={{ marginTop: 16 }}
          >
            <Form.Item
              name="name"
              label="Application / Client Name"
              rules={[{ required: true, message: 'Please enter key name' }]}
            >
              <Input placeholder="e.g. OpenCode Development Environment" />
            </Form.Item>

            {activeProviderIds.size === 0 && (
              <Alert
                type="warning"
                showIcon
                message="No Active Credentials Available"
                description="There are currently no active credentials in the Credentials Pool. Please add an active API Key or connect a Google Account in Credentials Pool before creating a Gateway Key."
                style={{ marginBottom: 16 }}
              />
            )}

            <Form.Item
              name="providerId"
              label="Target Provider"
              tooltip="Only providers with active credentials in the pool can be assigned to a Gateway API Key."
              rules={[{ required: true, message: 'Please select a provider' }]}
            >
              <Select
                placeholder="Select Provider with Active Credentials"
                loading={providersLoading || credentialsLoading}
                options={providers.map((p: ApiProvider) => {
                  const hasActive = activeProviderIds.has(p.id);
                  return {
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span>{p.name}</span>
                        {hasActive ? (
                          <Tag color="success" style={{ fontSize: 10, margin: 0 }}>Active Keys</Tag>
                        ) : (
                          <Tag color="default" style={{ fontSize: 10, margin: 0 }}>No Active Key</Tag>
                        )}
                      </div>
                    ),
                    value: p.id,
                    disabled: !hasActive,
                  };
                })}
              />
            </Form.Item>

            <Form.Item
              name="expiresInDays"
              label="Key Expiration"
              tooltip="Select how long this API key will remain active before automatic expiration."
            >
              <Select
                options={[
                  { label: 'No Expiration (Never)', value: 0 },
                  { label: '7 Days', value: 7 },
                  { label: '30 Days', value: 30 },
                  { label: '90 Days', value: 90 },
                  { label: '1 Year (365 Days)', value: 365 },
                ]}
              />
            </Form.Item>

            <Form.Item name="rateLimit" label="Rate Limit (req / min)">
              <InputNumber min={1} max={10000} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                  Generate Key
                </Button>
              </Space>
            </Form.Item>
          </Form>
        ) : (
          <div style={{ marginTop: 16 }}>
            <Alert
              type="warning"
              showIcon
              message="Save your Secret API Key now"
              description="For security reasons, this full secret key is only displayed once upon creation and cannot be retrieved later. Only the Key Prefix is stored in the database."
              style={{ marginBottom: 16 }}
            />

            <div
              style={{
                background: isDark ? '#141414' : '#f5f5f5',
                border: `1px solid ${isDark ? '#303030' : '#e8e8e8'}`,
                padding: '12px 16px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 20,
              }}
            >
              <Text
                code
                style={{
                  fontSize: 13,
                  wordBreak: 'break-all',
                  color: isDark ? '#e6f4ff' : '#1677ff',
                  background: isDark ? '#1f1f1f' : '#ffffff',
                  borderColor: isDark ? '#303030' : '#d9d9d9',
                  padding: '4px 8px',
                  borderRadius: 4,
                }}
              >
                {newGeneratedKey}
              </Text>
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={() => handleCopyKey(newGeneratedKey)}
              >
                Copy Key
              </Button>
            </div>

            <div style={{ textAlign: 'right' }}>
              <Button
                type="primary"
                onClick={() => {
                  setIsModalOpen(false);
                  setNewGeneratedKey(null);
                  form.resetFields();
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Integration Guide Modal */}
      <Modal
        title="CLI & SDK Integration Guide"
        open={!!integrationKey}
        onCancel={() => setIntegrationKey(null)}
        footer={null}
        width={750}
      >
        {integrationKey && (
          <IntegrationModalContent
            integrationKey={integrationKey}
            providerMap={providerMap}
            isDark={isDark}
            handleCopyKey={handleCopyKey}
          />
        )}
      </Modal>
    </div>
  );
}

function IntegrationModalContent({
  integrationKey,
  providerMap,
  isDark,
  handleCopyKey,
}: {
  integrationKey: ApiGatewayKey;
  providerMap: Record<string, ApiProvider>;
  isDark: boolean;
  handleCopyKey: (text: string) => void;
}) {
  const providerId = integrationKey.providerId || 'all';

  // Fetch Models for this provider
  const { data: modelsResult, isLoading: modelsLoading } = useQuery({
    queryKey: ['models-for-integration', providerId],
    queryFn: () => apiGetModels(providerId, { limit: 100 }),
    enabled: !!integrationKey,
  });

  const availableModels: ApiModel[] = modelsResult?.data || [];

  // Default selected models: EMPTY by default
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  const apiBaseUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/v1`
      : 'http://localhost:3000/api/v1';
  const apiKeyDisplay = '<YOUR_FULL_GATEWAY_KEY>';

  const providerName =
    integrationKey.providerId && providerMap[integrationKey.providerId]
      ? providerMap[integrationKey.providerId].name.toLowerCase()
      : '';

  let defaultModelSlug = 'your-model-name';
  if (providerName.includes('openai')) defaultModelSlug = 'gpt-4o';
  else if (providerName.includes('anthropic')) defaultModelSlug = 'claude-3-5-sonnet-20241022';
  else if (providerName.includes('gemini') || providerName.includes('google')) defaultModelSlug = 'gemini-3.6-flash';
  else if (providerName.includes('opencode')) defaultModelSlug = 'big-pickle';

  // Build the dynamic "models" map for JSON
  const modelsJsonMap: Record<string, { name: string }> = {};
  if (selectedSlugs.length > 0) {
    selectedSlugs.forEach((slug) => {
      const found = availableModels.find((m) => m.slug === slug || m.name === slug);
      modelsJsonMap[slug] = { name: found ? found.name : slug };
    });
  }

  const generatedConfigObj = {
    $schema: 'https://opencode.ai/config.json',
    provider: {
      'ai-gateway': {
        options: {
          baseURL: apiBaseUrl,
          apiKey: apiKeyDisplay,
        },
        models: modelsJsonMap,
      },
    },
  };

  const jsonFormattedString = JSON.stringify(generatedConfigObj, null, 2);

  return (
    <div>
      <Alert
        message="Replace <YOUR_FULL_GATEWAY_KEY> with the actual Gateway Key generated during creation. Only the prefix is displayed below."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: 'OpenCode CLI',
            children: (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 6 }}>
                    Select Models to include in OpenCode Config:
                  </Text>
                  <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="Select models..."
                    loading={modelsLoading}
                    value={selectedSlugs}
                    onChange={(values) => setSelectedSlugs(values)}
                    options={availableModels.map((m) => ({
                      label: `${m.name} (${m.slug})`,
                      value: m.slug || m.name,
                    }))}
                  />
                </div>

                <Typography.Paragraph>
                  <Text type="secondary">
                    Add to your <Text code>~/.config/opencode/opencode.jsonc</Text> or project{' '}
                    <Text code>./opencode.jsonc</Text>:
                  </Text>
                </Typography.Paragraph>

                <div style={{ position: 'relative' }}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CopyOutlined />}
                    style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
                    onClick={() => handleCopyKey(jsonFormattedString)}
                  >
                    Copy JSON
                  </Button>
                  <pre
                    style={{
                      background: isDark ? '#141414' : '#f5f5f5',
                      padding: '12px 16px',
                      borderRadius: 6,
                      overflowX: 'auto',
                      maxHeight: '280px',
                      overflowY: 'auto',
                    }}
                  >
                    <code>{jsonFormattedString}</code>
                  </pre>
                </div>

                <Typography.Paragraph style={{ marginTop: 16 }}>
                  <Text type="secondary">Or via Environment Variables:</Text>
                </Typography.Paragraph>
                <pre
                  style={{
                    background: isDark ? '#141414' : '#f5f5f5',
                    padding: 12,
                    borderRadius: 6,
                    overflowX: 'auto',
                  }}
                >
                  <code>{`export OPENAI_API_KEY="${apiKeyDisplay}"
export OPENAI_API_BASE="${apiBaseUrl}"

opencode --model ${selectedSlugs[0] || defaultModelSlug}`}</code>
                </pre>
              </div>
            ),
          },
          {
            key: '2',
            label: 'cURL',
            children: (
              <div>
                <pre
                  style={{
                    background: isDark ? '#141414' : '#f5f5f5',
                    padding: 12,
                    borderRadius: 6,
                    overflowX: 'auto',
                  }}
                >
                  <code>{`curl ${apiBaseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKeyDisplay}" \\
  -d '{
    "model": "${selectedSlugs[0] || defaultModelSlug}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</code>
                </pre>
              </div>
            ),
          },
          {
            key: '3',
            label: 'Python (OpenAI SDK)',
            children: (
              <div>
                <pre
                  style={{
                    background: isDark ? '#141414' : '#f5f5f5',
                    padding: 12,
                    borderRadius: 6,
                    overflowX: 'auto',
                  }}
                >
                  <code>{`from openai import OpenAI

client = OpenAI(
    api_key="${apiKeyDisplay}",
    base_url="${apiBaseUrl}"
)

response = client.chat.completions.create(
    model="${selectedSlugs[0] || defaultModelSlug}",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)`}</code>
                </pre>
              </div>
            ),
          },
          {
            key: '4',
            label: 'Antigravity (IDE & CLI)',
            children: (
              <div>
                <Typography.Paragraph>
                  <Text strong style={{ display: 'block', marginBottom: 6 }}>
                    Antigravity CLI (Bash / PowerShell Environment Variables):
                  </Text>
                </Typography.Paragraph>
                <pre
                  style={{
                    background: isDark ? '#141414' : '#f5f5f5',
                    padding: 12,
                    borderRadius: 6,
                    overflowX: 'auto',
                  }}
                >
                  <code>{`# Windows PowerShell
$env:GOOGLE_GEMINI_BASE_URL = "${apiBaseUrl.replace('/v1', '/v1beta/openai')}"
$env:GEMINI_API_KEY = "${apiKeyDisplay}"

# Linux / macOS (Bash / Zsh)
export GOOGLE_GEMINI_BASE_URL="${apiBaseUrl.replace('/v1', '/v1beta/openai')}"
export GEMINI_API_KEY="${apiKeyDisplay}"`}</code>
                </pre>

                <Typography.Paragraph style={{ marginTop: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 6 }}>
                    Antigravity IDE Config (<Text code>~/.gemini/config.json</Text>):
                  </Text>
                </Typography.Paragraph>
                <pre
                  style={{
                    background: isDark ? '#141414' : '#f5f5f5',
                    padding: 12,
                    borderRadius: 6,
                    overflowX: 'auto',
                  }}
                >
                  <code>{JSON.stringify(
                    {
                      apiEndpoint: apiBaseUrl.replace('/v1', '/v1beta/openai'),
                      apiKey: apiKeyDisplay,
                    },
                    null,
                    2
                  )}</code>
                </pre>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
