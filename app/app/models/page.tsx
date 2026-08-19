'use client';

import React, { useState } from 'react';
import { Typography, Space, Button, Modal, Form, Input, Select, App } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, PageHeader, StatusTag, ConfirmButton } from '@/components/atoms';
import {
  apiGetProviders,
  apiGetModels,
  apiCreateModel,
  apiDeleteModel,
  ApiProvider,
  ApiModel,
} from '@/lib/api';

const { Text } = Typography;

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
  const { data: models = [], isLoading: modelsLoading, refetch, isRefetching } = useQuery({
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
      sorter: true,
      render: (text: string) => <Text code strong>{text}</Text>,
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      sorter: true,
      render: (text: string) => text || '-',
    },
    {
      title: 'Upstream Model Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (model: string) => <Text style={{ fontFamily: 'monospace' }}>{model}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      sorter: (a: ApiModel, b: ApiModel) => Number(a.enabled) - Number(b.enabled),
      render: (enabled: boolean) => <StatusTag status={enabled ? 'active' : 'disabled'} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ApiModel) => (
        <ConfirmButton
          confirmTitle="Delete Model Alias?"
          onConfirm={() => deleteMutation.mutate({ providerId: activeProviderId, modelId: record.id })}
          icon={<DeleteOutlined />}
        >
          Delete
        </ConfirmButton>
      ),
    },
  ];

  const extraActions = (
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
    </Space>
  );

  return (
    <div>
      <PageHeader
        title="Models & Routing"
        description="Map client request model aliases to upstream AI Provider models"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Add Model Alias
          </Button>
        }
      />

      <DataTable
        dataSource={models}
        columns={columns}
        loading={modelsLoading || providersLoading}
        rowKey="id"
        pagination={false}
        searchPlaceholder="Search model alias or vendor ID..."
        searchFields={['slug', 'displayName', 'name']}
        extraActions={extraActions}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
      />

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
