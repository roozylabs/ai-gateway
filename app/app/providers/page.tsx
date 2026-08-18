'use client';

import React, { useState } from 'react';
import { Row, Col, Card, Typography, Switch, Button, Tag, Modal, Form, Input, Select, Space, App } from 'antd';
import { PlusOutlined, ApiOutlined, EditOutlined, CheckCircleOutlined, ExclamationCircleOutlined, SyncOutlined, HistoryOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { MOCK_PROVIDERS, Provider, RoutingStrategy } from '@/lib/mock-data';

const { Title, Text } = Typography;

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

function getStrategyDisplay(strategy: RoutingStrategy) {
  const opt = STRATEGY_OPTIONS.find((s) => s.value === strategy);
  if (!opt) return { label: strategy, color: 'default', icon: <SyncOutlined /> };

  const icons: Record<RoutingStrategy, React.ReactNode> = {
    'round-robin': <SyncOutlined />,
    'lru': <HistoryOutlined />,
    'fallback': <NodeIndexOutlined />,
  };

  return { label: opt.label, color: opt.color, icon: icons[strategy] };
}

export default function ProvidersPage() {
  const { message, modal } = App.useApp();
  const [providers, setProviders] = useState<Provider[]>(MOCK_PROVIDERS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [form] = Form.useForm();

  const handleToggle = (prov: Provider, checked: boolean) => {
    if (!checked) {
      if (prov.credentialsCount > 0) {
        modal.confirm({
          title: `Disable Provider "${prov.name}"?`,
          content: `Disabling this provider will temporarily suspend request routing for all associated credentials and model aliases.`,
          okText: 'Disable Provider',
          okButtonProps: { danger: true },
          cancelText: 'Cancel',
          onOk: () => {
            setProviders((prev) =>
              prev.map((p) => (p.id === prov.id ? { ...p, enabled: false } : p))
            );
            message.warning(`Provider "${prov.name}" disabled`);
          },
        });
      } else {
        setProviders((prev) =>
          prev.map((p) => (p.id === prov.id ? { ...p, enabled: false } : p))
        );
        message.warning(`Provider "${prov.name}" disabled`);
      }
    } else {
      setProviders((prev) =>
        prev.map((p) => (p.id === prov.id ? { ...p, enabled: true } : p))
      );
      message.success(`Provider "${prov.name}" enabled`);
    }
  };

  const openAddModal = () => {
    setEditingProvider(null);
    form.resetFields();
    form.setFieldsValue({ routingStrategy: 'round-robin' });
    setIsModalOpen(true);
  };

  const openEditModal = (prov: Provider) => {
    setEditingProvider(prov);
    form.setFieldsValue({
      name: prov.name,
      baseUrl: prov.baseUrl,
      routingStrategy: prov.routingStrategy,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (values: any) => {
    if (editingProvider) {
      // Update existing
      setProviders(
        providers.map((p) =>
          p.id === editingProvider.id
            ? { ...p, name: values.name, baseUrl: values.baseUrl, routingStrategy: values.routingStrategy }
            : p
        )
      );
      message.success('Provider updated successfully');
    } else {
      // Create new
      const newProv: Provider = {
        id: `prov-${Date.now()}`,
        name: values.name,
        code: values.name.toLowerCase().replace(/\s+/g, '-'),
        baseUrl: values.baseUrl,
        enabled: true,
        credentialsCount: 0,
        health: 'healthy',
        routingStrategy: values.routingStrategy || 'round-robin',
      };
      setProviders([...providers, newProv]);
      message.success('New AI Provider added successfully');
    }
    setIsModalOpen(false);
    form.resetFields();
    setEditingProvider(null);
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

        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Add Provider
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {providers.map((prov) => {
          const strategyInfo = getStrategyDisplay(prov.routingStrategy);
          return (
            <Col xs={24} sm={12} lg={8} key={prov.id}>
              <Card
                actions={[
                  <Space key="edit" onClick={() => openEditModal(prov)}>
                    <EditOutlined /> Edit
                  </Space>,
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
                      <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Tag color="blue">{prov.credentialsCount} Credentials</Tag>
                        <Tag color={strategyInfo.color} icon={strategyInfo.icon}>{strategyInfo.label}</Tag>
                      </div>
                    </div>
                  }
                />
              </Card>
            </Col>
          );
        })}
      </Row>

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
            name="baseUrl"
            label="Base URL Endpoint"
            rules={[{ required: true, message: 'Please enter base URL' }]}
          >
            <Input placeholder="e.g. https://api.anthropic.com" />
          </Form.Item>

          <Form.Item
            name="routingStrategy"
            label="Credential Allocation Strategy"
            rules={[{ required: true, message: 'Please select a routing strategy' }]}
            tooltip="Determines how active credentials are selected for incoming API requests to this provider"
          >
            <Select
              placeholder="Select routing strategy"
              options={STRATEGY_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
                description: opt.description,
              }))}
              optionRender={(option) => (
                <div style={{ padding: '2px 0' }}>
                  <Text strong style={{ fontSize: 13, display: 'block' }}>
                    {option.data.label}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1.3 }}>
                    {option.data.description}
                  </Text>
                </div>
              )}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setIsModalOpen(false); setEditingProvider(null); }}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingProvider ? 'Update Provider' : 'Save Provider'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
