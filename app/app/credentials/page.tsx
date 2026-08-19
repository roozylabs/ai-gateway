'use client';

import React, { useState } from 'react';
import { Table, Button, Tag, Space, Typography, Modal, Form, Input, Select, InputNumber, Card, App, Popconfirm, Spin } from 'antd';
import { PlusOutlined, ExperimentOutlined, CheckCircleOutlined, SyncOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetProviders,
  apiGetCredentials,
  apiCreateCredential,
  apiDeleteCredential,
  apiTestCredential,
  ApiProvider,
  ApiCredential,
} from '@/lib/api';

const { Title, Text } = Typography;

export default function CredentialsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Fetch Providers list for dropdown / filtering
  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });

  // Set default selected provider if available
  const activeProviderId = selectedProviderId || (providers[0]?.id ?? '');

  // Fetch Credentials for selected provider
  const { data: credentials = [], isLoading: credentialsLoading } = useQuery({
    queryKey: ['credentials', activeProviderId],
    queryFn: () => (activeProviderId ? apiGetCredentials(activeProviderId) : Promise.resolve([])),
    enabled: !!activeProviderId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: Partial<ApiCredential> & { apiKey: string } }) =>
      apiCreateCredential(providerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials', activeProviderId] });
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
      queryClient.invalidateQueries({ queryKey: ['credentials', activeProviderId] });
      message.success('Credential deleted');
    },
    onError: (err: Error) => message.error(err.message),
  });

  const handleTestConnection = async (credId: string, name: string) => {
    if (!activeProviderId) return;
    setTestingId(credId);
    message.loading({ content: `Testing connection for ${name}...`, key: credId });

    try {
      const res = await apiTestCredential(activeProviderId, credId);
      message.success({ content: res.message || `Connection test successful for ${name}!`, key: credId });
    } catch (err: any) {
      message.error({ content: err.message || `Connection test failed for ${name}`, key: credId });
    } finally {
      setTestingId(null);
    }
  };

  const handleAddCredential = (values: any) => {
    const targetProviderId = values.providerId || activeProviderId;
    if (!targetProviderId) {
      message.error('Please select a target provider');
      return;
    }
    createMutation.mutate({
      providerId: targetProviderId,
      data: {
        name: values.name,
        apiKey: values.apiKey,
        priority: values.priority || 1,
        enabled: true,
      },
    });
  };

  const columns = [
    {
      title: 'Credential Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Masked Key Prefix',
      dataIndex: 'keyPrefix',
      key: 'keyPrefix',
      render: (prefix: string) => <Text code>{prefix || 'sk-••••'}</Text>,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (p: number) => <Tag color="geekblue">Priority {p}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const s = (status || 'active').toUpperCase();
        if (s === 'ACTIVE') return <Tag color="success" icon={<CheckCircleOutlined />}>ACTIVE</Tag>;
        if (s === 'RATE_LIMITED') return <Tag color="warning" icon={<SyncOutlined spin />}>RATE LIMITED</Tag>;
        if (s === 'DISABLED') return <Tag color="default">DISABLED</Tag>;
        return <Tag color="error">INVALID</Tag>;
      },
    },
    {
      title: 'Requests Served',
      dataIndex: 'requestCount',
      key: 'requestCount',
      render: (count: number) => (count || 0).toLocaleString(),
    },
    {
      title: 'Last Used',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      render: (val: string) => (val ? new Date(val).toLocaleString() : 'Never'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ApiCredential) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<ExperimentOutlined />}
            loading={testingId === record.id}
            onClick={() => handleTestConnection(record.id, record.name)}
          >
            Test
          </Button>
          <Popconfirm
            title="Delete Credential?"
            onConfirm={() => deleteMutation.mutate({ providerId: activeProviderId, credId: record.id })}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Credentials Pool
          </Title>
          <Text type="secondary">API Key pools, rotation priority, and rate-limit cooldown states</Text>
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
            Add Credential
          </Button>
        </Space>
      </div>

      <Card size="small" variant="borderless" style={{ borderRadius: 8 }}>
        <Table
          dataSource={credentials}
          columns={columns}
          loading={credentialsLoading || providersLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Add Provider Credential"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddCredential} style={{ marginTop: 16 }}>
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
            name="name"
            label="Credential Label"
            rules={[{ required: true, message: 'Please enter credential label' }]}
          >
            <Input placeholder="e.g. Anthropic Production #3" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="Provider API Secret Key"
            rules={[{ required: true, message: 'Please enter API Key' }]}
          >
            <Input.Password placeholder="sk-ant-api03-xxxxxxxxxxxxx" />
          </Form.Item>

          <Form.Item
            name="priority"
            label="Rotation Priority (1 = Highest)"
            initialValue={1}
          >
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
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
    </div>
  );
}
