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
  Tabs,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SyncOutlined,
  ApiOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CompassOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import {
  ApiMCPServer,
  ApiMCPServerWithTools,
  ApiMCPTool,
  ApiCreateMCPServerRequest,
  ApiMCPRegistryServer,
  apiGetMCPServers,
  apiGetMCPServer,
  apiCreateMCPServer,
  apiUpdateMCPServer,
  apiDeleteMCPServer,
  apiSyncMCPServer,
  apiTestMCPTool,
  apiGetMCPRegistryCatalog,
  apiRegisterMCPRegistryServer,
} from '@/lib/api';

const { Text, Paragraph, Title } = Typography;

interface MCPServerFormValues {
  name: string;
  displayName: string;
  description: string;
  transportType: string;
  endpointUrl: string;
  authToken?: string;
  enabled: boolean;
}

interface MCPRegistryFormValues {
  name: string;
  slug: string;
  description: string;
  serverUrl: string;
  transportType: string;
  visibility: string;
}

export default function MCPGatewayPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('catalog');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ApiMCPServerWithTools | null>(null);
  const [inspectServer, setInspectServer] = useState<ApiMCPServerWithTools | null>(null);
  const [testModal, setTestModal] = useState<{ serverId: string; tool: string; args: string } | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [form] = Form.useForm();
  const [catalogForm] = Form.useForm();

  // Queries
  const { data: servers, isLoading } = useQuery<ApiMCPServer[]>({
    queryKey: ['mcp-servers'],
    queryFn: apiGetMCPServers,
  });

  const { data: catalogResult, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['mcp-registry-catalog'],
    queryFn: apiGetMCPRegistryCatalog,
  });

  const catalogServers = catalogResult?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: apiCreateMCPServer,
    onSuccess: () => {
      message.success('MCP Server registered & tools discovered successfully');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.error || 'Failed to register MCP server');
    },
  });

  const registerCatalogMutation = useMutation({
    mutationFn: apiRegisterMCPRegistryServer,
    onSuccess: () => {
      message.success('MCP Server added to catalog successfully');
      setIsCatalogModalOpen(false);
      catalogForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['mcp-registry-catalog'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.error || 'Failed to register catalog server');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApiCreateMCPServerRequest }) => apiUpdateMCPServer(id, data),
    onSuccess: () => {
      message.success('MCP Server updated successfully');
      setIsModalOpen(false);
      setEditingServer(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.error || 'Failed to update MCP server');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: apiDeleteMCPServer,
    onSuccess: () => {
      message.success('MCP Server removed successfully');
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: apiSyncMCPServer,
    onSuccess: (updated) => {
      message.success(`Re-synced successfully. Discovered ${updated.tools?.length || 0} tools.`);
      if (inspectServer && inspectServer.server.id === updated.server.id) {
        setInspectServer(updated);
      }
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
    },
  });

  const testToolMutation = useMutation({
    mutationFn: ({ id, tool, args }: { id: string; tool: string; args: Record<string, any> }) =>
      apiTestMCPTool(id, tool, args),
    onSuccess: (res) => {
      setTestResult(res);
      message.success('MCP tool executed successfully');
    },
    onError: (err: any) => {
      message.error(err.response?.data?.error || 'MCP tool execution failed');
    },
  });

  const handleOpenAdd = () => {
    setEditingServer(null);
    form.resetFields();
    form.setFieldsValue({
      transportType: 'sse',
      enabled: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (srv: ApiMCPServer) => {
    try {
      const full = await apiGetMCPServer(srv.id);
      setEditingServer(full);
      form.setFieldsValue({
        name: full.server.name,
        displayName: full.server.displayName,
        description: full.server.description,
        transportType: full.server.transportType,
        endpointUrl: full.server.endpointUrl,
        enabled: full.server.enabled,
      });
      setIsModalOpen(true);
    } catch {
      message.error('Failed to load server details');
    }
  };

  const handleInspect = async (srv: ApiMCPServer) => {
    try {
      const full = await apiGetMCPServer(srv.id);
      setInspectServer(full);
    } catch {
      message.error('Failed to inspect server');
    }
  };

  const handleSubmit = async () => {
    const values: MCPServerFormValues = await form.validateFields();
    const payload: ApiCreateMCPServerRequest = {
      name: values.name,
      displayName: values.displayName,
      description: values.description,
      transportType: values.transportType,
      endpointUrl: values.endpointUrl,
      authToken: values.authToken,
      enabled: values.enabled,
    };

    if (editingServer) {
      updateMutation.mutate({ id: editingServer.server.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCatalogSubmit = async () => {
    const values: MCPRegistryFormValues = await catalogForm.validateFields();
    registerCatalogMutation.mutate(values);
  };

  const handleConnectFromCatalog = (catServer: ApiMCPRegistryServer) => {
    form.resetFields();
    form.setFieldsValue({
      name: catServer.slug,
      displayName: catServer.name,
      description: catServer.description,
      transportType: catServer.transportType,
      endpointUrl: catServer.serverUrl,
      enabled: true,
    });
    setActiveTab('servers');
    setIsModalOpen(true);
  };

  const handleExecuteTest = () => {
    if (!testModal) return;
    try {
      const parsedArgs = JSON.parse(testModal.args || '{}');
      testToolMutation.mutate({
        id: testModal.serverId,
        tool: testModal.tool,
        args: parsedArgs,
      });
    } catch {
      message.error('Invalid JSON arguments');
    }
  };

  const columns = [
    {
      title: 'MCP Server',
      key: 'name',
      render: (_: any, record: ApiMCPServer) => (
        <Space direction="vertical" size={2}>
          <Space>
            <Text strong style={{ fontSize: 15 }}>{record.displayName || record.name}</Text>
            <Tag color="cyan" style={{ fontFamily: 'monospace' }}>{record.name}</Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: 13 }}>{record.description || 'No description provided'}</Text>
        </Space>
      ),
    },
    {
      title: 'Transport & Endpoint',
      key: 'endpoint',
      render: (_: any, record: ApiMCPServer) => (
        <Space direction="vertical" size={2}>
          <Tag color="purple">{record.transportType.toUpperCase()}</Tag>
          <Text style={{ fontSize: 13, fontFamily: 'monospace' }}>{record.endpointUrl}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      render: (_: any, record: ApiMCPServer) => (
        record.status === 'connected' ? (
          <Badge status="success" text={<Text style={{ color: '#52c41a' }}>Connected</Text>} />
        ) : (
          <Badge status="error" text={<Text type="danger">Offline / Error</Text>} />
        )
      ),
    },
    {
      title: 'State',
      key: 'enabled',
      width: 100,
      render: (_: any, record: ApiMCPServer) => (
        <Switch
          checked={record.enabled}
          onChange={(checked) =>
            updateMutation.mutate({
              id: record.id,
              data: {
                name: record.name,
                displayName: record.displayName,
                description: record.description,
                transportType: record.transportType,
                endpointUrl: record.endpointUrl,
                enabled: checked,
              },
            })
          }
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 260,
      render: (_: any, record: ApiMCPServer) => (
        <Space>
          <Button size="small" icon={<ApiOutlined />} onClick={() => handleInspect(record)}>
            Inspect Tools
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
          <Popconfirm
            title="Delete MCP Server"
            description="Are you sure you want to unregister this MCP server?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          🔌 MCP (Model Context Protocol) Gateway & Registry
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 4 }}>
          Centralized control plane and discovery catalog for remote HTTP/SSE Model Context Protocol servers.
        </Paragraph>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: 'catalog',
            label: (
              <span>
                <CompassOutlined /> MCP Catalog Explorer
              </span>
            ),
            children: (
              <Card
                title="🌐 Public & Organization MCP Server Catalog"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      catalogForm.resetFields();
                      setIsCatalogModalOpen(true);
                    }}
                  >
                    Add Server to Catalog
                  </Button>
                }
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                  {catalogServers.map((cat) => (
                    <Card
                      key={cat.id}
                      size="small"
                      hoverable
                      style={{ background: '#0F1115', border: '1px solid #1f242d' }}
                      title={
                        <Space>
                          <Text strong style={{ color: '#fff' }}>{cat.name}</Text>
                          {cat.isVerified && (
                            <Tooltip title="Verified Catalog Server">
                              <SafetyCertificateOutlined style={{ color: '#8B5CF6' }} />
                            </Tooltip>
                          )}
                        </Space>
                      }
                      extra={<Tag color="purple">{cat.transportType.toUpperCase()}</Tag>}
                    >
                      <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ fontSize: 13, minHeight: 40 }}>
                        {cat.description || 'Remote Model Context Protocol capability server.'}
                      </Paragraph>
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Tag color={cat.visibility === 'public' ? 'green' : 'blue'}>
                          {cat.visibility.toUpperCase()}
                        </Tag>
                        <Button
                          size="small"
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => handleConnectFromCatalog(cat)}
                        >
                          Connect Gateway
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            ),
          },
          {
            key: 'servers',
            label: (
              <span>
                <ApiOutlined /> Registered Servers ({servers?.length || 0})
              </span>
            ),
            children: (
              <Card
                title="Registered MCP Gateway Servers"
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
                    Register MCP Server
                  </Button>
                }
              >
                <Table
                  rowKey="id"
                  dataSource={servers}
                  columns={columns}
                  loading={isLoading}
                  pagination={false}
                  locale={{ emptyText: 'No MCP servers registered yet. Click "Register MCP Server" to discover remote tools.' }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Add / Edit MCP Server Modal */}
      <Modal
        title={editingServer ? 'Edit MCP Server Registration' : 'Register New MCP Server'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Server Identifier (Name)"
            rules={[{ required: true, message: 'Server name is required' }]}
          >
            <Input placeholder="e.g. github-mcp-server" disabled={!!editingServer} />
          </Form.Item>

          <Form.Item name="displayName" label="Display Name">
            <Input placeholder="e.g. GitHub Repository MCP Server" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Explain what tools this MCP server provides..." />
          </Form.Item>

          <Form.Item name="transportType" label="Transport Protocol" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'HTTP JSON-RPC 2.0', value: 'http' },
                { label: 'Server-Sent Events (SSE)', value: 'sse' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="endpointUrl"
            label="Endpoint URL"
            rules={[{ required: true, message: 'Endpoint URL is required' }]}
          >
            <Input placeholder="e.g. https://mcp.github.com/v1" />
          </Form.Item>

          <Form.Item name="authToken" label="Auth Token / API Key (Stored Encrypted AES-256-GCM)">
            <Input.Password placeholder="Leave empty to keep existing token" />
          </Form.Item>

          <Form.Item name="enabled" valuePropName="checked" label="Enabled">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Catalog Entry Modal */}
      <Modal
        title="Add MCP Server to Public/Tenant Catalog"
        open={isCatalogModalOpen}
        onOk={handleCatalogSubmit}
        onCancel={() => setIsCatalogModalOpen(false)}
        confirmLoading={registerCatalogMutation.isPending}
        destroyOnClose
        width={600}
      >
        <Form form={catalogForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Server Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. PostgreSQL Database MCP Server" />
          </Form.Item>

          <Form.Item name="slug" label="Slug / Unique Identifier" rules={[{ required: true }]}>
            <Input placeholder="e.g. postgresql-mcp-server" />
          </Form.Item>

          <Form.Item name="serverUrl" label="Remote Server URL" rules={[{ required: true }]}>
            <Input placeholder="https://mcp.example.com/sse" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Capability summary of this MCP server" />
          </Form.Item>

          <Form.Item name="transportType" label="Transport" initialValue="sse">
            <Select
              options={[
                { label: 'Server-Sent Events (SSE)', value: 'sse' },
                { label: 'HTTP JSON-RPC 2.0', value: 'http_jsonrpc' },
              ]}
            />
          </Form.Item>

          <Form.Item name="visibility" label="Visibility" initialValue="private">
            <Select
              options={[
                { label: 'Private (My Account Only)', value: 'private' },
                { label: 'Public Catalog', value: 'public' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Inspect Discovered Tools Drawer */}
      <Drawer
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>Discovered MCP Tools: {inspectServer?.server.displayName || inspectServer?.server.name}</span>
          </Space>
        }
        width={640}
        open={!!inspectServer}
        onClose={() => setInspectServer(null)}
      >
        {inspectServer && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card size="small" title="Server Overview">
              <p><strong>Name:</strong> {inspectServer.server.name}</p>
              <p><strong>Transport:</strong> <Tag color="purple">{inspectServer.server.transportType.toUpperCase()}</Tag></p>
              <p><strong>Endpoint:</strong> <code>{inspectServer.server.endpointUrl}</code></p>
              <p><strong>Status:</strong> <Tag color={inspectServer.server.status === 'connected' ? 'success' : 'error'}>{inspectServer.server.status}</Tag></p>
            </Card>

            <Card
              size="small"
              title={`Discovered Tools (${inspectServer.tools?.length || 0})`}
              extra={
                <Button
                  size="small"
                  icon={<SyncOutlined />}
                  onClick={() => syncMutation.mutate(inspectServer.server.id)}
                >
                  Re-Sync
                </Button>
              }
            >
              {inspectServer.tools && inspectServer.tools.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {inspectServer.tools.map((t: ApiMCPTool) => (
                    <Card key={t.id} size="small" type="inner" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <Text strong style={{ color: '#1677ff' }}>{t.name}</Text>
                          <p style={{ margin: '4px 0', fontSize: 13, color: '#666' }}>{t.description || 'No description'}</p>
                        </div>
                        <Button
                          size="small"
                          icon={<PlayCircleOutlined />}
                          type="primary"
                          ghost
                          onClick={() => {
                            setTestResult(null);
                            setTestModal({
                              serverId: inspectServer.server.id,
                              tool: t.name,
                              args: '{\n  \n}',
                            });
                          }}
                        >
                          Test Tool
                        </Button>
                      </div>
                    </Card>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">No tools discovered yet. Click "Re-Sync" to run MCP tools/list protocol.</Text>
              )}
            </Card>
          </Space>
        )}
      </Drawer>

      {/* Test Execution Sandbox Modal */}
      <Modal
        title={`Test MCP Tool Execution: ${testModal?.tool}`}
        open={!!testModal}
        onOk={handleExecuteTest}
        onCancel={() => {
          setTestModal(null);
          setTestResult(null);
        }}
        confirmLoading={testToolMutation.isPending}
        okText="Execute MCP Tool"
        width={600}
      >
        <div style={{ marginTop: 12 }}>
          <Text strong>Input Arguments (JSON):</Text>
          <Input.TextArea
            rows={5}
            style={{ fontFamily: 'monospace', marginTop: 8 }}
            value={testModal?.args}
            onChange={(e) => setTestModal((prev) => (prev ? { ...prev, args: e.target.value } : null))}
          />
        </div>

        {testResult && (
          <Card size="small" title="Execution Output" style={{ marginTop: 16, background: '#1e1e1e' }}>
            <pre style={{ color: '#52c41a', margin: 0, fontSize: 12, overflowX: 'auto' }}>
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </Card>
        )}
      </Modal>
    </div>
  );
}
