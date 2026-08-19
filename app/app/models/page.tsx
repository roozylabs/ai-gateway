'use client';

import React, { useState } from 'react';
import { Table, Tag, Typography, Card, Space, Button, Modal, Form, Input, Select, App, Popconfirm } from 'antd';
import { ArrowRightOutlined, CheckCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetProviders,
  apiGetModels,
  apiCreateModel,
  apiDeleteModel,
  ApiProvider,
  ApiModel,
} from '@/lib/api';

const { Title, Text } = Typography;

export default function ModelsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Fetch Providers
  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });

  const activeProviderId = selectedProviderId || (providers[0]?.id ?? '');

  // Fetch Models for selected provider
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['models', activeProviderId],
    queryFn: () => (activeProviderId ? apiGetModels(activeProviderId) : Promise.resolve([])),
    enabled: !!activeProviderId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: Partial<ApiModel> }) =>
      apiCreateModel(providerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models', activeProviderId] });
      message.success('Model alias created');
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (err: Error) => message.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ providerId, modelId }: { providerId: string; modelId: string }) =>
      apiDeleteModel(providerId, modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models', activeProviderId] });
      message.success('Model alias deleted');
    },
    onError: (err: Error) => message.error(err.message),
  });

  const handleCreateModel = (values: any) => {
    const targetProviderId = values.providerId || activeProviderId;
    if (!targetProviderId) {
      message.error('Please select a target provider');
      return;
    }
    createMutation.mutate({
      providerId: targetProviderId,
      data: {
        name: values.name,
        slug: values.slug || values.name.toLowerCase().replace(/\s+/g, '-'),
        displayName: values.displayName || values.name,
        enabled: true,
      },
    });
  };

  const columns = [
    {
      title: 'Model Slug / Alias',
      dataIndex: 'slug',
      key: 'slug',
      render: (text: string) => <Text code strong>{text}</Text>,
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (text: string) => text || '-',
    },
    {
      title: 'Upstream Model Name',
      dataIndex: 'name',
      key: 'name',
      render: (model: string) => <Text style={{ fontFamily: 'monospace' }}>{model}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) =>
        enabled ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>ACTIVE</Tag>
        ) : (
          <Tag color="default">DISABLED</Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ApiModel) => (
        <Popconfirm
          title="Delete Model Alias?"
          onConfirm={() => deleteMutation.mutate({ providerId: activeProviderId, modelId: record.id })}
          okText="Yes"
          cancelText="No"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Models & Routing
          </Title>
          <Text type="secondary">Map client request model aliases to upstream AI Provider models</Text>
        </div>

        <Space>
          <Select
            placeholder="Select Provider"
            style={{ width: 220 }}
            value={activeProviderId}
            onChange={(val) => setSelectedProviderId(val)}
            loading={providersLoading}
            options={providers.map((p: ApiProvider) => ({
              label: p.name,
              value: p.id,
            }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Add Model Alias
          </Button>
        </Space>
      </div>

      <Card size="small" variant="borderless" style={{ borderRadius: 8 }}>
        <Table
          dataSource={models}
          columns={columns}
          loading={modelsLoading || providersLoading}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title="Add Model Alias"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateModel} style={{ marginTop: 16 }}>
          <Form.Item
            name="providerId"
            label="Target Provider"
            initialValue={activeProviderId}
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
            name="slug"
            label="Model Alias / Slug (Used by Clients)"
            rules={[{ required: true, message: 'Please enter model slug' }]}
          >
            <Input placeholder="e.g. gpt-4o or claude-sonnet" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Upstream Vendor Model ID"
            rules={[{ required: true, message: 'Please enter vendor model ID' }]}
          >
            <Input placeholder="e.g. gpt-4o-2024-08-06 or claude-3-7-sonnet-20250219" />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="Display Name"
          >
            <Input placeholder="e.g. GPT-4o (August 2024)" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Save Model Mapping
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
