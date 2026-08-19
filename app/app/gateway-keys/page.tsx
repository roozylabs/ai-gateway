'use client';

import React, { useState } from 'react';
import { Button, Space, Typography, Modal, Form, Input, Select, InputNumber, Alert, Tooltip, App } from 'antd';
import { PlusOutlined, CopyOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import { DataTable, PageHeader, StatusTag, ConfirmButton } from '@/components/atoms';
import {
  apiGetGatewayKeys,
  apiCreateGatewayKey,
  apiDeleteGatewayKey,
  ApiGatewayKey,
} from '@/lib/api';

const { Text } = Typography;

export default function GatewayKeysPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGeneratedKey, setNewGeneratedKey] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Fetch Gateway Keys
  const { data: keys = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['gateway-keys'],
    queryFn: apiGetGatewayKeys,
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (values: { name: string; rateLimit?: number; expiresInDays?: number }) =>
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

  const handleCreateKey = (values: any) => {
    createMutation.mutate({
      name: values.name,
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
            <Text type="secondary">Never (No Expiration)</Text>
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
        title: 'Last Used',
        dataIndex: 'lastUsedAt',
        key: 'lastUsedAt',
        sorter: (a: ApiGatewayKey, b: ApiGatewayKey) =>
          new Date(a.lastUsedAt || 0).getTime() - new Date(b.lastUsedAt || 0).getTime(),
        render: (val: string) => (val ? new Date(val).toLocaleString() : 'Never'),
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
              icon={<CopyOutlined />}
              onClick={() => handleCopyKey(record.keyPrefix)}
            >
              Copy Prefix
            </Button>
            {record.enabled && (
              <ConfirmButton
                confirmTitle="Revoke Gateway Key"
                confirmDescription="Are you sure you want to revoke this API Key? Clients using it will be blocked."
                onConfirm={() => deleteMutation.mutate(record.id)}
                okText="Yes, Revoke"
                cancelText="Cancel"
                icon={<DeleteOutlined />}
              >
                Revoke
              </ConfirmButton>
            )}
          </Space>
        ),
      },
    ],
    [deleteMutation]
  );

  return (
    <div>
      <PageHeader
        title="Gateway API Keys"
        description="Client authentication keys used by OpenCode / external applications to access the Credential Pool"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Create Gateway API Key
          </Button>
        }
      />

      <DataTable
        dataSource={keys}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        searchPlaceholder="Search key name or prefix..."
        searchFields={['name', 'keyPrefix']}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
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
    </div>
  );
}
