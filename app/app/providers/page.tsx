'use client';

import React, { useState } from 'react';
import { Row, Col, Card, Typography, Switch, Button, Tag, Modal, Form, Input, Select, Space, App, Spin, Popconfirm } from 'antd';
import { PlusOutlined, ApiOutlined, EditOutlined, DeleteOutlined, SyncOutlined, HistoryOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetProviders,
  apiCreateProvider,
  apiUpdateProvider,
  apiDeleteProvider,
  ApiProvider,
} from '@/lib/api';
import { useSSE } from '@/hooks/useSSE';
import { PageHeader } from '@/components/atoms';

const { Text } = Typography;

export type RoutingStrategy = 'round_robin' | 'lru' | 'fallback_cascade';

const STRATEGY_OPTIONS: { value: string; label: string; description: string; color: string }[] = [
  {
    value: 'round_robin',
    label: 'Round Robin (Equal)',
    description: 'Distribute requests evenly across all active credentials',
    color: 'blue',
  },
  {
    value: 'lru',
    label: 'Least Recently Used (LRU)',
    description: 'Prioritize the credential with the longest idle time',
    color: 'purple',
  },
  {
    value: 'fallback_cascade',
    label: 'Fallback Cascade',
    description: 'Always use primary credential, failover to backup on error',
    color: 'orange',
  },
];

function getStrategyDisplay(strategy: string) {
  const normStrategy = strategy === 'round-robin' ? 'round_robin' : strategy === 'fallback' ? 'fallback_cascade' : strategy;
  const opt = STRATEGY_OPTIONS.find((s) => s.value === normStrategy);
  if (!opt) return { label: strategy || 'Round Robin', color: 'blue', icon: <SyncOutlined /> };

  const icons: Record<string, React.ReactNode> = {
    'round_robin': <SyncOutlined />,
    'lru': <HistoryOutlined />,
    'fallback_cascade': <NodeIndexOutlined />,
  };

  return { label: opt.label, color: opt.color, icon: icons[normStrategy] || <SyncOutlined /> };
}

