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
  InputNumber,
  Typography,
  Popconfirm,
  message,
  Collapse,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  ToolOutlined,
  LinkOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  ApiTool,
  ApiToolWithBackends,
  ApiToolBackend,
  ApiCreateToolRequest,
  ApiToolExecutionResult,
  apiGetTools,
  apiGetTool,
  apiCreateTool,
  apiUpdateTool,
  apiDeleteTool,
  apiTestTool,
} from '@/lib/api';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface ToolFormValues {
  name: string;
  displayName: string;
  description: string;
  inputSchema: string;
  backends: {
    name: string;
    endpointUrl: string;
    authToken?: string;
    timeoutMs: number;
    priority: number;
  }[];
}

const defaultSchema = `{
  "type": "object",
  "properties": {
    "query": { "type": "string", "description": "Search query" }
  },
  "required": ["query"]
}`;

export default function ToolsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ApiToolWithBackends | null>(null);
  const [testModal, setTestModal] = useState<{ tool: ApiTool; args: string } | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: tools, isLoading } = useQuery<ApiTool[]>({
    queryKey: ['tools'],
    queryFn: apiGetTools,
  });

  const createMutation = useMutation({
    mutationFn: (values: ApiCreateToolRequest) => apiCreateTool(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setIsModalOpen(false);
      form.resetFields();
      message.success('Tool created');
    },
    onError: () => message.error('Failed to create tool'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ApiCreateToolRequest }) => apiUpdateTool(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setIsModalOpen(false);
      setEditingTool(null);
      form.resetFields();
      message.success('Tool updated');
    },
    onError: () => message.error('Failed to update tool'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteTool(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      message.success('Tool deleted');
    },
    onError: () => message.error('Failed to delete tool'),
  });

  const testMutation = useMutation({
    mutationFn: ({ id, args }: { id: string; args: Record<string, any> }) => apiTestTool(id, args),
    onSuccess: (result: ApiToolExecutionResult) => setTestResult(result),
    onError: (err: any) => setTestResult({ error: err?.response?.data?.error?.message || err.message }),
  });

  const handleEdit = async (toolId: string) => {
    const twb = await apiGetTool(toolId);
    setEditingTool(twb);
    form.setFieldsValue({
      name: twb.tool.name,
      displayName: twb.tool.displayName,
      description: twb.tool.description,
      inputSchema: JSON.stringify(twb.tool.inputSchema, null, 2),
      backends: twb.backends.map((b: ApiToolBackend) => ({
        name: b.name,
        endpointUrl: b.endpointUrl,
        timeoutMs: b.timeoutMs,
        priority: b.priority,
      })),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then((values: ToolFormValues) => {
      let schema: Record<string, any> = {};
      try {
        schema = JSON.parse(values.inputSchema || '{}');
      } catch {
        message.error('Invalid JSON schema');
        return;
      }
      const payload = {
        name: values.name,
        displayName: values.displayName,
        description: values.description,
        inputSchema: schema,
        backends: (values.backends || []).map((b) => ({
          name: b.name,
          endpointUrl: b.endpointUrl,
          timeoutMs: b.timeoutMs || 30000,
          priority: b.priority || 1,
        })),
      };
      if (editingTool) {
        updateMutation.mutate({ id: editingTool.tool.id, values: payload as ApiCreateToolRequest });
      } else {
        createMutation.mutate(payload as ApiCreateToolRequest);
      }
    });
  };

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_: any, record: ApiTool) => (
        <Space>
          <Text strong>{record.displayName || record.name}</Text>
          {record.displayName && <Text type="secondary">({record.name})</Text>}
        </Space>
      ),
    },
    {
      title: 'Description',
      key: 'description',
      ellipsis: true,
      render: (_: any, record: ApiTool) => (
        <Text type="secondary">{record.description || '—'}</Text>
      ),
    },
    {
      title: 'Backends',
      key: 'backends',
      width: 100,
      render: (_: any, record: ApiTool) => (
        <Badge count={0} showZero>
          <Tag icon={<LinkOutlined />}>—</Tag>
        </Badge>
      ),
    },
    {
      title: 'Status',
      key: 'enabled',
      width: 80,
      render: (_: any, record: ApiTool) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'Active' : 'Disabled'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: any, record: ApiTool) => (
        <Space>
          <Button size="small" icon={<PlayCircleOutlined />} onClick={() => {
            setTestModal({ tool: record, args: '{}' });
            setTestResult(null);
          }}>Test</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record.id)} />
          <Popconfirm title="Delete this tool?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={<Space><ToolOutlined /> Tool Gateway</Space>}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingTool(null);
              form.setFieldsValue({ backends: [{}] });
              setIsModalOpen(true);
            }}
          >
            Add Tool
          </Button>
        }
      >
        <Table
          dataSource={tools || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          expandable={{
            expandedRowRender: (record: ApiTool) => (
              <ToolBackendList toolId={record.id} />
            ),
          }}
        />
      </Card>

      <Modal
        title={editingTool ? 'Edit Tool' : 'Create Tool'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => { setIsModalOpen(false); setEditingTool(null); form.resetFields(); }}
        width={700}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" initialValues={{ backends: [{}] }}>
          <Form.Item name="name" label="Tool Name" rules={[{ required: true }]}>
            <Input disabled={!!editingTool} placeholder="e.g. search_web" />
          </Form.Item>
          <Form.Item name="displayName" label="Display Name">
            <Input placeholder="e.g. Web Search" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="inputSchema" label="Input Schema (JSON)" rules={[{ required: true }]}>
            <Input.TextArea rows={6} style={{ fontFamily: 'monospace' }} defaultValue={defaultSchema} />
          </Form.Item>

          <Form.List name="backends">
            {(fields, { add, remove }) => (
              <div>
                <Paragraph strong>Backends</Paragraph>
                {fields.map((field, index) => (
                  <Card key={field.key} size="small" style={{ marginBottom: 8 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        <Form.Item {...field} name={[field.name, 'name']} rules={[{ required: true }]} style={{ marginBottom: 4 }}>
                          <Input placeholder="Backend name" style={{ width: 150 }} />
                        </Form.Item>
                        <Form.Item {...field} name={[field.name, 'priority']} style={{ marginBottom: 4 }}>
                          <InputNumber placeholder="Priority" min={1} style={{ width: 90 }} />
                        </Form.Item>
                        <Form.Item {...field} name={[field.name, 'timeoutMs']} style={{ marginBottom: 4 }}>
                          <InputNumber placeholder="Timeout ms" min={1000} step={1000} style={{ width: 130 }} />
                        </Form.Item>
                        {fields.length > 1 && (
                          <Button danger size="small" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                        )}
                      </Space>
                      <Form.Item {...field} name={[field.name, 'endpointUrl']} rules={[{ required: true }]} style={{ marginBottom: 4 }}>
                        <Input placeholder="Endpoint URL (e.g. https://api.tavily.com/search)" />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, 'authToken']} style={{ marginBottom: 0 }}>
                        <Input.Password placeholder="Auth Token (optional, stored encrypted)" />
                      </Form.Item>
                    </Space>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>
                  Add Backend
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        title={`Test: ${testModal?.tool?.displayName || testModal?.tool?.name}`}
        open={!!testModal}
        onCancel={() => { setTestModal(null); setTestResult(null); }}
        footer={null}
        width={700}
      >
        <Form layout="vertical">
          <Form.Item label="Arguments (JSON)">
            <Input.TextArea
              rows={4}
              value={testModal?.args || '{}'}
              onChange={(e) => setTestModal(prev => prev ? { ...prev, args: e.target.value } : null)}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={testMutation.isPending}
            onClick={() => {
              if (!testModal) return;
              try {
                const args = JSON.parse(testModal.args);
                testMutation.mutate({ id: testModal.tool.id, args });
              } catch {
                message.error('Invalid JSON');
              }
            }}
          >
            Execute
          </Button>
        </Form>
        {testResult && (
          <Card size="small" style={{ marginTop: 16 }}>
            <Text type={testResult.error ? 'danger' : 'success'}>
              {testResult.error ? `Error: ${testResult.error}` : `Status: ${testResult.statusCode} | Backend: ${testResult.backend} | ${testResult.latencyMs}ms`}
            </Text>
            {!testResult.error && (
              <pre style={{ marginTop: 8, maxHeight: 300, overflow: 'auto', fontSize: 12, background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                {JSON.stringify(testResult.result, null, 2)}
              </pre>
            )}
          </Card>
        )}
      </Modal>
    </div>
  );
}

function ToolBackendList({ toolId }: { toolId: string }) {
  const { data: toolData } = useQuery<ApiToolWithBackends>({
    queryKey: ['tool', toolId],
    queryFn: () => apiGetTool(toolId),
  });

  if (!toolData?.backends?.length) {
    return <Text type="secondary">No backends configured</Text>;
  }

  return (
    <Table
      dataSource={toolData.backends}
      rowKey="id"
      size="small"
      pagination={false}
      columns={[
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Endpoint', dataIndex: 'endpointUrl', key: 'endpointUrl', ellipsis: true },
        { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 80 },
        { title: 'Timeout', key: 'timeout', width: 100, render: (_: any, r: ApiToolBackend) => `${r.timeoutMs}ms` },
        { title: 'Status', key: 'status', width: 80, render: (_: any, r: ApiToolBackend) => (
          <Tag color={r.enabled ? 'green' : 'default'}>{r.enabled ? 'Active' : 'Off'}</Tag>
        )},
      ]}
    />
  );
}
