'use client';

import React, { useState } from 'react';
import { Typography, Space, Button, Modal, Form, Input, Select, Tag, App } from 'antd';
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

export interface CombinedModel extends ApiModel {
  providerName?: string;
}

export default function ModelsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  // Default to 'all' providers
  const [selectedProviderId, setSelectedProviderId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Fetch Providers
  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });

  // Fetch Models for all or selected provider
  const {
    data: models = [],
    isLoading: modelsLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['models', selectedProviderId, providers.map((p) => p.id).join(',')],
    queryFn: async () => {
      if (!providers || providers.length === 0) return [];

      if (selectedProviderId === 'all') {
        const results = await Promise.all(
          providers.map(async (provider) => {
            try {
              const list = await apiGetModels(provider.id);
              return list.map((m) => ({
                ...m,
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
        const list = await apiGetModels(selectedProviderId);
        return list.map((m) => ({
          ...m,
          providerId: selectedProviderId,
          providerName: targetProvider?.name || 'Unknown',
        }));
      }
    },
    enabled: providers.length > 0,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: Partial<ApiModel> }) =>
      apiCreateModel(providerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
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
      queryClient.invalidateQueries({ queryKey: ['models'] });
      message.success('Model alias deleted');
    },
    onError: (err: Error) => message.error(err.message),
  });

  const handleCreateModel = (values: any) => {
    const targetProviderId = values.providerId;
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

  const columns = React.useMemo(
    () => [
      {
        title: 'Model Slug / Alias',
        dataIndex: 'slug',
        key: 'slug',
        sorter: (a: CombinedModel, b: CombinedModel) => a.slug.localeCompare(b.slug),
        render: (text: string) => (
          <Text code strong>
            {text}
          </Text>
        ),
      },
      {
        title: 'Provider',
        dataIndex: 'providerName',
        key: 'providerName',
        sorter: (a: CombinedModel, b: CombinedModel) =>
          (a.providerName || '').localeCompare(b.providerName || ''),
        render: (name: string) => <Tag color="blue">{name || 'Provider'}</Tag>,
      },
      {
        title: 'Display Name',
        dataIndex: 'displayName',
        key: 'displayName',
        sorter: (a: CombinedModel, b: CombinedModel) =>
          (a.displayName || '').localeCompare(b.displayName || ''),
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
        sorter: (a: CombinedModel, b: CombinedModel) => Number(a.enabled) - Number(b.enabled),
        render: (enabled: boolean) => <StatusTag status={enabled ? 'active' : 'disabled'} />,
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: any, record: CombinedModel) => (
          <ConfirmButton
            confirmTitle="Delete Model Alias?"
            onConfirm={() => deleteMutation.mutate({ providerId: record.providerId, modelId: record.id })}
            icon={<DeleteOutlined />}
          >
            Delete
          </ConfirmButton>
        ),
      },
    ],
    [deleteMutation]
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
        searchPlaceholder="Search model alias, display name, or provider..."
        searchFields={['slug', 'displayName', 'name', 'providerName']}
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
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateModel}
          initialValues={{
            providerId: selectedProviderId !== 'all' ? selectedProviderId : providers[0]?.id,
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
            label="Upstream Model Name"
            rules={[{ required: true, message: 'Please enter upstream model name' }]}
          >
            <Input placeholder="e.g. gpt-4o / claude-3-5-sonnet-20241022" />
          </Form.Item>

          <Form.Item
            name="slug"
            label="Client Model Alias (Slug)"
            tooltip="The model name client applications will use in API requests (e.g. /v1/chat/completions)"
          >
            <Input placeholder="e.g. gpt-4o (defaults to lowercased upstream name)" />
          </Form.Item>

          <Form.Item name="displayName" label="Display Name">
            <Input placeholder="e.g. GPT-4o Omni" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Create Model Alias
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