export default function ProvidersPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { isConnected } = useSSE();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ApiProvider | null>(null);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [isSlugEditable, setIsSlugEditable] = useState(false);
  const [form] = Form.useForm();

  // Fetch Providers
  const { data: providers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: apiCreateProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      message.success('New AI Provider added successfully');
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (err: Error) => message.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApiProvider> }) => apiUpdateProvider(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      message.success('Provider updated successfully');
      setIsModalOpen(false);
      form.resetFields();
      setEditingProvider(null);
    },
    onError: (err: Error) => message.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: apiDeleteProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      message.success('Provider deleted');
    },
    onError: (err: Error) => message.error(err.message),
  });

  const handleToggle = (provider: ApiProvider, enabled: boolean) => {
    updateMutation.mutate({
      id: provider.id,
      data: { enabled },
    });
  };

  const openAddModal = () => {
    setEditingProvider(null);
    setIsSlugManuallyEdited(false);
    setIsSlugEditable(false);
    form.resetFields();
    form.setFieldsValue({
      type: 'openai',
      routingStrategy: 'round_robin',
      enabled: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (provider: ApiProvider) => {
    setEditingProvider(provider);
    setIsSlugManuallyEdited(true);
    setIsSlugEditable(false);
    form.setFieldsValue({
      name: provider.name,
      slug: provider.slug,
      baseUrl: provider.baseUrl,
      type: provider.type,
      routingStrategy: provider.routingStrategy || 'round_robin',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (values: any) => {
    if (editingProvider) {
      updateMutation.mutate({
        id: editingProvider.id,
        data: {
          name: values.name,
          slug: values.slug,
          baseUrl: values.baseUrl,
          type: values.type,
          routingStrategy: values.routingStrategy,
        },
      });
    } else {
      createMutation.mutate({
        name: values.name,
        slug: values.slug,
        baseUrl: values.baseUrl,
        type: values.type,
        routingStrategy: values.routingStrategy || 'round_robin',
        enabled: true,
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Providers"
        description="Manage AI Vendor targets, base API endpoints, and credential rotation strategies"
        extra={
          <Space wrap>
            <Button
              icon={<SyncOutlined spin={isRefetching} />}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
              Add Provider
            </Button>
          </Space>
        }
      />

      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]}>
          {providers.length === 0 && !isLoading ? (
            <Col span={24}>
              <Card style={{ textAlign: 'center', padding: 32 }}>
                <Text type="secondary">No AI providers found. Click "Add Provider" to get started.</Text>
              </Card>
            </Col>
          ) : (
            providers.map((prov) => {
              const strategyInfo = getStrategyDisplay(prov.routingStrategy || 'round_robin');
              return (
                <Col xs={24} sm={12} lg={8} key={prov.id}>
                  <Card
                    actions={[
                      <Space key="edit" onClick={() => openEditModal(prov)}>
                        <EditOutlined /> Edit
                      </Space>,
                      <Popconfirm
                        key="delete"
                        title="Delete Provider?"
                        description="Are you sure you want to delete this provider?"
                        onConfirm={() => deleteMutation.mutate(prov.id)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Space style={{ color: '#ff4d4f' }}>
                          <DeleteOutlined /> Delete
                        </Space>
                      </Popconfirm>,
                      <Space key="status">
                        <Switch
                          checked={prov.enabled}
                          onChange={(checked) => handleToggle(prov, checked)}
                          size="small"
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {prov.enabled ? 'Enabled' : 'Disabled'}
                        </Text>
                      </Space>,
                    ]}
                    style={{ borderRadius: 8 }}
                  >
                    <Card.Meta
                      avatar={<ApiOutlined style={{ fontSize: 28, color: '#1677ff' }} />}
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong>{prov.name}</Text>
                          {prov.enabled ? (
                            <Tag color="success">Active</Tag>
                          ) : (
                            <Tag color="default">Disabled</Tag>
                          )}
                        </div>
                      }
                      description={
                        <div style={{ marginTop: 8 }}>
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>Base URL:</Text>
                          </div>
                          <Text code style={{ fontSize: 12 }}>{prov.baseUrl}</Text>
                          <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <Tag color="blue">Type: {prov.type || 'openai'}</Tag>
                            <Tag color={strategyInfo.color} icon={strategyInfo.icon}>{strategyInfo.label}</Tag>
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              );
            })
          )}
        </Row>
      </Spin>

      <Modal
        title={editingProvider ? 'Edit AI Provider' : 'Add New AI Provider'}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); setEditingProvider(null); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Provider Name"
            rules={[{ required: true, message: 'Please enter provider name' }]}
          >
            <Input 
              placeholder="e.g. Anthropic Production" 
              onChange={(e) => {
                if (!isSlugManuallyEdited) {
                  const slugified = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)+/g, '');
                  form.setFieldsValue({ slug: slugified });
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="slug"
            label="Provider Slug / Identifier"
            rules={[{ required: true, message: 'Please enter provider slug' }]}
          >
            <Input 
              placeholder="e.g. anthropic" 
              readOnly={!isSlugEditable}
              onClick={() => setIsSlugEditable(true)}
              onChange={() => setIsSlugManuallyEdited(true)}
              suffix={
                !isSlugEditable ? (
                  <EditOutlined 
                    style={{ color: '#1677ff', cursor: 'pointer' }} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSlugEditable(true);
                    }} 
                  />
                ) : null
              }
              style={{ 
                cursor: isSlugEditable ? 'text' : 'pointer', 
                backgroundColor: isSlugEditable ? undefined : '#fafafa',
                borderColor: isSlugEditable ? undefined : '#d9d9d9',
                color: isSlugEditable ? undefined : '#888'
              }}
            />
          </Form.Item>

          <Form.Item
            name="baseUrl"
            label="Base URL Endpoint"
            rules={[{ required: true, message: 'Please enter base URL' }]}
          >
            <Input placeholder="e.g. https://api.anthropic.com" />
          </Form.Item>

          <Form.Item
            name="type"
            label="API Format Type"
            tooltip="Select the HTTP protocol adapter format expected by upstream (OpenAI spec, Anthropic spec, Gemini spec, or Custom)."
            rules={[{ required: true, message: 'Please select provider type' }]}
          >
            <Select
              options={[
                { label: 'OpenAI Format (/v1/chat/completions)', value: 'openai' },
                { label: 'Anthropic Format (/v1/messages)', value: 'anthropic' },
                { label: 'Google Gemini Format (/v1beta)', value: 'google' },
                { label: 'OpenCode Zen Format', value: 'opencode' },
                { label: 'Custom / OpenRouter', value: 'custom' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="routingStrategy"
            label="Credential Rotation Strategy"
            tooltip="Algorithm used to select and rotate active API secret keys from this provider's credential pool."
            rules={[{ required: true, message: 'Please select routing strategy' }]}
          >
            <Select optionLabelProp="label">
              {STRATEGY_OPTIONS.map((opt) => (
                <Select.Option key={opt.value} value={opt.value} label={opt.label}>
                  <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
                    <Text strong style={{ fontSize: 14 }}>{opt.label}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{opt.description}</Text>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setIsModalOpen(false); setEditingProvider(null); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingProvider ? 'Update Provider' : 'Save Provider'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
