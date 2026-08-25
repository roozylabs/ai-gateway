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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  RobotOutlined,
  LockOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import {
  ApiAgent,
  ApiCreateAgentRequest,
  apiGetAgents,
  apiCreateAgent,
  apiUpdateAgent,
  apiDeleteAgent,
  apiGetAllModels,
  apiGetTools,
} from '@/lib/api';

const { Text, Paragraph } = Typography;
const { Option } = Select;

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<ApiAgent | null>(null);
  const [inspectAgent, setInspectAgent] = useState<ApiAgent | null>(null);
  const [form] = Form.useForm();

  const { data: agents, isLoading } = useQuery<ApiAgent[]>({
    queryKey: ['agents'],
    queryFn: apiGetAgents,
  });

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
      agentType: 'developer',
      enabled: true,
      allowedModels: ['gpt-4o', 'claude-sonnet'],
      allowedTools: ['search_web'],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (agent: ApiAgent) => {
    setEditingAgent(agent);
    form.setFieldsValue({
      name: agent.name,
      displayName: agent.displayName,
      description: agent.description,
      agentType: agent.agentType,
      systemPromptOverride: agent.systemPromptOverride,
      allowedModels: agent.allowedModels,
      allowedTools: agent.allowedTools,
      allowedResources: agent.allowedResources,
      enabled: agent.enabled,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingAgent) {
        updateMutation.mutate({ id: editingAgent.id, values });
      } else {
        createMutation.mutate(values);
      }
    } catch (e) {
      // validation error
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
            <Tag color="blue">{record.name}</Tag>
            <Tag color="purple">{record.agentType || 'general'}</Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description || 'No description provided.'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Allowed Models',
      dataIndex: 'allowedModels',
      key: 'allowedModels',
      render: (models: string[]) => (
        <Space wrap>
          {models && models.length > 0 ? (
            models.map((m) => <Tag key={m} color="cyan">{m}</Tag>)
          ) : (
            <Tag color="default">All Models (*)</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Allowed Tools',
      dataIndex: 'allowedTools',
      key: 'allowedTools',
      render: (tools: string[]) => (
        <Space wrap>
          {tools && tools.length > 0 ? (
            tools.map((t) => <Tag key={t} color="orange">{t}</Tag>)
          ) : (
            <Tag color="default">All Tools (*)</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Governance Status',
      key: 'enabled',
      width: 130,
      render: (_: any, record: ApiAgent) => (
        <Badge
          status={record.enabled ? 'success' : 'default'}
          text={record.enabled ? 'Enforced' : 'Disabled'}
        />
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
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <RobotOutlined style={{ color: '#1677ff' }} />
            <span>Agent Gateway & Infrastructure</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            Register Agent Identity
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={agents || []}
          columns={columns}
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: 'No agents registered yet. Click "Register Agent Identity" to set up governance rules.' }}
        />
      </Card>

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
              <Option value="researcher">Research & Data Analytics</Option>
              <Option value="finance">Finance & ERP Operations</Option>
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
              {availableModels?.map((m) => {
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
              {availableTools?.map((t) => (
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
