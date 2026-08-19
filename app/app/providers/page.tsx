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

const { Title, Text } = Typography;

export type RoutingStrategy = 'round-robin' | 'lru' | 'fallback';

const STRATEGY_OPTIONS: { value: RoutingStrategy; label: string; description: string; color: string }[] = [
  {
    value: 'round-robin',
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
    value: 'fallback',
    label: 'Fallback Cascade',
    description: 'Always use primary credential, failover to backup on error',
    color: 'orange',
  },
];

function getStrategyDisplay(strategy: string) {
  const opt = STRATEGY_OPTIONS.find((s) => s.value === strategy);
  if (!opt) return { label: strategy || 'Round Robin', color: 'blue', icon: <SyncOutlined /> };

  const icons: Record<string, React.ReactNode> = {
    'round-robin': <SyncOutlined />,
    'lru': <HistoryOutlined />,
    'fallback': <NodeIndexOutlined />,
  };

  return { label: opt.label, color: opt.color, icon: icons[strategy] || <SyncOutlined /> };
}

import { useSSE } from '@/hooks/useSSE';
import { PageHeader, StatusTag } from '@/components/atoms';

export default function ProvidersPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { isConnected } = useSSE();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ApiProvider | null>(null);
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

  const handleToggle = (prov: ApiProvider, checked: boolean) => {
    if (!checked) {
      modal.confirm({
        title: `Disable Provider "${prov.name}"?`,
        content: `Disabling this provider will temporarily suspend request routing for all associated credentials.`,
        okText: 'Disable Provider',
        okButtonProps: { danger: true },
        cancelText: 'Cancel',
        onOk: () => {
          updateMutation.mutate({ id: prov.id, data: { ...prov, enabled: false } });
        },
      });
    } else {
      updateMutation.mutate({ id: prov.id, data: { ...prov, enabled: true } });
    }
  };

  const openAddModal = () => {
    setEditingProvider(null);
    form.resetFields();
    form.setFieldsValue({ type: 'openai' });
    setIsModalOpen(true);
  };

  const openEditModal = (prov: ApiProvider) => {
    setEditingProvider(prov);
    form.setFieldsValue({
      name: prov.name,
      slug: prov.slug,
      baseUrl: prov.baseUrl,
      type: prov.type,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (values: any) => {
    if (editingProvider) {
      updateMutation.mutate({ id: editingProvider.id, data: values });
    } else {
      createMutation.mutate({
        ...values,
        slug: values.slug || values.name.toLowerCase().replace(/\s+/g, '-'),
        enabled: true,
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Providers"
        description="Manage AI Vendor targets and base API endpoints"
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
              const strategyInfo = getStrategyDisplay('round-robin');
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
            <Input placeholder="e.g. Anthropic Production" />
          </Form.Item>

          <Form.Item
            name="slug"
            label="Provider Slug / Identifier"
            rules={[{ required: true, message: 'Please enter provider slug' }]}
          >
            <Input placeholder="e.g. anthropic" />
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
            rules={[{ required: true, message: 'Please select provider type' }]}
          >
            <Select
              options={[
                { label: 'OpenAI Format', value: 'openai' },
                { label: 'Anthropic Format', value: 'anthropic' },
                { label: 'Google Gemini Format', value: 'google' },
                { label: 'Custom / OpenRouter', value: 'custom' },
              ]}
            />
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
