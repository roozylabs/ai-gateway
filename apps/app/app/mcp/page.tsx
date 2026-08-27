'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge, StatusDot } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Textarea } from '@/components/atoms/Textarea';
import { Switch } from '@/components/atoms/Switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/molecules/Sheet';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { useMCPServersQuery, useCreateMCPServer, useUpdateMCPServer, useDeleteMCPServer, useSyncMCPServer } from '@/hooks/queries/useMCPServersQuery';
import { ApiMCPServer } from '@/lib/api';
import { apiTestMCPTool, ApiMCPToolExecutionResult } from '@/lib/api';
import { Globe, Plus, RefreshCw, Pencil, Trash2, Loader2, Play, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/types/ui';

function statusToDot(status: string) {
  switch (status) {
    case 'healthy': return 'healthy' as const;
    case 'connected': return 'healthy' as const;
    case 'degraded': return 'degraded' as const;
    case 'error': return 'exhausted' as const;
    case 'disconnected': return 'cooldown' as const;
    default: return 'disabled' as const;
  }
}

const emptyForm = { name: '', displayName: '', description: '', transportType: 'sse', endpointUrl: '', authToken: '' };

export default function MCPPage() {
  const { data, isLoading, isError, refetch } = useMCPServersQuery();
  const createMutation = useCreateMCPServer();
  const updateMutation = useUpdateMCPServer();
  const deleteMutation = useDeleteMCPServer();
  const syncMutation = useSyncMCPServer();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ApiMCPServer | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingServer, setTestingServer] = useState<ApiMCPServer | null>(null);
  const [testToolName, setTestToolName] = useState('ping');
  const [testArgsJson, setTestArgsJson] = useState('{}');
  const [testExecuting, setTestExecuting] = useState(false);
  const [testResult, setTestResult] = useState<ApiMCPToolExecutionResult | null>(null);

  const servers: ApiMCPServer[] = (data && Array.isArray(data)) ? data : [];

  const openTestModal = (server: ApiMCPServer) => {
    setTestingServer(server);
    setTestToolName('ping');
    setTestArgsJson('{}');
    setTestResult(null);
    setTestModalOpen(true);
  };

  const handleRunMCPTest = async () => {
    if (!testingServer || !testToolName.trim()) return;
    setTestExecuting(true);
    setTestResult(null);

    try {
      const parsedArgs = JSON.parse(testArgsJson);
      const res = await apiTestMCPTool(testingServer.id, testToolName.trim(), parsedArgs);
      setTestResult(res);
      if (res.statusCode === 200) {
        toast.success(`MCP Tool executed successfully (${res.latencyMs}ms)`);
      } else {
        toast.error(`MCP Tool error status: ${res.statusCode}`);
      }
    } catch (err: unknown) {
      toast.error(`Execution error: ${getErrorMessage(err)}`);
    } finally {
      setTestExecuting(false);
    }
  };

  const openCreate = () => {
    setEditingServer(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (server: ApiMCPServer) => {
    setEditingServer(server);
    setForm({
      name: server.name,
      displayName: server.displayName,
      description: server.description,
      transportType: server.transportType,
      endpointUrl: server.endpointUrl,
      authToken: '',
    });
    setDrawerOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      name: form.name,
      displayName: form.displayName || form.name,
      description: form.description,
      transportType: form.transportType,
      endpointUrl: form.endpointUrl,
      ...(form.authToken ? { authToken: form.authToken } : {}),
    };

    if (editingServer) {
      updateMutation.mutate(
        { id: editingServer.id, data: payload },
        {
          onSuccess: () => { toast.success('Server updated'); setDrawerOpen(false); },
          onError: (err: Error) => toast.error(`Update failed: ${err.message}`),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success('Server connected'); setDrawerOpen(false); },
        onError: (err: Error) => toast.error(`Create failed: ${err.message}`),
      });
    }
  };

  const handleDelete = (server: ApiMCPServer) => {
    deleteMutation.mutate(server.id, {
      onSuccess: () => toast.success(`${server.displayName} removed`),
      onError: (err: Error) => toast.error(`Delete failed: ${err.message}`),
    });
  };

  const handleSync = (server: ApiMCPServer) => {
    syncMutation.mutate(server.id, {
      onSuccess: () => toast.success(`${server.displayName} synced`),
      onError: (err: Error) => toast.error(`Sync failed: ${err.message}`),
    });
  };

  const handleToggle = (server: ApiMCPServer) => {
    updateMutation.mutate(
      { id: server.id, data: { name: server.name, endpointUrl: server.endpointUrl, enabled: !server.enabled } },
      { onError: (err: Error) => toast.error(`Toggle failed: ${err.message}`) }
    );
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <PageHeader
        title="MCP (Model Context Protocol) Server Gateway"
        description="Connect and expose Model Context Protocol tool servers to your AI agents and LLM clients."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Connect MCP Server
          </Button>
        }
      />

      {isError ? (
        <ErrorState
          title="Failed to fetch MCP servers"
          description="Could not communicate with the Prism AI Gateway backend."
          onRetry={refetch}
        />
      ) : !isLoading && servers.length === 0 ? (
        <EmptyState
          title="No MCP Servers Connected"
          description="Connect your first Model Context Protocol server to expose tools to AI agents."
          action={
            <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Connect MCP Server
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => (
            <Card key={server.id} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Globe className="h-5 w-5 text-[#8B5CF6]" />
                    <span>{server.displayName || server.name}</span>
                  </CardTitle>
                  <StatusDot status={statusToDot(server.status)} />
                </div>
                <CardDescription className="font-mono text-xs truncate">
                  {server.endpointUrl || '—'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {server.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{server.description}</p>
                )}
                <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                  <span className="text-muted-foreground">Transport</span>
                  <Badge variant="violet">{server.transportType}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                  <span className="text-muted-foreground">Auth Token</span>
                  <Badge variant={server.hasAuthToken ? 'success' : 'outline'}>
                    {server.hasAuthToken ? 'Set' : 'None'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Enabled</span>
                  <Switch
                    checked={server.enabled}
                    onCheckedChange={() => handleToggle(server)}
                    disabled={updateMutation.isPending}
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border pt-3 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs px-2"
                  onClick={() => openTestModal(server)}
                >
                  <Play className="h-3 w-3 text-[#8B5CF6]" /> Test
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs px-2"
                  disabled={syncMutation.isPending}
                  onClick={() => handleSync(server)}
                >
                  {syncMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Sync
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs px-2"
                  onClick={() => openEdit(server)}
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
                <ConfirmDialog
                  title="Delete MCP Server"
                  description={`Remove "${server.displayName || server.name}"? This will disconnect it from all agents.`}
                  confirmText="Delete"
                  onConfirm={() => handleDelete(server)}
                  trigger={
                    <Button variant="destructive" size="sm" className="gap-1 text-xs px-2" disabled={deleteMutation.isPending}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  }
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingServer ? 'Edit MCP Server' : 'Connect MCP Server'}</SheetTitle>
            <SheetDescription>
              {editingServer ? 'Update server configuration.' : 'Add a new Model Context Protocol server to your gateway.'}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mcp-name">Server Name *</Label>
              <Input
                id="mcp-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., postgres-mcp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-display">Display Name</Label>
              <Input
                id="mcp-display"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="e.g., PostgreSQL MCP Server"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-desc">Description</Label>
              <Textarea
                id="mcp-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this MCP server"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-transport">Transport Type</Label>
              <Select value={form.transportType} onValueChange={(v) => setForm((f) => ({ ...f, transportType: v }))}>
                <SelectTrigger id="mcp-transport"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                  <SelectItem value="stdio">Stdio</SelectItem>
                  <SelectItem value="streamable-http">Streamable HTTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-url">Endpoint URL *</Label>
              <Input
                id="mcp-url"
                value={form.endpointUrl}
                onChange={(e) => setForm((f) => ({ ...f, endpointUrl: e.target.value }))}
                placeholder="http://localhost:8080/mcp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-token">Auth Token {editingServer && '(leave blank to keep)'}</Label>
              <Input
                id="mcp-token"
                type="password"
                value={form.authToken}
                onChange={(e) => setForm((f) => ({ ...f, authToken: e.target.value }))}
                placeholder="Optional bearer token"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              variant="prismViolet"
              onClick={handleSubmit}
              disabled={!form.name.trim() || !form.endpointUrl.trim() || isMutating}
            >
              {isMutating ? 'Saving...' : editingServer ? 'Save Changes' : 'Connect Server'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={testModalOpen} onOpenChange={setTestModalOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#8B5CF6]" />
              <span>Test MCP Server Tool</span>
            </SheetTitle>
            <SheetDescription>
              Execute tool on MCP Server &quot;{testingServer?.displayName || testingServer?.name}&quot;.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mcp-tool-name">MCP Tool Name</Label>
              <Input
                id="mcp-tool-name"
                value={testToolName}
                onChange={(e) => setTestToolName(e.target.value)}
                placeholder="e.g. query_db or calculate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mcp-args">Arguments (JSON)</Label>
              <textarea
                id="mcp-args"
                className="w-full h-32 rounded-md border border-border bg-background p-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={testArgsJson}
                onChange={(e) => setTestArgsJson(e.target.value)}
              />
            </div>

            <Button
              variant="prismViolet"
              className="w-full gap-2"
              onClick={handleRunMCPTest}
              disabled={testExecuting || !testToolName.trim()}
            >
              <Play className="h-4 w-4" />
              {testExecuting ? 'Executing MCP Tool...' : 'Execute MCP Tool'}
            </Button>

            {testResult && (
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">MCP Response</span>
                  <Badge variant={testResult.statusCode === 200 ? 'success' : 'destructive'} className="font-mono text-[10px]">
                    {testResult.latencyMs}ms
                  </Badge>
                </div>
                <pre className="p-3 rounded-md border border-border bg-muted/40 font-mono text-xs overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {JSON.stringify(testResult.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
