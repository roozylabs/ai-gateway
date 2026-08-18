'use client';

import React, { useState } from 'react';
import { Table, Button, Tag, Space, Typography, Modal, Form, Input, Select, InputNumber, Card, App } from 'antd';
import { PlusOutlined, SafetyCertificateOutlined, ExperimentOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { MOCK_CREDENTIALS, MOCK_PROVIDERS, Credential } from '@/lib/mock-data';

const { Title, Text } = Typography;

export default function CredentialsPage() {
  const { message } = App.useApp();
  const [credentials, setCredentials] = useState<Credential[]>(MOCK_CREDENTIALS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleTestConnection = (id: string, name: string) => {
    setTestingId(id);
    message.loading({ content: `Pinging upstream API for ${name}...`, key: id });

    setTimeout(() => {
      setTestingId(null);
      message.success({ content: `Connection test successful! (HTTP 200 OK - 240ms)`, key: id });
    }, 1000);
  };

  const handleAddCredential = (values: any) => {
    const prov = MOCK_PROVIDERS.find((p) => p.id === values.providerId);
    const newCred: Credential = {
      id: `cred-${Date.now()}`,
      name: values.name,
      providerId: values.providerId,
      providerName: prov ? prov.name : 'Custom Provider',
      maskedKey: `${values.apiKey.substring(0, 7)}••••••••${values.apiKey.slice(-4)}`,
      priority: values.priority || 1,
      status: 'ACTIVE',
      requestCount: 0,
      lastUsed: 'Never',
    };

    setCredentials([...credentials, newCred]);
    setIsModalOpen(false);
    form.resetFields();
    message.success('Provider Credential added to rotation pool');
  };

  const columns = [
    {
      title: 'Credential Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Provider',
      dataIndex: 'providerName',
      key: 'providerName',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Masked API Key',
      dataIndex: 'maskedKey',
      key: 'maskedKey',
      render: (key: string) => <Text code>{key}</Text>,
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
      render: (status: string, record: Credential) => {
        if (status === 'ACTIVE') return <Tag color="success" icon={<CheckCircleOutlined />}>ACTIVE</Tag>;
        if (status === 'RATE_LIMITED') return <Tag color="warning" icon={<SyncOutlined spin />}>RATE LIMITED ({record.cooldownEndsAt})</Tag>;
        if (status === 'DISABLED') return <Tag color="default">DISABLED</Tag>;
        return <Tag color="error">INVALID</Tag>;
      },
    },
    {
      title: 'Requests Served',
      dataIndex: 'requestCount',
      key: 'requestCount',
      render: (count: number) => count.toLocaleString(),
    },
    {
      title: 'Last Used',
      dataIndex: 'lastUsed',
      key: 'lastUsed',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Credential) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<ExperimentOutlined />}
            loading={testingId === record.id}
            onClick={() => handleTestConnection(record.id, record.name)}
          >
            Test
          </Button>
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

        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          Add Credential
        </Button>
      </div>

      <Card size="small" variant="borderless" style={{ borderRadius: 8 }}>
        <Table dataSource={credentials} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
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
            rules={[{ required: true, message: 'Please select provider' }]}
          >
            <Select placeholder="Select Provider">
              {MOCK_PROVIDERS.map((p) => (
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
              <Button type="primary" htmlType="submit">
                Save & Encrypt Key
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
