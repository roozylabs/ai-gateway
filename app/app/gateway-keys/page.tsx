'use client';

import React, { useState } from 'react';
import { Table, Button, Tag, Space, Typography, Modal, Form, Input, Card, Popconfirm, App } from 'antd';
import { PlusOutlined, KeyOutlined, CopyOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { MOCK_GATEWAY_KEYS, GatewayKey } from '@/lib/mock-data';

const { Title, Text } = Typography;

export default function GatewayKeysPage() {
  const { message } = App.useApp();
  const [keys, setKeys] = useState<GatewayKey[]>(MOCK_GATEWAY_KEYS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGeneratedKey, setNewGeneratedKey] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleRevoke = (id: string) => {
    setKeys(keys.map((k) => (k.id === id ? { ...k, status: 'REVOKED' } : k)));
    message.success('Gateway API Key revoked successfully');
  };

  const handleCreateKey = (values: any) => {
    const rawSecret = `gw_sk_live_${Math.random().toString(36).substring(2, 12)}_${Math.random().toString(36).substring(2, 12)}`;
    const newKey: GatewayKey = {
      id: `gwk-${Date.now()}`,
      name: values.name,
      keyPrefix: `${rawSecret.substring(0, 16)}...`,
      status: 'ACTIVE',
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
      requestCount: 0,
    };

    setKeys([newKey, ...keys]);
    setNewGeneratedKey(rawSecret);
  };

  const handleCopyKey = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard!');
  };

  const columns = [
    {
      title: 'Key Name / Application',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Key Identifier',
      dataIndex: 'keyPrefix',
      key: 'keyPrefix',
      render: (prefix: string) => <Text code>{prefix}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) =>
        status === 'ACTIVE' ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>ACTIVE</Tag>
        ) : (
          <Tag color="error">REVOKED</Tag>
        ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: 'Last Used',
      dataIndex: 'lastUsed',
      key: 'lastUsed',
    },
    {
      title: 'Requests Served',
      dataIndex: 'requestCount',
      key: 'requestCount',
      render: (count: number) => count.toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: GatewayKey) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<CopyOutlined />}
            onClick={() => handleCopyKey(record.keyPrefix)}
          >
            Copy
          </Button>
          {record.status === 'ACTIVE' && (
            <Popconfirm
              title="Revoke Gateway Key"
              description="Are you sure you want to revoke this API Key? Clients using it will be blocked."
              onConfirm={() => handleRevoke(record.id)}
              okText="Yes, Revoke"
              cancelText="Cancel"
            >
              <Button type="text" danger icon={<DeleteOutlined />}>
                Revoke
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Gateway API Keys
          </Title>
          <Text type="secondary">Client authentication keys used by OpenCode, Claude Code, and Antigravity</Text>
        </div>

        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          Create Gateway API Key
        </Button>
      </div>

      <Card size="small" variant="borderless" style={{ borderRadius: 8 }}>
        <Table dataSource={keys} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={newGeneratedKey ? "Gateway API Key Created Successfully" : "Generate Gateway API Key"}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setNewGeneratedKey(null);
          form.resetFields();
        }}
        footer={null}
      >
        {!newGeneratedKey ? (
          <Form form={form} layout="vertical" onFinish={handleCreateKey} style={{ marginTop: 16 }}>
            <Form.Item
              name="name"
              label="Application / Client Name"
              rules={[{ required: true, message: 'Please enter key name' }]}
            >
              <Input placeholder="e.g. OpenCode Development Environment" />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit">
                  Generate Key
                </Button>
              </Space>
            </Form.Item>
          </Form>
        ) : (
          <div style={{ marginTop: 16 }}>
            <Text type="danger" strong style={{ display: 'block', marginBottom: 12 }}>
              ⚠️ Please copy your API Key now. You will not be able to see it again!
            </Text>

            <div
              style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <Text code style={{ fontSize: 13, wordBreak: 'break-all' }}>
                {newGeneratedKey}
              </Text>
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={() => handleCopyKey(newGeneratedKey)}
              >
                Copy
              </Button>
            </div>

            <div style={{ textAlign: 'right' }}>
              <Button
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
