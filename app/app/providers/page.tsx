'use client';

import React, { useState } from 'react';
import { Row, Col, Card, Typography, Switch, Button, Tag, Modal, Form, Input, Space, App } from 'antd';
import { PlusOutlined, ApiOutlined, EditOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { MOCK_PROVIDERS, Provider } from '@/lib/mock-data';

const { Title, Text } = Typography;

export default function ProvidersPage() {
  const { message } = App.useApp();
  const [providers, setProviders] = useState<Provider[]>(MOCK_PROVIDERS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleToggle = (id: string, checked: boolean) => {
    setProviders(
      providers.map((p) => (p.id === id ? { ...p, enabled: checked } : p))
    );
    message.success(`Provider status updated`);
  };

  const handleAddProvider = (values: any) => {
    const newProv: Provider = {
      id: `prov-${Date.now()}`,
      name: values.name,
      code: values.name.toLowerCase().replace(/\s+/g, '-'),
      baseUrl: values.baseUrl,
      enabled: true,
      credentialsCount: 0,
      health: 'healthy',
    };
    setProviders([...providers, newProv]);
    setIsModalOpen(false);
    form.resetFields();
    message.success('New AI Provider added successfully');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            AI Providers
          </Title>
          <Text type="secondary">Manage AI Vendor targets and base API endpoints</Text>
        </div>

        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          Add Provider
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {providers.map((prov) => (
          <Col xs={24} sm={12} lg={8} key={prov.id}>
            <Card
              actions={[
                <Space key="edit" onClick={() => message.info('Edit modal mockup')}>
                  <EditOutlined /> Edit
                </Space>,
                <Space key="status">
                  <Switch
                    checked={prov.enabled}
                    onChange={(checked) => handleToggle(prov.id, checked)}
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
                    {prov.health === 'healthy' && <Tag color="success">Healthy</Tag>}
                    {prov.health === 'degraded' && <Tag color="warning">Degraded</Tag>}
                  </div>
                }
                description={
                  <div style={{ marginTop: 8 }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Base URL:</Text>
                    </div>
                    <Text code style={{ fontSize: 12 }}>{prov.baseUrl}</Text>
                    <div style={{ marginTop: 12 }}>
                      <Tag color="blue">{prov.credentialsCount} Credentials Configured</Tag>
                    </div>
                  </div>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title="Add New AI Provider"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddProvider} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Provider Name"
            rules={[{ required: true, message: 'Please enter provider name' }]}
          >
            <Input placeholder="e.g. Anthropic Production" />
          </Form.Item>

          <Form.Item
            name="baseUrl"
            label="Base URL Endpoint"
            rules={[{ required: true, message: 'Please enter base URL' }]}
          >
            <Input placeholder="e.g. https://api.anthropic.com" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Save Provider
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
