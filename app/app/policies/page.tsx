'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
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
  Tooltip,
  message,
} from 'antd';
import {
  BranchesOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  StarOutlined,
  AimOutlined,
} from '@ant-design/icons';
import {
  PageHeader,
  DataTable,
  ConfirmButton,
} from '@/components/atoms';
import {
  ApiRoutingPolicy,
  apiGetPolicies,
  apiCreatePolicy,
  apiUpdatePolicy,
  apiDeletePolicy,
} from '@/lib/api';

const { Text, Title, Paragraph } = Typography;

export default function PoliciesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ApiRoutingPolicy | null>(null);
  const [form] = Form.useForm();

  const [taskMatchVal, setTaskMatchVal] = useState(35);
  const [qualityVal, setQualityVal] = useState(35);
  const [costVal, setCostVal] = useState(15);
  const [speedVal, setSpeedVal] = useState(15);

  // Queries
  const { data: policiesData, isLoading: policiesLoading } = useQuery<ApiRoutingPolicy[]>({
    queryKey: ['policies'],
    queryFn: apiGetPolicies,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: Partial<ApiRoutingPolicy>) => apiCreatePolicy(values),
    onSuccess: () => {
      message.success('Routing Policy created');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
    onError: (err: Error) => {
      message.error(err.message || 'Failed to create policy');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApiRoutingPolicy> }) => apiUpdatePolicy(id, data),
    onSuccess: () => {
      message.success('Routing Policy updated');
      setEditingPolicy(null);
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
    onError: (err: Error) => {
      message.error(err.message || 'Failed to update policy');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeletePolicy(id),
    onSuccess: () => {
      message.success('Routing Policy deleted');
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
    onError: (err: Error) => {
      message.error(err.message || 'Failed to delete policy');
    },
  });

  const handleOpenAdd = () => {
    setEditingPolicy(null);
    form.resetFields();
    setTaskMatchVal(35);
    setQualityVal(35);
    setCostVal(15);
    setSpeedVal(15);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (policy: ApiRoutingPolicy) => {
    setEditingPolicy(policy);
    const tm = Math.round((policy.weights?.task_match || 0.35) * 100);
    const q = Math.round((policy.weights?.quality || 0.35) * 100);
    const c = Math.round((policy.weights?.cost || 0.15) * 100);
    const s = Math.round((policy.weights?.speed || 0.15) * 100);

    form.setFieldsValue({
      name: policy.name,
      taskMatch: tm,
      quality: q,
      cost: c,
      speed: s,
      maxCostPerRequest: policy.constraints?.max_cost_per_request || 0.05,
      enabled: policy.enabled,
    });

    setTaskMatchVal(tm);
    setQualityVal(q);
    setCostVal(c);
    setSpeedVal(s);
  };

  const handleSubmit = (values: any) => {
    const payload: Partial<ApiRoutingPolicy> = {
      name: values.name,
      weights: {
        task_match: (values.taskMatch || 35) / 100,
        quality: (values.quality || 35) / 100,
        cost: (values.cost || 15) / 100,
        speed: (values.speed || 15) / 100,
      },
      constraints: {
        max_cost_per_request: values.maxCostPerRequest || 0.05,
      },
      enabled: values.enabled ?? true,
    };

    if (editingPolicy) {
      updateMutation.mutate({ id: editingPolicy.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const totalWeight = taskMatchVal + qualityVal + costVal + speedVal;

  const columns = [
    {
      title: 'Policy Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ApiRoutingPolicy) => (
        <Space>
          <Text strong>{name}</Text>
          {name === 'balanced' && <Tag color="blue">Default</Tag>}
          {!record.enabled && <Tag color="default">Disabled</Tag>}
        </Space>
      ),
    },
    {
      title: 'Weights Distribution',
      key: 'weights',
      render: (_: any, record: ApiRoutingPolicy) => {
        const tm = Math.round((record.weights?.task_match || 0) * 100);
        const q = Math.round((record.weights?.quality || 0) * 100);
        const c = Math.round((record.weights?.cost || 0) * 100);
        const s = Math.round((record.weights?.speed || 0) * 100);

        return (
          <Space wrap size="small">
            <Tooltip title="Task Match Weight">
              <Tag icon={<AimOutlined />} color="purple">Task: {tm}%</Tag>
            </Tooltip>
            <Tooltip title="Quality Weight">
              <Tag icon={<StarOutlined />} color="gold">Quality: {q}%</Tag>
            </Tooltip>
            <Tooltip title="Cost Optimization Weight">
              <Tag icon={<DollarOutlined />} color="green">Cost: {c}%</Tag>
            </Tooltip>
            <Tooltip title="Speed Weight">
              <Tag icon={<ThunderboltOutlined />} color="cyan">Speed: {s}%</Tag>
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: 'Max Cost / Request',
      key: 'maxCost',
      render: (_: any, record: ApiRoutingPolicy) => (
        <Text code>${(record.constraints?.max_cost_per_request || 0.05).toFixed(4)}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ApiRoutingPolicy) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)}>
            Edit
          </Button>
          <ConfirmButton
            confirmTitle="Delete Policy"
            confirmDescription={`Are you sure you want to delete policy "${record.name}"?`}
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

  return (
    <div>
      <PageHeader
        title="Routing Policies"
        description="Configure scoring weights (Task Match, Quality, Cost, Speed) and max request cost constraints for Roozy Auto Smart Routing"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            Add Policy
          </Button>
        }
      />

      <DataTable<ApiRoutingPolicy>
        dataSource={policiesData || []}
        columns={columns}
        loading={policiesLoading}
        rowKey="id"
        searchPlaceholder="Search routing policies..."
      />

      {/* Create / Edit Modal */}
      <Modal
        title={editingPolicy ? 'Edit Routing Policy' : 'Add New Routing Policy'}
        open={isModalOpen || !!editingPolicy}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingPolicy(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
          initialValues={{
            taskMatch: 35,
            quality: 35,
            cost: 15,
            speed: 15,
            maxCostPerRequest: 0.05,
            enabled: true,
          }}
        >
          <Form.Item
            name="name"
            label="Policy Name"
            rules={[{ required: true, message: 'Please enter policy name' }]}
          >
            <Input placeholder="e.g. cheap / balanced / quality" />
          </Form.Item>

          <Card
            title={
              <Space>
                <BranchesOutlined color="#1677ff" />
                <span>Scoring Weights (Total: {totalWeight}%)</span>
                {totalWeight === 100 ? (
                  <Tag color="success">Valid (100%)</Tag>
                ) : (
                  <Tag color="warning">Total should be 100%</Tag>
                )}
              </Space>
            }
            size="small"
            style={{ marginBottom: 20 }}
          >
            <Form.Item name="taskMatch" label={`Task Match Weight (${taskMatchVal}%)`}>
              <Slider
                min={0}
                max={100}
                onChange={(v) => setTaskMatchVal(v)}
                marks={{ 0: '0%', 35: '35%', 100: '100%' }}
              />
            </Form.Item>

            <Form.Item name="quality" label={`Quality Score Weight (${qualityVal}%)`}>
              <Slider
                min={0}
                max={100}
                onChange={(v) => setQualityVal(v)}
                marks={{ 0: '0%', 35: '35%', 100: '100%' }}
              />
            </Form.Item>

            <Form.Item name="cost" label={`Cost Weight (${costVal}%)`}>
              <Slider
                min={0}
                max={100}
                onChange={(v) => setCostVal(v)}
                marks={{ 0: '0%', 15: '15%', 100: '100%' }}
              />
            </Form.Item>

            <Form.Item name="speed" label={`Speed Weight (${speedVal}%)`}>
              <Slider
                min={0}
                max={100}
                onChange={(v) => setSpeedVal(v)}
                marks={{ 0: '0%', 15: '15%', 100: '100%' }}
              />
            </Form.Item>
          </Card>

          <Form.Item
            name="maxCostPerRequest"
            label="Max Cost Constraint Per Request ($ USD)"
            tooltip="Upper bound on estimated cost per request. Models exceeding this cost will be filtered out."
            rules={[{ required: true, message: 'Please enter max cost' }]}
          >
            <InputNumber min={0.0001} max={1.0} step={0.005} style={{ width: '100%' }} placeholder="0.05" />
          </Form.Item>

          <Form.Item name="enabled" label="Enabled" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setIsModalOpen(false); setEditingPolicy(null); }}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingPolicy ? 'Save Changes' : 'Create Policy'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
