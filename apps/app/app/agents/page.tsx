'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Tag,
  Switch,
  Select,
  Typography,
  Popconfirm,
  message,
  Drawer,
  Badge,
  Descriptions,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  RobotOutlined,
  LockOutlined,
  CodeOutlined,
  AppstoreAddOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  ApiAgent,
  ApiCreateAgentRequest,
  ApiAgentTemplate,
  apiGetAgents,
  apiCreateAgent,
  apiUpdateAgent,
  apiDeleteAgent,
  apiGetAllModels,
  apiGetTools,
  apiGetAgentTemplates,
  apiInstantiateAgentTemplate,
} from '@/lib/api';

const { Text, Paragraph, Title } = Typography;
const { Option } = Select;

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<ApiAgent | null>(null);
  const [inspectAgent, setInspectAgent] = useState<ApiAgent | null>(null);
  const [form] = Form.useForm();

  // Queries
  const { data: agents, isLoading } = useQuery<ApiAgent[]>({
    queryKey: ['agents'],
    queryFn: apiGetAgents,
  });

  const { data: templatesRes, isLoading: isTemplatesLoading } = useQuery({
    queryKey: ['agent-templates'],
    queryFn: apiGetAgentTemplates,
  });
  const templates = templatesRes?.data || [];

  const { data: modelsRes } = useQuery({
    queryKey: ['models'],
    queryFn: apiGetAllModels,
  });
  const availableModels = Array.isArray(modelsRes) ? modelsRes : (modelsRes?.data || []);

  const { data: toolsRes } = useQuery({
    queryKey: ['tools'],
    queryFn: apiGetTools,
  });
  const availableTools = Array.isArray(toolsRes) ? toolsRes : [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: ApiCreateAgentRequest) => apiCreateAgent(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setIsModalOpen(false);
      form.resetFields();
      message.success('Agent registered successfully');
    },
    onError: (err: any) => message.error(err.message || 'Failed to register agent'),
  });

  const instantiateMutation = useMutation({
    mutationFn: (tmplId: string) => apiInstantiateAgentTemplate(tmplId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setIsTemplateModalOpen(false);
      message.success(`Instantiated agent "${res.agent.displayName || res.agent.name}" from template!`);
    },
    onError: (err: any) => message.error(err.message || 'Failed to instantiate agent template'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ApiCreateAgentRequest }) => apiUpdateAgent(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setIsModalOpen(false);
      setEditingAgent(null);
      form.resetFields();
      message.success('Agent updated successfully');
    },
    onError: (err: any) => message.error(err.message || 'Failed to update agent'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      message.success('Agent registration removed');
    },
    onError: (err: any) => message.error(err.message || 'Failed to remove agent'),
  });

  const handleOpenAdd = () => {
    setEditingAgent(null);
    form.resetFields();
    form.setFieldsValue({
      enabled: true,
      agentType: 'developer',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: ApiAgent) => {
    setEditingAgent(record);
    form.setFieldsValue({
      name: record.name,
      displayName: record.displayName,
      agentType: record.agentType,
      description: record.description,
      systemPromptOverride: record.systemPromptOverride,
      allowedModels: record.allowedModels,
      allowedTools: record.allowedTools,
      enabled: record.enabled,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingAgent) {
      updateMutation.mutate({ id: editingAgent.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    {
      title: 'Agent Identity',
      key: 'name',
      render: (_: any, record: ApiAgent) => (
        <Space direction="vertical" size={2}>
          <Space>
            <Text strong style={{ fontSize: 15 }}>{record.displayName || record.name}</Text>
            <Tag color="purple" style={{ fontFamily: 'monospace' }}>{record.name}</Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: 13 }}>{record.description || 'No description'}</Text>
        </Space>
      ),
    },
    {
      title: 'Specialty / Category',
      dataIndex: 'agentType',
      key: 'agentType',
      render: (type: string) => (
        <Tag color="geekblue">{type?.toUpperCase() || 'GENERAL'}</Tag>
      ),
    },
    {
      title: 'Governance Rules',
      key: 'rules',
      render: (_: any, record: ApiAgent) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: 12 }}>
            Models: {record.allowedModels && record.allowedModels.length > 0 ? (
              record.allowedModels.map((m) => <Tag key={m} color="cyan" style={{ fontSize: 10 }}>{m}</Tag>)
            ) : <Tag color="default" style={{ fontSize: 10 }}>All (*)</Tag>}
          </Text>
          <Text style={{ fontSize: 12 }}>
            Tools: {record.allowedTools && record.allowedTools.length > 0 ? (
              record.allowedTools.map((t) => <Tag key={t} color="orange" style={{ fontSize: 10 }}>{t}</Tag>)
            ) : <Tag color="default" style={{ fontSize: 10 }}>All (*)</Tag>}
          </Text>
        </Space>
      ),
    },
    {
      title: 'State',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean) => (
        <Badge status={enabled ? 'success' : 'error'} text={enabled ? 'Enforced' : 'Disabled'} />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: any, record: ApiAgent) => (
        <Space>
          <Button size="small" icon={<RobotOutlined />} onClick={() => setInspectAgent(record)}>
            Inspect
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
          <Popconfirm
            title="Remove Agent Registration?"
            description="Are you sure you want to remove this agent governance identity?"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <RobotOutlined style={{ color: '#8B5CF6' }} />
            <span>Agent Gateway & Infrastructure</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<AppstoreAddOutlined />} onClick={() => setIsTemplateModalOpen(true)}>
              1-Click Role Templates
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
              Register Agent Identity
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          dataSource={agents || []}
          columns={columns}
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: 'No agents registered yet. Click "1-Click Role Templates" or "Register Agent Identity".' }}
        />
      </Card>

      {/* 1-Click Role Templates Modal */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#8B5CF6' }} />
            <span>1-Click Agent Role Templates</span>
          </Space>
        }
        open={isTemplateModalOpen}
        onCancel={() => setIsTemplateModalOpen(false)}
        footer={null}
        width={760}
      >
        <Paragraph type="secondary">
          Instantiate a fully configured agent role with pre-set model permissions, tool boundaries, resource rules, and budget limits.
        </Paragraph>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 16, marginTop: 16 }}>
          {templates.map((tmpl) => (
            <Card
              key={tmpl.id}
              size="small"
              hoverable
              style={{ background: '#0F1115', border: '1px solid #1f242d' }}
              title={
                <Space>
                  <Text strong style={{ color: '#fff' }}>{tmpl.name}</Text>
                  {tmpl.isPreset && <Tag color="purple">Preset Role</Tag>}
                </Space>
              }
            >
              <Paragraph type="secondary" style={{ fontSize: 13, minHeight: 38 }}>
                {tmpl.description}
              </Paragraph>
              <div style={{ margin: '8px 0', fontSize: 12 }}>
                <Text type="secondary">Budget Cap: </Text>
                <Tag color="green">${((tmpl.maxBudgetCents || 5000) / 100).toFixed(2)}/mo</Tag>
              </div>
              <Button
                type="primary"
                block
                icon={<PlusOutlined />}
                loading={instantiateMutation.isPending}
                onClick={() => instantiateMutation.mutate(tmpl.id)}
                style={{ marginTop: 8 }}
              >
                Instantiate Agent 1-Click
              </Button>
            </Card>
          ))}
        </div>
      </Modal>

      {/* Add / Edit Agent Modal */}
      <Modal
        title={editingAgent ? 'Edit Agent Governance' : 'Register New Agent Identity'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={650}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Agent ID / Slug"
            rules={[
              { required: true, message: 'Please input agent name slug' },
              { pattern: /^[a-z0-9-_]+$/, message: 'Use lowercase letters, numbers, and hyphens' },
            ]}
          >
            <Input placeholder="e.g. dev-agent, research-agent, finance-bot" disabled={!!editingAgent} />
          </Form.Item>

          <Form.Item name="displayName" label="Display Name">
            <Input placeholder="e.g. Senior Developer Agent" />
          </Form.Item>

          <Form.Item name="agentType" label="Agent Specialty / Category">
            <Select>
              <Option value="developer">Developer & Coding</Option>
              <Option value="devops">DevOps & Infrastructure</Option>
              <Option value="qa">QA Automation & Testing</Option>
              <Option value="analyst">Research & Data Analytics</Option>
              <Option value="general">General Purpose Assistant</Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Explain the purpose and boundaries of this agent..." />
          </Form.Item>

          <Form.Item name="systemPromptOverride" label="System Prompt Override (Optional Guardrails)">
            <Input.TextArea
              rows={3}
              placeholder="e.g. You are a senior security engineer. Never expose unencrypted secrets or execute destructive database commands."
            />
          </Form.Item>

          <Form.Item name="allowedModels" label="Permitted Models (Governance Restriction)">
            <Select mode="tags" placeholder="Select or type allowed model slugs (e.g. gpt-4o, claude-sonnet)">
              {availableModels?.map((m: any) => {
                const slug = m.slug || m.name;
                return (
                  <Option key={slug} value={slug}>
                    {m.displayName || m.name || slug}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>

          <Form.Item name="allowedTools" label="Permitted External Tools">
            <Select mode="tags" placeholder="Select or type permitted tool names (e.g. search_web, execute_code)">
              {availableTools?.map((t: any) => (
                <Option key={t.name} value={t.name}>
                  {t.displayName || t.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="enabled" label="Governance Active State" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Inspect Agent Governance Drawer */}
      <Drawer
        title={inspectAgent ? `Governance Details: ${inspectAgent.displayName || inspectAgent.name}` : 'Agent Governance'}
        placement="right"
        width={500}
        open={!!inspectAgent}
        onClose={() => setInspectAgent(null)}
      >
        {inspectAgent && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Agent Slug">{inspectAgent.name}</Descriptions.Item>
              <Descriptions.Item label="Category">{inspectAgent.agentType}</Descriptions.Item>
              <Descriptions.Item label="Governance State">
                <Tag color={inspectAgent.enabled ? 'green' : 'red'}>
                  {inspectAgent.enabled ? 'ACTIVE ENFORCED' : 'DISABLED'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Client Authentication Header">
                <Text code>X-Prism-Agent-ID: {inspectAgent.name}</Text>
              </Descriptions.Item>
            </Descriptions>

            <Card title="System Prompt Guardrail" size="small">
              <Paragraph style={{ margin: 0, fontFamily: 'monospace', fontSize: 12 }}>
                {inspectAgent.systemPromptOverride || 'No system prompt override specified.'}
              </Paragraph>
            </Card>

            <Card title="Model Governance" size="small">
              <Space wrap>
                {inspectAgent.allowedModels && inspectAgent.allowedModels.length > 0 ? (
                  inspectAgent.allowedModels.map((m) => <Tag key={m} color="cyan">{m}</Tag>)
                ) : (
                  <Text type="secondary">All gateway models accessible (*)</Text>
                )}
              </Space>
            </Card>

            <Card title="Tool Governance" size="small">
              <Space wrap>
                {inspectAgent.allowedTools && inspectAgent.allowedTools.length > 0 ? (
                  inspectAgent.allowedTools.map((t) => <Tag key={t} color="orange">{t}</Tag>)
                ) : (
                  <Text type="secondary">All registered tools accessible (*)</Text>
                )}
              </Space>
            </Card>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
