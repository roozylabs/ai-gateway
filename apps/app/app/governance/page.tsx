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
  InputNumber,
  Badge,
  Alert,
  Descriptions,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
} from '@ant-design/icons';
import {
  ApiGovernancePolicy,
  ApiCreateGovernancePolicyRequest,
  ApiRBACEvaluationRequest,
  ApiRBACEvaluationResult,
  apiGetGovernancePolicies,
  apiCreateGovernancePolicy,
  apiUpdateGovernancePolicy,
  apiDeleteGovernancePolicy,
  apiEvaluateRBAC,
} from '@/lib/api';

const { Text, Paragraph } = Typography;
const { Option } = Select;

export default function GovernancePage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ApiGovernancePolicy | null>(null);
  const [testModal, setTestModal] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<ApiRBACEvaluationResult | null>(null);
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();

  const { data: policies, isLoading } = useQuery<ApiGovernancePolicy[]>({
    queryKey: ['governance-policies'],
    queryFn: apiGetGovernancePolicies,
  });

  const createMutation = useMutation({
    mutationFn: (values: ApiCreateGovernancePolicyRequest) => apiCreateGovernancePolicy(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-policies'] });
      setIsModalOpen(false);
      form.resetFields();
      message.success('Governance policy created');
    },
    onError: (err: any) => message.error(err.message || 'Failed to create governance policy'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ApiCreateGovernancePolicyRequest }) => apiUpdateGovernancePolicy(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-policies'] });
      setIsModalOpen(false);
      setEditingPolicy(null);
      form.resetFields();
      message.success('Governance policy updated');
    },
    onError: (err: any) => message.error(err.message || 'Failed to update governance policy'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteGovernancePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-policies'] });
      message.success('Governance policy removed');
    },
    onError: (err: any) => message.error(err.message || 'Failed to remove governance policy'),
  });

  const evaluateMutation = useMutation({
    mutationFn: (values: ApiRBACEvaluationRequest) => apiEvaluateRBAC(values),
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (err: any) => message.error(err.message || 'Evaluation failed'),
  });

  const handleOpenAdd = () => {
    setEditingPolicy(null);
    form.resetFields();
    form.setFieldsValue({
      role: 'developer',
      effect: 'allow',
      agentPattern: '*',
      modelPattern: '*',
      toolPattern: '*',
      resourcePattern: '*',
      priority: 100,
      enabled: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (policy: ApiGovernancePolicy) => {
    setEditingPolicy(policy);
    form.setFieldsValue({
      name: policy.name,
      description: policy.description,
      role: policy.role,
      effect: policy.effect,
      agentPattern: policy.agentPattern,
      modelPattern: policy.modelPattern,
      toolPattern: policy.toolPattern,
      resourcePattern: policy.resourcePattern,
      priority: policy.priority,
      enabled: policy.enabled,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingPolicy) {
        updateMutation.mutate({ id: editingPolicy.id, values });
      } else {
        createMutation.mutate(values);
      }
    } catch (e) {
      // validation error
    }
  };

  const handleRunTest = async () => {
    try {
      const values = await testForm.validateFields();
      evaluateMutation.mutate(values);
    } catch (e) {
      // validation error
    }
  };

  const columns = [
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (p: number) => <Tag color="geekblue">#{p}</Tag>,
    },
    {
      title: 'Policy Name',
      key: 'name',
      render: (_: any, record: ApiGovernancePolicy) => (
        <Space direction="vertical" size={2}>
          <Space>
            <Text strong style={{ fontSize: 15 }}>{record.name}</Text>
            <Tag color={record.effect === 'deny' ? 'red' : 'green'}>
              {record.effect.toUpperCase()}
            </Tag>
            <Tag color="purple">{record.role}</Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description || 'No description provided.'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Declarative Match Rules',
      key: 'patterns',
      render: (_: any, record: ApiGovernancePolicy) => (
        <Space direction="vertical" size={1} style={{ fontSize: 12 }}>
          <Text type="secondary">Agent: <Text code>{record.agentPattern}</Text></Text>
          <Text type="secondary">Model: <Text code>{record.modelPattern}</Text></Text>
          <Text type="secondary">Tool: <Text code>{record.toolPattern}</Text></Text>
          <Text type="secondary">Resource: <Text code>{record.resourcePattern}</Text></Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'enabled',
      width: 110,
      render: (_: any, record: ApiGovernancePolicy) => (
        <Badge
          status={record.enabled ? 'success' : 'default'}
          text={record.enabled ? 'Active' : 'Disabled'}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: any, record: ApiGovernancePolicy) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
          <Popconfirm
            title="Remove Governance Policy?"
            description="Are you sure you want to remove this declarative security rule?"
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
            <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
            <span>Enterprise Identity, Permissions & Governance (RBAC)</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<PlayCircleOutlined />} onClick={() => { setTestResult(null); testForm.resetFields(); setTestModal(true); }}>
              Test Policy Engine
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
              Create Policy Rule
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          dataSource={policies || []}
          columns={columns}
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: 'No governance policies created yet. Click "Create Policy Rule" to set up enterprise security policies.' }}
        />
      </Card>

      {/* Add / Edit Governance Policy Modal */}
      <Modal
        title={editingPolicy ? 'Edit Governance Policy' : 'Create Enterprise Governance Policy'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={650}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="name" label="Policy Name" rules={[{ required: true, message: 'Please input policy name' }]}>
                <Input placeholder="e.g. Deny Developer Cross-Domain Payroll Access" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priority" label="Priority (Lower = Evaluated First)" rules={[{ required: true }]}>
                <InputNumber min={1} max={999} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="role" label="Role Scope" rules={[{ required: true }]}>
                <Select>
                  <Option value="developer">Developer</Option>
                  <Option value="finance">Finance & ERP</Option>
                  <Option value="auditor">Auditor & Compliance</Option>
                  <Option value="admin">Administrator (*)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="effect" label="Policy Effect" rules={[{ required: true }]}>
                <Select>
                  <Option value="allow">ALLOW (Permit Execution)</Option>
                  <Option value="deny">DENY (Strict Prohibition)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Explain the rationale and security scope for this policy..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="agentPattern" label="Agent Pattern Match" rules={[{ required: true }]}>
                <Input placeholder="* or dev-* or research-agent" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="modelPattern" label="Model Pattern Match" rules={[{ required: true }]}>
                <Input placeholder="* or gpt-4o or claude-*" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="toolPattern" label="Tool Pattern Match" rules={[{ required: true }]}>
                <Input placeholder="* or search_web or execute_*" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="resourcePattern" label="Resource Pattern Match" rules={[{ required: true }]}>
                <Input placeholder="* or *payroll* or db_*" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="enabled" label="Policy Enabled State" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Test Policy Engine Modal */}
      <Modal
        title="Test Declarative Policy Engine"
        open={testModal}
        onOk={handleRunTest}
        onCancel={() => setTestModal(false)}
        okText="Evaluate Access Request"
        confirmLoading={evaluateMutation.isPending}
        width={600}
      >
        <Form form={testForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="role" label="Role">
                <Input placeholder="e.g. developer" defaultValue="developer" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="agentName" label="Agent Name">
                <Input placeholder="e.g. dev-agent" defaultValue="dev-agent" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="modelSlug" label="Model Slug">
                <Input placeholder="e.g. gpt-4o" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="toolName" label="Tool Name">
                <Input placeholder="e.g. search_web" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="resourceName" label="Resource Name">
                <Input placeholder="e.g. query_payroll_db" />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {testResult && (
          <Alert
            style={{ marginTop: 16 }}
            type={testResult.allowed ? 'success' : 'error'}
            icon={testResult.allowed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            showIcon
            message={
              <Text strong style={{ fontSize: 16 }}>
                Evaluation Decision: {testResult.allowed ? 'GRANTED (ALLOWED)' : 'PROHIBITED (DENIED)'}
              </Text>
            }
            description={
              <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                <Text>{testResult.reason}</Text>
                {testResult.matchedPolicy && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Matched Policy Rule: <Text strong>{testResult.matchedPolicy.name}</Text> (Priority #{testResult.matchedPolicy.priority})
                  </Text>
                )}
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Evaluated {testResult.evaluatedCount} active policy rules.
                </Text>
              </Space>
            }
          />
        )}
      </Modal>
    </div>
  );
}
