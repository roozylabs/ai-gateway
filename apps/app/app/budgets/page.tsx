'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Progress,
  Space,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Slider,
  Typography,
  Tag,
  Row,
  Col,
  message,
  Tabs,
  Table,
} from 'antd';
import {
  WalletOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import {
  PageHeader,
  DataTable,
  ConfirmButton,
} from '@/components/atoms';
import {
  ApiBudget,
  ApiBudgetStatus,
  apiGetBudgets,
  apiGetBudgetStatus,
  apiCreateBudget,
  apiUpdateBudget,
  apiDeleteBudget,
  apiGetQuotas,
  apiUpdateQuota,
  ApiTenantQuota,
} from '@/lib/api';
import { PermissionGuard } from '@/components/PermissionProvider';

const { Text, Title, Paragraph } = Typography;

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'budgets' | 'quotas'>('budgets');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<ApiBudget | null>(null);
  const [editingQuota, setEditingQuota] = useState<ApiTenantQuota | null>(null);
  const [form] = Form.useForm();
  const [quotaForm] = Form.useForm();
  const [warningVal, setWarningVal] = useState(80);
  const [criticalVal, setCriticalVal] = useState(90);

  // Queries
  const { data: budgetsData, isLoading: budgetsLoading } = useQuery<ApiBudget[]>({
    queryKey: ['budgets'],
    queryFn: apiGetBudgets,
  });

  const { data: statusData, isLoading: statusLoading } = useQuery<ApiBudgetStatus>({
    queryKey: ['budget-status'],
    queryFn: apiGetBudgetStatus,
  });

  const { data: quotasData, isLoading: quotasLoading } = useQuery({
    queryKey: ['tenant-quotas'],
    queryFn: apiGetQuotas,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: Partial<ApiBudget>) => apiCreateBudget(values),
    onSuccess: () => {
      message.success('Budget created successfully');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-status'] });
    },
    onError: (err: Error) => {
      message.error(err.message || 'Failed to create budget');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApiBudget> }) => apiUpdateBudget(id, data),
    onSuccess: () => {
      message.success('Budget updated successfully');
      setEditingBudget(null);
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-status'] });
    },
    onError: (err: Error) => {
      message.error(err.message || 'Failed to update budget');
    },
  });

  const updateQuotaMutation = useMutation({
    mutationFn: ({ type, id, data }: { type: string; id: string; data: Partial<ApiTenantQuota> }) =>
      apiUpdateQuota(type, id, data),
    onSuccess: () => {
      message.success('Tenant quota limit updated successfully');
      setEditingQuota(null);
      queryClient.invalidateQueries({ queryKey: ['tenant-quotas'] });
    },
    onError: (err: Error) => {
      message.error(err.message || 'Failed to update quota limit');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteBudget(id),
    onSuccess: () => {
      message.success('Budget deleted');
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-status'] });
    },
    onError: (err: Error) => {
      message.error(err.message || 'Failed to delete budget');
    },
  });

  const handleOpenAdd = () => {
    setEditingBudget(null);
    form.resetFields();
    setWarningVal(80);
    setCriticalVal(90);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (budget: ApiBudget) => {
    setEditingBudget(budget);
    form.setFieldsValue({
      name: budget.name,
      monthlyLimit: budget.monthlyLimit,
      dailyLimit: budget.dailyLimit,
      hardLimit: budget.hardLimit,
      warningThreshold: Math.round((budget.warningThreshold || 0.8) * 100),
      criticalThreshold: Math.round((budget.criticalThreshold || 0.9) * 100),
      enabled: budget.enabled,
    });
    setWarningVal(Math.round((budget.warningThreshold || 0.8) * 100));
    setCriticalVal(Math.round((budget.criticalThreshold || 0.9) * 100));
  };

  const handleOpenEditQuota = (quota: ApiTenantQuota) => {
    setEditingQuota(quota);
    quotaForm.setFieldsValue({
      monthlySpendLimitUsd: quota.monthlySpendLimitUsd,
      dailySpendLimitUsd: quota.dailySpendLimitUsd,
      dailyRequestLimit: quota.dailyRequestLimit,
      maxConcurrentStreams: quota.maxConcurrentStreams,
    });
  };

  const handleSubmit = (values: any) => {
    const payload: Partial<ApiBudget> = {
      name: values.name,
      monthlyLimit: values.monthlyLimit || 0,
      dailyLimit: values.dailyLimit || 0,
      hardLimit: values.hardLimit ?? true,
      warningThreshold: (values.warningThreshold || 80) / 100,
      criticalThreshold: (values.criticalThreshold || 90) / 100,
      enabled: values.enabled ?? true,
    };

    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleQuotaSubmit = (values: any) => {
    if (!editingQuota) return;
    updateQuotaMutation.mutate({
      type: editingQuota.targetType,
      id: editingQuota.targetId,
      data: values,
    });
  };

  // Status Badge Helper
  const renderStatusTag = (status?: string) => {
    switch (status) {
      case 'healthy':
        return <Tag icon={<CheckCircleOutlined />} color="success">Healthy</Tag>;
      case 'warning':
        return <Tag icon={<WarningOutlined />} color="warning">Warning</Tag>;
      case 'critical':
        return <Tag icon={<AlertOutlined />} color="error">Critical</Tag>;
      case 'exceeded':
        return <Tag icon={<CloseCircleOutlined />} color="error">Exceeded</Tag>;
      default:
        return <Tag color="default">Unknown</Tag>;
    }
  };

  const columns = [
    {
      title: 'Budget Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ApiBudget) => (
        <Space>
          <Text strong>{name}</Text>
          {!record.enabled && <Tag color="default">Disabled</Tag>}
        </Space>
      ),
    },
    {
      title: 'Monthly Limit',
      dataIndex: 'monthlyLimit',
      key: 'monthlyLimit',
      render: (val: number) => `$${(val || 0).toFixed(2)}`,
    },
    {
      title: 'Daily Limit',
      dataIndex: 'dailyLimit',
      key: 'dailyLimit',
      render: (val: number) => `$${(val || 0).toFixed(2)}`,
    },
    {
      title: 'Hard Limit',
      dataIndex: 'hardLimit',
      key: 'hardLimit',
      render: (val: boolean) => (val ? <Tag color="red">Hard Cutoff</Tag> : <Tag color="orange">Soft Alert</Tag>),
    },
    {
      title: 'Warning / Critical',
      key: 'thresholds',
      render: (_: any, record: ApiBudget) => (
        <Text type="secondary">
          {Math.round((record.warningThreshold || 0.8) * 100)}% / {Math.round((record.criticalThreshold || 0.9) * 100)}%
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ApiBudget) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)}>
            Edit
          </Button>
          <ConfirmButton
            confirmTitle="Delete Budget Rule"
            confirmDescription={`Are you sure you want to delete budget "${record.name}"? Deleting this budget will remove all active daily and monthly spending limits, allowing unrestricted AI requests.`}
            onConfirm={() => deleteMutation.mutate(record.id)}
            danger
            icon={<DeleteOutlined />}
          >
            Delete
          </ConfirmButton>
        </Space>
      ),
    },
  ];

  const columnsQuotas = [
    {
      title: 'Target Scope',
      key: 'target',
      render: (_: any, record: ApiTenantQuota) => (
        <Space>
          <Tag color={record.targetType === 'organization' ? 'purple' : record.targetType === 'workspace' ? 'blue' : 'orange'}>
            {record.targetType.toUpperCase()}
          </Tag>
          <Text strong>{record.targetId}</Text>
        </Space>
      ),
    },
    {
      title: 'Monthly Spend Limit',
      dataIndex: 'monthlySpendLimitUsd',
      key: 'monthlySpendLimitUsd',
      render: (val: number) => <Text strong style={{ color: '#52c41a' }}>${(val || 0).toFixed(2)} USD</Text>,
    },
    {
      title: 'Daily Spend Limit',
      dataIndex: 'dailySpendLimitUsd',
      key: 'dailySpendLimitUsd',
      render: (val: number) => `$${(val || 0).toFixed(2)} USD`,
    },
    {
      title: 'Daily Req Limit',
      dataIndex: 'dailyRequestLimit',
      key: 'dailyRequestLimit',
      render: (val: number) => `${val?.toLocaleString() || 0} reqs`,
    },
    {
      title: 'Max Concurrent Streams',
      dataIndex: 'maxConcurrentStreams',
      key: 'maxConcurrentStreams',
      render: (val: number) => `${val || 0} streams`,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: ApiTenantQuota) => (
        <PermissionGuard permission="org:write" disabledTooltip="Requires org:write permission to update quota limits">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditQuota(record)}>
            Edit Quota
          </Button>
        </PermissionGuard>
      ),
    },
  ];

  const currentStatus = statusData?.status || 'healthy';
  const usagePercent = Math.min(100, Math.round(statusData?.usagePercent || 0));
  const quotas = quotasData?.data || [];

  return (
    <div>
      <PageHeader
        title="Budgets & Multi-Tenant Quotas"
        description="Configure monthly and daily AI expenditure limits, hard cutoffs, and tenant-level quota boundaries"
        extra={
          activeTab === 'budgets' ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
              Add Budget
            </Button>
          ) : null
        }
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as any)}
        items={[
          {
            key: 'budgets',
            label: (
              <span>
                <WalletOutlined /> Global Budgets
              </span>
            ),
            children: (
              <>
                {/* Budget Overview Card */}
                <Card style={{ marginBottom: 24 }} loading={statusLoading}>
                  <Row gutter={[24, 24]} align="middle">
                    <Col xs={24} md={12}>
                      <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                        <WalletOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                        Monthly Budget Consumption
                      </Title>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text type="secondary">Spent / Limit</Text>
                        <Text strong>
                          ${(statusData?.monthlySpent || 0).toFixed(2)} / ${(statusData?.budget?.monthlyLimit || 0).toFixed(2)}
                        </Text>
                      </div>
                      <Progress
                        percent={usagePercent}
                        status={usagePercent >= 90 ? 'exception' : usagePercent >= 75 ? 'active' : 'normal'}
                        strokeColor={usagePercent >= 90 ? '#ff4d4f' : usagePercent >= 75 ? '#faad14' : '#52c41a'}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <Text type="secondary">Remaining: ${(statusData?.monthlyRemaining || 0).toFixed(2)}</Text>
                        {renderStatusTag(currentStatus)}
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                        <AlertOutlined style={{ marginRight: 8, color: '#faad14' }} />
                        Daily Budget Usage
                      </Title>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text type="secondary">Daily Spent / Limit</Text>
                        <Text strong>
                          ${(statusData?.dailySpent || 0).toFixed(2)} / ${(statusData?.budget?.dailyLimit || 0).toFixed(2)}
                        </Text>
                      </div>
                      <Progress
                        percent={
                          statusData?.budget?.dailyLimit
                            ? Math.min(100, Math.round(((statusData?.dailySpent || 0) / statusData.budget.dailyLimit) * 100))
                            : 0
                        }
                        strokeColor="#1677ff"
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <Text type="secondary">Daily Remaining: ${(statusData?.dailyRemaining || 0).toFixed(2)}</Text>
                        <Text type="secondary">Resets daily at 00:00 UTC</Text>
                      </div>
                    </Col>
                  </Row>
                </Card>

                {/* Budget Rules Table */}
                <DataTable<ApiBudget>
                  dataSource={budgetsData || []}
                  columns={columns}
                  loading={budgetsLoading}
                  rowKey="id"
                  searchPlaceholder="Search budget rules..."
                />
              </>
            ),
          },
          {
            key: 'quotas',
            label: (
              <span>
                <ClusterOutlined /> Multi-Tenant Quotas
              </span>
            ),
            children: (
              <Card title="Multi-Tenant Quota & Limit Enforcement">
                <Table
                  rowKey="id"
                  dataSource={quotas}
                  columns={columnsQuotas}
                  loading={quotasLoading}
                  pagination={false}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Create / Edit Budget Modal */}
      <Modal
        title={editingBudget ? 'Edit Budget' : 'Add New Budget'}
        open={isModalOpen || !!editingBudget}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingBudget(null);
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
          initialValues={{
            hardLimit: true,
            enabled: true,
            warningThreshold: 80,
            criticalThreshold: 90,
          }}
        >
          <Form.Item
            name="name"
            label="Budget Name"
            rules={[{ required: true, message: 'Please enter budget name' }]}
          >
            <Input placeholder="e.g. Monthly Standard Cap" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="monthlyLimit"
                label="Monthly Limit ($ USD)"
                rules={[{ required: true, message: 'Enter monthly limit' }]}
              >
                <InputNumber min={0} step={10} style={{ width: '100%' }} placeholder="100.00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dailyLimit"
                label="Daily Limit ($ USD)"
                rules={[{ required: true, message: 'Enter daily limit' }]}
              >
                <InputNumber min={0} step={1} style={{ width: '100%' }} placeholder="10.00" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="hardLimit"
            label="Enforce Hard Cutoff"
            valuePropName="checked"
            tooltip="If enabled, AI Gateway will block requests when limit is exceeded. If disabled, soft warning is logged."
          >
            <Switch />
          </Form.Item>

          <Form.Item name="warningThreshold" label={`Warning Alert Threshold (${warningVal}%)`}>
            <Slider
              min={50}
              max={95}
              onChange={(val) => setWarningVal(val)}
              marks={{ 50: '50%', 80: '80%', 95: '95%' }}
            />
          </Form.Item>

          <Form.Item name="criticalThreshold" label={`Critical Alert Threshold (${criticalVal}%)`}>
            <Slider
              min={70}
              max={100}
              onChange={(val) => setCriticalVal(val)}
              marks={{ 70: '70%', 90: '90%', 100: '100%' }}
            />
          </Form.Item>

          <Form.Item name="enabled" label="Enabled" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setIsModalOpen(false); setEditingBudget(null); }}>
                Cancel
              </Button>

              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingBudget ? 'Save Changes' : 'Create Budget'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Quota Limit Modal */}
      <Modal
        title={`Edit Quota (${editingQuota?.targetType.toUpperCase()}: ${editingQuota?.targetId})`}
        open={!!editingQuota}
        onCancel={() => setEditingQuota(null)}
        footer={null}
      >
        <Form form={quotaForm} layout="vertical" onFinish={handleQuotaSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="monthlySpendLimitUsd" label="Monthly Spend Limit ($ USD)" rules={[{ required: true }]}>
            <InputNumber min={0} step={50} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="dailySpendLimitUsd" label="Daily Spend Limit ($ USD)" rules={[{ required: true }]}>
            <InputNumber min={0} step={10} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="dailyRequestLimit" label="Daily Request Limit (Reqs)" rules={[{ required: true }]}>
            <InputNumber min={100} step={1000} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="maxConcurrentStreams" label="Max Concurrent Streams" rules={[{ required: true }]}>
            <InputNumber min={1} max={500} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEditingQuota(null)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={updateQuotaMutation.isPending}>
                Save Quota Limits
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
