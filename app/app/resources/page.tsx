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
  Select,
  Typography,
  Popconfirm,
  message,
  Collapse,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  DatabaseOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import {
  ApiResource,
  ApiResourceBackend,
  ApiResourceWithBackends,
  ApiCreateResourceRequest,
  ApiResourceExecutionResult,
  apiGetResources,
  apiGetResource,
  apiCreateResource,
  apiUpdateResource,
  apiDeleteResource,
  apiTestResource,
} from '@/lib/api';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

const defaultParamsSchema = `{
  "type": "object",
  "properties": {
    "id": { "type": "string", "description": "Resource ID" }
  },
  "required": ["id"]
}`;

export default function ResourcesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ApiResourceWithBackends | null>(null);
  const [testModal, setTestModal] = useState<{ resource: ApiResource; args: string } | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: resources, isLoading } = useQuery<ApiResource[]>({
    queryKey: ['resources'],
    queryFn: apiGetResources,
  });

  const createMutation = useMutation({
    mutationFn: (values: ApiCreateResourceRequest) => apiCreateResource(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setIsModalOpen(false);
      form.resetFields();
      message.success('Resource created');
    },
    onError: () => message.error('Failed to create resource'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ApiCreateResourceRequest }) => apiUpdateResource(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setIsModalOpen(false);
      setEditingResource(null);
      form.resetFields();
      message.success('Resource updated');
    },
    onError: () => message.error('Failed to update resource'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteResource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      message.success('Resource deleted');
    },
    onError: () => message.error('Failed to delete resource'),
  });

  const testMutation = useMutation({
    mutationFn: ({ id, args }: { id: string; args: Record<string, any> }) => apiTestResource(id, args),
    onSuccess: (result: ApiResourceExecutionResult) => setTestResult(result),
    onError: (err: any) => setTestResult({ error: err?.response?.data?.error?.message || err.message }),
  });

  const handleEdit = async (resourceId: string) => {
    const rwB = await apiGetResource(resourceId);
    setEditingResource(rwB);
    form.setFieldsValue({
      name: rwB.resource.name,
      displayName: rwB.resource.displayName,
      description: rwB.resource.description,
      parametersSchema: JSON.stringify(rwB.resource.parametersSchema, null, 2),
      backends: rwB.backends.map((b: ApiResourceBackend) => ({
        name: b.name,
        backendType: b.backendType,
        endpointUrl: b.endpointUrl,
        httpMethod: b.httpMethod,
        queryTemplate: b.queryTemplate,
        sqlQuery: b.sqlQuery,
        paramNames: b.paramNames?.join(', '),
        timeoutMs: b.timeoutMs,
        priority: b.priority,
      })),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then((values: any) => {
      let paramsSchema: Record<string, any> = {};
      try {
        paramsSchema = JSON.parse(values.parametersSchema || '{}');
      } catch {
        message.error('Invalid parameters JSON schema');
        return;
      }
      const payload: ApiCreateResourceRequest = {
        name: values.name,
        displayName: values.displayName,
        description: values.description,
        parametersSchema: paramsSchema,
        backends: (values.backends || []).map((b: any) => ({
          name: b.name,
          backendType: b.backendType,
          endpointUrl: b.endpointUrl || undefined,
          httpMethod: b.httpMethod || 'POST',
          queryTemplate: b.queryTemplate || undefined,
          sqlQuery: b.sqlQuery || undefined,
          paramNames: b.paramNames ? b.paramNames.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined,
          timeoutMs: b.timeoutMs || 30000,
          priority: b.priority || 1,
        })),
      };
      if (editingResource) {
        updateMutation.mutate({ id: editingResource.resource.id, values: payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  };

  const backendTypeColors: Record<string, string> = {
    rest: 'green',
    postgres: 'blue',
    graphql: 'purple',
  };

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_: any, record: ApiResource) => (
        <Space>
          <Text strong>{record.displayName || record.name}</Text>
          {record.displayName && <Text type="secondary">({record.name})</Text>}
        </Space>
      ),
    },
    {
      title: 'Type',
      key: 'type',
      width: 120,
      render: (_: any, record: ApiResource) => (
        <Tag color={record.displayName ? 'default' : 'default'}>
          <DatabaseOutlined /> Configured
        </Tag>
      ),
    },
    {
      title: 'Description',
      key: 'description',
      ellipsis: true,
      render: (_: any, record: ApiResource) => (
        <Text type="secondary">{record.description || '—'}</Text>
      ),
    },
    {
      title: 'Status',
      key: 'enabled',
      width: 80,
      render: (_: any, record: ApiResource) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'Active' : 'Disabled'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: any, record: ApiResource) => (
        <Space>
          <Button size="small" icon={<PlayCircleOutlined />} onClick={() => {
            setTestModal({ resource: record, args: '{}' });
            setTestResult(null);
          }}>Test</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record.id)} />
          <Popconfirm title="Delete this resource?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={<Space><DatabaseOutlined /> Resource Gateway</Space>}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingResource(null);
              form.setFieldsValue({ backends: [{}] });
              setIsModalOpen(true);
            }}
          >
            Add Resource
          </Button>
        }
      >
        <Table
          dataSource={resources || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          expandable={{
            expandedRowRender: (record: ApiResource) => (
              <ResourceBackendList resourceId={record.id} />
            ),
          }}
        />
      </Card>

      <Modal
        title={editingResource ? 'Edit Resource' : 'Create Resource'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => { setIsModalOpen(false); setEditingResource(null); form.resetFields(); }}
        width={800}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" initialValues={{ backends: [{}] }}>
          <Form.Item name="name" label="Resource Name" rules={[{ required: true }]}>
            <Input disabled={!!editingResource} placeholder="e.g. get_customer" />
          </Form.Item>
          <Form.Item name="displayName" label="Display Name">
            <Input placeholder="e.g. Customer Lookup" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="parametersSchema" label="Parameters Schema (JSON)" rules={[{ required: true }]}>
            <Input.TextArea rows={6} style={{ fontFamily: 'monospace' }} defaultValue={defaultParamsSchema} />
          </Form.Item>

          <Form.List name="backends">
            {(fields, { add, remove }) => (
              <div>
                <Paragraph strong>Data Backends</Paragraph>
                {fields.map((field) => (
                  <ResourceBackendCard
                    key={field.key}
                    field={field}
                    onRemove={() => remove(field.name)}
                    canRemove={fields.length > 1}
                  />
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
        title={`Test Query: ${testModal?.resource?.displayName || testModal?.resource?.name}`}
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
                testMutation.mutate({ id: testModal.resource.id, args });
              } catch {
                message.error('Invalid JSON');
              }
            }}
          >
            Execute Query
          </Button>
        </Form>
        {testResult && (
          <Card size="small" style={{ marginTop: 16 }}>
            <Text type={testResult.error ? 'danger' : 'success'}>
              {testResult.error
                ? `Error: ${testResult.error}`
                : `Backend: ${testResult.backend} (${testResult.backendType}) | ${testResult.rowCount} rows | ${testResult.latencyMs}ms`
              }
            </Text>
            {!testResult.error && (
              <pre style={{ marginTop: 8, maxHeight: 300, overflow: 'auto', fontSize: 12, background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            )}
          </Card>
        )}
      </Modal>
    </div>
  );
}

interface ResourceBackendCardProps {
  field: any;
  onRemove: () => void;
  canRemove: boolean;
}

function ResourceBackendCard({ field, onRemove, canRemove }: ResourceBackendCardProps) {
  const formInstance = Form.useFormInstance();
  const backendType = Form.useWatch(['backends', field.name, 'backendType'], formInstance);

  return (
    <Card size="small" style={{ marginBottom: 8 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Form.Item {...field} name={[field.name, 'name']} rules={[{ required: true }]} style={{ marginBottom: 4 }}>
            <Input placeholder="Backend name" style={{ width: 150 }} />
          </Form.Item>
          <Form.Item {...field} name={[field.name, 'backendType']} rules={[{ required: true }]} style={{ marginBottom: 4 }}>
            <Select placeholder="Type" style={{ width: 120 }}>
              <Option value="rest">REST API</Option>
              <Option value="postgres">PostgreSQL</Option>
              <Option value="graphql">GraphQL</Option>
            </Select>
          </Form.Item>
          <Form.Item {...field} name={[field.name, 'priority']} style={{ marginBottom: 4 }}>
            <InputNumber placeholder="Priority" min={1} style={{ width: 90 }} />
          </Form.Item>
          <Form.Item {...field} name={[field.name, 'timeoutMs']} style={{ marginBottom: 4 }}>
            <InputNumber placeholder="Timeout ms" min={1000} step={1000} style={{ width: 130 }} />
          </Form.Item>
          {canRemove && (
            <Button danger size="small" icon={<DeleteOutlined />} onClick={onRemove} />
          )}
        </Space>

        {(backendType === 'rest' || backendType === 'graphql' || !backendType) && (
          <>
            <Form.Item {...field} name={[field.name, 'endpointUrl']} rules={backendType ? [{ required: true }] : []} style={{ marginBottom: 4 }}>
              <Input placeholder="Endpoint URL" />
            </Form.Item>
            {backendType === 'rest' && (
              <Form.Item {...field} name={[field.name, 'httpMethod']} style={{ marginBottom: 4 }}>
                <Select placeholder="Method" style={{ width: 100 }} defaultValue="POST">
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="PUT">PUT</Option>
                </Select>
              </Form.Item>
            )}
            <Form.Item {...field} name={[field.name, 'queryTemplate']} style={{ marginBottom: 4 }}>
              <Input.TextArea
                rows={3}
                placeholder={backendType === 'graphql' ? 'GraphQL query template' : 'Request body template (optional)'}
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
            <Form.Item {...field} name={[field.name, 'authToken']} style={{ marginBottom: 0 }}>
              <Input.Password placeholder="Auth Token (optional, encrypted)" />
            </Form.Item>
          </>
        )}

        {backendType === 'postgres' && (
          <>
            <Form.Item {...field} name={[field.name, 'connectionString']} rules={[{ required: true }]} style={{ marginBottom: 4 }}>
              <Input.Password placeholder="Connection String (e.g. postgres://user:pass@host:5432/dbname?sslmode=require)" />
            </Form.Item>
            <Form.Item {...field} name={[field.name, 'sqlQuery']} rules={[{ required: true }]} style={{ marginBottom: 4 }}>
              <Input.TextArea
                rows={4}
                placeholder="SQL query (e.g. SELECT * FROM customers WHERE id = $1)"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
            <Form.Item {...field} name={[field.name, 'paramNames']} style={{ marginBottom: 0 }}>
              <Input placeholder="Parameter names (comma-separated, matching $1,$2 order)" />
            </Form.Item>
          </>
        )}
      </Space>
    </Card>
  );
}

function ResourceBackendList({ resourceId }: { resourceId: string }) {
  const { data: resourceData } = useQuery<ApiResourceWithBackends>({
    queryKey: ['resource', resourceId],
    queryFn: () => apiGetResource(resourceId),
  });

  if (!resourceData?.backends?.length) {
    return <Text type="secondary">No backends configured</Text>;
  }

  const backendTypeColors: Record<string, string> = { rest: 'green', postgres: 'blue', graphql: 'purple' };

  return (
    <Table
      dataSource={resourceData.backends}
      rowKey="id"
      size="small"
      pagination={false}
      columns={[
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Type', key: 'type', width: 100, render: (_: any, r: ApiResourceBackend) => (
          <Tag color={backendTypeColors[r.backendType] || 'default'}>{r.backendType}</Tag>
        )},
        { title: 'Endpoint / Host', key: 'endpoint', ellipsis: true, render: (_: any, r: ApiResourceBackend) => (
          r.endpointUrl || (r.sqlQuery ? 'Direct DB' : '—')
        )},
        { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 80 },
        { title: 'Timeout', key: 'timeout', width: 100, render: (_: any, r: ApiResourceBackend) => `${r.timeoutMs}ms` },
        { title: 'Status', key: 'status', width: 80, render: (_: any, r: ApiResourceBackend) => (
          <Tag color={r.enabled ? 'green' : 'default'}>{r.enabled ? 'Active' : 'Off'}</Tag>
        )},
      ]}
    />
  );
}
