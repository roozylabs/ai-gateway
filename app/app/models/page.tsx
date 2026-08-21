'use client';

import React, { useState } from 'react';
import {
  Typography,
  Space,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Slider,
  Tag,
  App,
  Tooltip,
  Card,
  Row,
  Col,
  Collapse,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SyncOutlined,
  SlidersOutlined,
  ToolOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, PageHeader, StatusTag, ConfirmButton } from '@/components/atoms';
import {
  apiGetProviders,
  apiGetModels,
  apiGetActiveStreams,
  apiCreateModel,
  apiUpdateModel,
  apiDeleteModel,
  ApiProvider,
  ApiModel,
} from '@/lib/api';

const { Text } = Typography;

export interface CombinedModel extends ApiModel {
  providerName?: string;
}

export default function ModelsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  // Default to 'all' providers
  const [selectedProviderId, setSelectedProviderId] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<CombinedModel | null>(null);
  const [form] = Form.useForm();

  // Fetch Providers
  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });

  // Fetch Active Streams
  const { data: activeStreamsData } = useQuery({
    queryKey: ['active-streams'],
    queryFn: apiGetActiveStreams,
  });

  // Fetch Models for all or selected provider
  const {
    data: modelsData,
    isLoading: modelsLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['models', selectedProviderId, page, pageSize, searchQuery],
    queryFn: () => apiGetModels(selectedProviderId, { page, limit: pageSize, search: searchQuery || undefined }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: Partial<ApiModel> }) =>
      apiCreateModel(providerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      message.success('Model created');
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (err: Error) => message.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ providerId, modelId, data }: { providerId: string; modelId: string; data: Partial<ApiModel> }) =>
      apiUpdateModel(providerId, modelId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      message.success('Model updated');
      setEditingModel(null);
    },
    onError: (err: Error) => message.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ providerId, modelId }: { providerId: string; modelId: string }) =>
      apiDeleteModel(providerId, modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      message.success('Model deleted');
    },
    onError: (err: any) => message.error(err.response?.data?.error || err.message || 'Failed to delete model'),
  });

  const handleOpenAdd = () => {
    setEditingModel(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (model: CombinedModel) => {
    setEditingModel(model);
    form.setFieldsValue({
      providerId: model.providerId,
      name: model.name,
      slug: model.slug,
      displayName: model.displayName,
      enabled: model.enabled,
      contextWindow: model.contextWindow || 128000,
      codingScore: Math.round((model.codingScore || 0.8) * 100),
      reasoningScore: Math.round((model.reasoningScore || 0.8) * 100),
      writingScore: Math.round((model.writingScore || 0.8) * 100),
      speedScore: Math.round((model.speedScore || 0.8) * 100),
      qualityScore: Math.round((model.qualityScore || 0.8) * 100),
      inputPricePer1M: model.inputPricePer1M || 1.0,
      outputPricePer1M: model.outputPricePer1M || 3.0,
      supportsTools: model.supportsTools ?? true,
      supportsVision: model.supportsVision ?? false,
    });
  };

  const handleSubmit = (values: any) => {
    const targetProviderId = values.providerId;
    if (!targetProviderId) {
      message.error('Please select a target provider');
      return;
    }

    const payload: Partial<ApiModel> = {
      name: values.name,
      slug: values.slug || values.name.toLowerCase().replace(/\s+/g, '-'),
      displayName: values.displayName || values.name,
      enabled: values.enabled ?? true,
      contextWindow: values.contextWindow || 128000,
      codingScore: (values.codingScore || 80) / 100,
      reasoningScore: (values.reasoningScore || 80) / 100,
      writingScore: (values.writingScore || 80) / 100,
      speedScore: (values.speedScore || 80) / 100,
      qualityScore: (values.qualityScore || 80) / 100,
      inputPricePer1M: values.inputPricePer1M || 1.0,
      outputPricePer1M: values.outputPricePer1M || 3.0,
      supportsTools: values.supportsTools ?? true,
      supportsVision: values.supportsVision ?? false,
    };

    if (editingModel) {
      updateMutation.mutate({ providerId: targetProviderId, modelId: editingModel.id, data: payload });
    } else {
      createMutation.mutate({ providerId: targetProviderId, data: payload });
    }
  };

  const columns = React.useMemo(
    () => [
      {
        title: 'Model Slug / Alias',
        dataIndex: 'slug',
        key: 'slug',
        sorter: (a: CombinedModel, b: CombinedModel) => a.slug.localeCompare(b.slug),
        render: (text: string) => (
          <Text code strong>
            {text}
          </Text>
        ),
      },
      {
        title: 'Provider',
        dataIndex: 'providerName',
        key: 'providerName',
        sorter: (a: CombinedModel, b: CombinedModel) =>
          (a.providerName || '').localeCompare(b.providerName || ''),
        render: (name: string) => <Tag color="blue">{name || 'Provider'}</Tag>,
      },
      {
        title: 'Display Name',
        dataIndex: 'displayName',
        key: 'displayName',
        sorter: (a: CombinedModel, b: CombinedModel) =>
          (a.displayName || '').localeCompare(b.displayName || ''),
        render: (text: string) => text || '-',
      },
      {
        title: 'Capabilities & Pricing',
        key: 'capabilities',
        render: (_: any, record: CombinedModel) => (
          <Space wrap size="small">
            {record.supportsTools && (
              <Tooltip title="Supports Function Calling / Tools">
                <Tag icon={<ToolOutlined />} color="purple">Tools</Tag>
              </Tooltip>
            )}
            {record.supportsVision && (
              <Tooltip title="Supports Image / Vision Input">
                <Tag icon={<EyeOutlined />} color="cyan">Vision</Tag>
              </Tooltip>
            )}
            <Text type="secondary" style={{ fontSize: 11 }}>
              ${record.inputPricePer1M || 1}/1M In | ${record.outputPricePer1M || 3}/1M Out
            </Text>
          </Space>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'enabled',
        key: 'enabled',
        sorter: (a: CombinedModel, b: CombinedModel) => Number(a.enabled) - Number(b.enabled),
        render: (enabled: boolean) => <StatusTag status={enabled ? 'active' : 'disabled'} />,
      },
      {
        title: 'Activity',
        key: 'activity',
        render: (_: any, record: CombinedModel) => {
          const count = activeStreamsData?.byModel?.[record.slug] || activeStreamsData?.byModel?.[record.name] || 0;
          if (count > 0) {
            return (
              <Tag color="processing" style={{ borderRadius: 10, fontWeight: 600 }}>
                <SyncOutlined spin style={{ marginRight: 4 }} /> {count} Running
              </Tag>
            );
          }
          return <Tag color="default" style={{ borderRadius: 10 }}> Idle</Tag>;
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: any, record: CombinedModel) => {
          const isRunning = (activeStreamsData?.byModel?.[record.slug] || activeStreamsData?.byModel?.[record.name] || 0) > 0;
          return (
            <Space size="small">
              <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)}>
                Edit
              </Button>

              {isRunning ? (
                <Tooltip title="Cannot delete model: it is currently processing active live streams">
                  <span>
                    <Button type="link" danger disabled icon={<DeleteOutlined />}>
                      Delete
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <ConfirmButton
                  confirmTitle="Delete Model Alias?"
                  onConfirm={() => deleteMutation.mutate({ providerId: record.providerId, modelId: record.id })}
                  icon={<DeleteOutlined />}
                >
                  Delete
                </ConfirmButton>
              )}
            </Space>
          );
        },
      },
    ],
    [deleteMutation, activeStreamsData]
  );

  const extraActions = (
    <Space>
      <Select
        placeholder="Filter by Provider"
        style={{ width: 220 }}
        value={selectedProviderId}
        onChange={(val) => setSelectedProviderId(val)}
        loading={providersLoading}
        options={[
          { label: 'All Providers', value: 'all' },
          ...providers.map((p: ApiProvider) => ({
            label: p.name,
            value: p.id,
          })),
        ]}
      />
    </Space>
  );

  return (
    <div>
      <PageHeader
        title="Models & Routing"
        description="Map client request model aliases to upstream AI Provider models and configure semantic routing capabilities"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            Add Model Alias
          </Button>
        }
      />

      <DataTable
        dataSource={modelsData?.data || []}
        columns={columns}
        loading={modelsLoading || providersLoading}
        rowKey="id"
        searchPlaceholder="Search model alias, display name, or provider..."
        searchValue={searchQuery}
        onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
        extraActions={extraActions}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: modelsData?.total || 0,
          onChange: (p, ps) => {
            setPage(p);
            if (ps && ps !== pageSize) {
              setPageSize(ps);
            }
          },
        }}
      />

      <Modal
        title={editingModel ? 'Edit Model Alias' : 'Add Model Alias'}
        open={isModalOpen || !!editingModel}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingModel(null);
        }}
        footer={null}
        width={650}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            providerId: selectedProviderId !== 'all' ? selectedProviderId : providers[0]?.id,
            enabled: true,
            contextWindow: 128000,
            codingScore: 80,
            reasoningScore: 80,
            writingScore: 80,
            speedScore: 80,
            qualityScore: 80,
            inputPricePer1M: 1.0,
            outputPricePer1M: 3.0,
            supportsTools: true,
            supportsVision: false,
          }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="providerId"
            label="Target Provider"
            rules={[{ required: true, message: 'Please select provider' }]}
          >
            <Select placeholder="Select Provider">
              {providers.map((p: ApiProvider) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Upstream Model Name"
                rules={[{ required: true, message: 'Please enter upstream model name' }]}
              >
                <Input placeholder="e.g. gpt-4o / claude-3-5-sonnet" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="slug"
                label="Client Model Alias (Slug)"
                tooltip="Model name client applications use in API requests"
              >
                <Input placeholder="e.g. gpt-4o" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="displayName" label="Display Name">
            <Input placeholder="e.g. GPT-4o Omni" />
          </Form.Item>

          <Collapse
            style={{ marginBottom: 20 }}
            items={[
              {
                key: 'capabilities',
                label: (
                  <Space>
                    <SlidersOutlined />
                    <span>Semantic Router Capabilities & Pricing (Advanced)</span>
                  </Space>
                ),
                children: (
                  <div>
                    <Form.Item name="contextWindow" label="Context Window (Tokens)">
                      <InputNumber min={1000} max={2000000} step={1000} style={{ width: '100%' }} />
                    </Form.Item>

                    <Title level={5} style={{ fontSize: 13, marginBottom: 8 }}>
                      Benchmark Scores (0% - 100%):
                    </Title>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="codingScore" label="Coding Score">
                          <Slider min={0} max={100} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="reasoningScore" label="Reasoning Score">
                          <Slider min={0} max={100} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="writingScore" label="Writing Score">
                          <Slider min={0} max={100} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="speedScore" label="Speed Score">
                          <Slider min={0} max={100} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Title level={5} style={{ fontSize: 13, marginBottom: 8 }}>
                      Pricing (USD per 1 Million Tokens):
                    </Title>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="inputPricePer1M" label="Input Token Price ($/1M)">
                          <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="outputPricePer1M" label="Output Token Price ($/1M)">
                          <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Space size="large" style={{ marginTop: 8 }}>
                      <Form.Item name="supportsTools" label="Supports Function Calling / Tools" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Form.Item name="supportsVision" label="Supports Image / Vision Input" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Space>
                  </div>
                ),
              },
            ]}
          />

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setIsModalOpen(false); setEditingModel(null); }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingModel ? 'Save Changes' : 'Create Model Alias'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
