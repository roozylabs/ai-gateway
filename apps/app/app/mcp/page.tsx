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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/molecules/Sheet';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { useMCPServersQuery } from '@/hooks/queries/useMCPServersQuery';
import { ApiMCPServer, ApiMCPToolExecutionResult } from '@/lib/api';
import { Globe, Plus, RefreshCw, Pencil, Trash2, Loader2, Play, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/types/ui';
import {
  useTestMCPToolMutation,
  useCreateMCPServerMutation,
  useUpdateMCPServerMutation,
  useDeleteMCPServerMutation,
  useSyncMCPServerMutation,
} from '@/hooks/mutations/useMCPMutations';

function statusToDot(status: string) {
  switch (status) {
    case 'healthy':
    case 'connected':
      return 'healthy' as const;
    case 'degraded':
      return 'degraded' as const;
    case 'error':
      return 'exhausted' as const;
    case 'disconnected':
      return 'cooldown' as const;
    default:
      return 'disabled' as const;
  }
}

interface MCPFormState {
  name: string;
  displayName: string;
  description: string;
  transportType: string;
  endpointUrl: string;
  authToken: string;
}

const emptyForm: MCPFormState = {
  name: '',
  displayName: '',
  description: '',
  transportType: 'sse',
  endpointUrl: '',
  authToken: '',
};

export default function MCPPage() {
  const { data, isLoading, isError, refetch } = useMCPServersQuery();
  const createMutation = useCreateMCPServerMutation();
  const updateMutation = useUpdateMCPServerMutation();
  const deleteMutation = useDeleteMCPServerMutation();
  const syncMutation = useSyncMCPServerMutation();
  const testMCPToolMutation = useTestMCPToolMutation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ApiMCPServer | null>(null);
  const [form, setForm] = useState<MCPFormState>(emptyForm);

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingServer, setTestingServer] = useState<ApiMCPServer | null>(null);
  const [testToolName, setTestToolName] = useState('ping');
  const [testArgsJson, setTestArgsJson] = useState('{}');
  const [testResult, setTestResult] = useState<ApiMCPToolExecutionResult | null>(null);

  const servers: ApiMCPServer[] = data && Array.isArray(data) ? data : [];

  const openTestModal = (server: ApiMCPServer) => {
    setTestingServer(server);
    setTestToolName('ping');
    setTestArgsJson('{}');
    setTestResult(null);
    setTestModalOpen(true);
  };

  const handleRunMCPTest = async () => {
    if (!testingServer || !testToolName.trim()) return;
    setTestResult(null);

    try {
      const parsedArgs = JSON.parse(testArgsJson);
      const res = await testMCPToolMutation.mutateAsync({
        serverId: testingServer.id,
        toolName: testToolName.trim(),
        args: parsedArgs,
      });
      setTestResult(res);
      if (res.statusCode === 200) {
        toast.success(`MCP Tool executed successfully (${res.latencyMs}ms)`);
      } else {
        toast.error(`MCP Tool error status: ${res.statusCode}`);
      }
    } catch (err: unknown) {
      toast.error(`Execution error: ${getErrorMessage(err)}`);
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

  const handleSave = () => {
    if (!form.name.trim() || !form.endpointUrl.trim()) {
      toast.error('Name and Endpoint URL are required');
      return;
    }

    if (editingServer) {
      updateMutation.mutate(
        {
          id: editingServer.id,
          data: {
            name: form.name.trim(),
            displayName: form.displayName.trim() || form.name.trim(),
            description: form.description.trim(),
            transportType: form.transportType,
            endpointUrl: form.endpointUrl.trim(),
            authToken: form.authToken.trim() || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success('MCP server updated');
            setDrawerOpen(false);
          },
          onError: (err) => {
            toast.error(`Update failed: ${getErrorMessage(err)}`);
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          name: form.name.trim(),
          displayName: form.displayName.trim() || form.name.trim(),
          description: form.description.trim(),
          transportType: form.transportType,
          endpointUrl: form.endpointUrl.trim(),
          authToken: form.authToken.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success('MCP server registered');
            setDrawerOpen(false);
          },
          onError: (err) => {
            toast.error(`Registration failed: ${getErrorMessage(err)}`);
          },
        }
      );
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="MCP Gateway" description="Model Context Protocol servers providing external tools, prompts, and resources to agents." />
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading MCP servers...</CardContent></Card>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <PageHeader title="MCP Gateway" description="Model Context Protocol servers providing external tools, prompts, and resources to agents." />
        <Card><CardContent className="py-8"><ErrorState title="Failed to load MCP servers" onRetry={() => refetch()} /></CardContent></Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="MCP Gateway"
        description="Model Context Protocol servers providing external tools, prompts, and resources to agents."
        extra={
          <Button variant="prismViolet" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Register MCP Server</span>
          </Button>
        }
      />

      {servers.length === 0 ? (
        <EmptyState
          title="No MCP Servers Registered"
          description="Connect Model Context Protocol (MCP) endpoints to expand agent capabilities."
          action={
            <Button variant="prismViolet" onClick={openCreate}>
              Register MCP Server
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {servers.map((s) => (
            <Card key={s.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#8B5CF6]" />
                    <span className="font-semibold text-sm">{s.displayName || s.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={statusToDot(s.status)} />
                    <span className="capitalize text-xs font-mono text-muted-foreground">{s.status}</span>
                  </div>
                </div>
                <CardDescription className="line-clamp-2 mt-1">{s.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs">
                <div className="p-2 rounded border border-border bg-muted/40 font-mono text-[11px] truncate">
                  <span className="text-muted-foreground">Endpoint: </span>
                  <span className="text-foreground">{s.endpointUrl}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Transport: <Badge variant="outline" className="font-mono text-[10px] uppercase">{s.transportType}</Badge></span>
                  <span>Active Status: <Badge variant="violet" className="font-mono text-[10px]">{s.status}</Badge></span>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => openTestModal(s)}>
                    <Play className="h-3 w-3 text-[#8B5CF6]" />
                    <span>Test</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      syncMutation.mutate(s.id, {
                        onSuccess: () => toast.success('MCP server tools synced'),
                        onError: (err) => toast.error(`Sync failed: ${getErrorMessage(err)}`),
                      });
                    }}
                    disabled={syncMutation.isPending}
                  >
                    {syncMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    <span>Sync</span>
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <ConfirmDialog
                    title="Delete MCP Server"
                    description={`Are you sure you want to unregister MCP server "${s.displayName || s.name}"?`}
                    confirmText="Delete"
                    variant="destructive"
                    onConfirm={() => {
                      deleteMutation.mutate(s.id, {
                        onSuccess: () => toast.success('MCP server removed'),
                        onError: (err) => toast.error(`Delete failed: ${getErrorMessage(err)}`),
                      });
                    }}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingServer ? 'Edit MCP Server' : 'Register MCP Server'}</SheetTitle>
            <SheetDescription>Configure Model Context Protocol endpoint for agent tool calls.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mcp-name">Server Identifier Name</Label>
              <Input
                id="mcp-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., github-mcp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-display">Display Name</Label>
              <Input
                id="mcp-display"
                value={form.displayName}
                onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                placeholder="e.g., GitHub Tools MCP Server"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-url">Endpoint URL</Label>
              <Input
                id="mcp-url"
                value={form.endpointUrl}
                onChange={(e) => setForm((p) => ({ ...p, endpointUrl: e.target.value }))}
                placeholder="https://mcp.internal.org/sse"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-transport">Transport Protocol</Label>
              <Select value={form.transportType} onValueChange={(v) => setForm((p) => ({ ...p, transportType: v }))}>
                <SelectTrigger id="mcp-transport">
                  <SelectValue placeholder="Select Transport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                  <SelectItem value="http">HTTP POST JSON-RPC</SelectItem>
                  <SelectItem value="websocket">WebSocket</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-token">Bearer Auth Token (Optional)</Label>
              <Input
                id="mcp-token"
                type="password"
                value={form.authToken}
                onChange={(e) => setForm((p) => ({ ...p, authToken: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-desc">Description</Label>
              <Textarea
                id="mcp-desc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Capabilities provided by this MCP server..."
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="prismViolet" onClick={handleSave} disabled={isSaving || !form.name.trim() || !form.endpointUrl.trim()}>
              {isSaving ? 'Saving...' : editingServer ? 'Save Changes' : 'Register MCP Server'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Test Execution Modal */}
      <Sheet open={testModalOpen} onOpenChange={setTestModalOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#8B5CF6]" />
              <span>Test MCP Tool: {testingServer?.displayName || testingServer?.name}</span>
            </SheetTitle>
            <SheetDescription>Execute tool call on remote MCP server endpoint.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tool Name</Label>
              <Input
                value={testToolName}
                onChange={(e) => setTestToolName(e.target.value)}
                placeholder="ping"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Input Arguments (JSON)</Label>
              <textarea
                className="w-full h-32 rounded-md border border-border bg-background p-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={testArgsJson}
                onChange={(e) => setTestArgsJson(e.target.value)}
                placeholder="{}"
              />
            </div>

            <Button variant="prismViolet" className="w-full gap-2" onClick={handleRunMCPTest} disabled={testMCPToolMutation.isPending}>
              <Play className="h-4 w-4" />
              <span>{testMCPToolMutation.isPending ? 'Executing MCP Tool...' : 'Execute MCP Tool Test'}</span>
            </Button>

            {testResult && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Execution Output</Label>
                  <Badge variant={testResult.statusCode === 200 ? 'success' : 'destructive'} className="font-mono text-[10px]">
                    Status {testResult.statusCode} ({testResult.latencyMs}ms)
                  </Badge>
                </div>
                <div className="p-3 rounded-md border border-border bg-muted/40 font-mono text-xs overflow-y-auto max-h-48 whitespace-pre-wrap">
                  {typeof testResult.result === 'object' ? JSON.stringify(testResult.result, null, 2) : String(testResult.result)}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
