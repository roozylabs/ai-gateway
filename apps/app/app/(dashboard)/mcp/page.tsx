"use client";

import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/molecules/Card";
import { Button } from "@/components/atoms/Button";
import { Badge, StatusDot } from "@/components/atoms/Badge";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Textarea } from "@/components/atoms/Textarea";
import { Switch } from "@/components/atoms/Switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/molecules/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/molecules/Dialog";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { ErrorState, EmptyState } from "@/components/molecules/StateAlerts";
import { useMCPServersQuery } from "@/hooks/queries/useMCPServersQuery";
import { ApiMCPServer, ApiMCPToolExecutionResult } from "@/lib/api";
import {
  Globe,
  Plus,
  Minus,
  RefreshCw,
  Pencil,
  Trash2,
  Loader2,
  Play,
  Terminal,
  Cpu,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";
import {
  useTestMCPToolMutation,
  useCreateMCPServerMutation,
  useUpdateMCPServerMutation,
  useDeleteMCPServerMutation,
  useSyncMCPServerMutation,
} from "@/hooks/mutations/useMCPMutations";

function statusToDot(status: string) {
  switch (status) {
    case "healthy":
    case "connected":
      return "healthy" as const;
    case "degraded":
      return "degraded" as const;
    case "error":
      return "exhausted" as const;
    case "disconnected":
      return "cooldown" as const;
    default:
      return "disabled" as const;
  }
}

interface KeyValueRow {
  key: string;
  value: string;
}

interface MCPFormState {
  name: string;
  displayName: string;
  description: string;
  type: "remote" | "local";
  transportType: string;
  endpointUrl: string;
  authToken: string;
  command: string;
  argsCsv: string;
  headerRows: KeyValueRow[];
  envRows: KeyValueRow[];
  enabled: boolean;
}

const emptyForm: MCPFormState = {
  name: "",
  displayName: "",
  description: "",
  type: "remote",
  transportType: "sse",
  endpointUrl: "",
  authToken: "",
  command: "",
  argsCsv: "",
  headerRows: [],
  envRows: [],
  enabled: true,
};

function kvToMap(rows: KeyValueRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const k = row.key.trim();
    if (k && row.value.trim()) {
      out[k] = row.value.trim();
    }
  }
  return out;
}

function csvToArgs(csv: string): string[] {
  return csv
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function MCPPage() {
  const { data, isLoading, isError, refetch } = useMCPServersQuery();
  const createMutation = useCreateMCPServerMutation();
  const updateMutation = useUpdateMCPServerMutation();
  const deleteMutation = useDeleteMCPServerMutation();
  const syncMutation = useSyncMCPServerMutation();
  const testMCPToolMutation = useTestMCPToolMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ApiMCPServer | null>(null);
  const [form, setForm] = useState<MCPFormState>(emptyForm);

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingServer, setTestingServer] = useState<ApiMCPServer | null>(null);
  const [testToolName, setTestToolName] = useState("ping");
  const [testArgsJson, setTestArgsJson] = useState("{}");
  const [testResult, setTestResult] =
    useState<ApiMCPToolExecutionResult | null>(null);

  const servers: ApiMCPServer[] = data && Array.isArray(data) ? data : [];

  const openTestModal = (server: ApiMCPServer) => {
    setTestingServer(server);
    setTestToolName("ping");
    setTestArgsJson("{}");
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
    setModalOpen(true);
  };

  const openEdit = (server: ApiMCPServer) => {
    setEditingServer(server);
    const envRows: KeyValueRow[] = Object.entries(server.env || {}).map(
      ([key, value]) => ({ key, value }),
    );
    setForm({
      name: server.name,
      displayName: server.displayName,
      description: server.description,
      type: server.type === "local" ? "local" : "remote",
      transportType: server.transportType,
      endpointUrl: server.endpointUrl,
      authToken: "",
      command: server.command || "",
      argsCsv: (server.args || []).join("\n"),
      headerRows: [],
      envRows,
      enabled: server.enabled,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Server Identifier Name is required");
      return;
    }
    if (form.type === "local") {
      if (!form.command.trim()) {
        toast.error("Command is required for local MCP servers");
        return;
      }
    } else if (!form.endpointUrl.trim()) {
      toast.error("Endpoint URL is required for remote MCP servers");
      return;
    }

    const headers = kvToMap(form.headerRows);
    const env = kvToMap(form.envRows);
    const args = csvToArgs(form.argsCsv);

    if (editingServer) {
      updateMutation.mutate(
        {
          id: editingServer.id,
          data: {
            name: form.name.trim(),
            displayName: form.displayName.trim() || form.name.trim(),
            description: form.description.trim(),
            type: form.type,
            transportType: form.transportType,
            endpointUrl: form.endpointUrl.trim(),
            authToken: form.authToken.trim() || undefined,
            headers,
            command: form.command.trim(),
            args,
            env,
            enabled: form.enabled,
          },
        },
        {
          onSuccess: () => {
            toast.success("MCP server updated");
            setModalOpen(false);
          },
          onError: (err) => {
            toast.error(`Update failed: ${getErrorMessage(err)}`);
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          name: form.name.trim(),
          displayName: form.displayName.trim() || form.name.trim(),
          description: form.description.trim(),
          type: form.type,
          transportType: form.transportType,
          endpointUrl: form.endpointUrl.trim(),
          authToken: form.authToken.trim() || undefined,
          headers,
          command: form.command.trim(),
          args,
          env,
          enabled: form.enabled,
        },
        {
          onSuccess: () => {
            toast.success("MCP server registered");
            setModalOpen(false);
          },
          onError: (err) => {
            toast.error(`Registration failed: ${getErrorMessage(err)}`);
          },
        },
      );
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="MCP Gateway"
          description="Model Context Protocol servers providing external tools, prompts, and resources to agents."
        />
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Loading MCP servers...
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <PageHeader
          title="MCP Gateway"
          description="Model Context Protocol servers providing external tools, prompts, and resources to agents."
        />
        <Card>
          <CardContent className="py-8">
            <ErrorState
              title="Failed to load MCP servers"
              onRetry={() => refetch()}
            />
          </CardContent>
        </Card>
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
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {servers.map((s) => (
            <Card key={s.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#8B5CF6]" />
                    <span className="font-semibold text-sm">
                      {s.displayName || s.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase"
                    >
                      {s.type === "local" ? (
                        <Cpu className="mr-1 h-3 w-3" />
                      ) : (
                        <Globe className="mr-1 h-3 w-3" />
                      )}
                      {s.type}
                    </Badge>
                    <StatusDot status={statusToDot(s.status)} />
                    <span className="capitalize text-xs font-mono text-muted-foreground">
                      {s.status}
                    </span>
                  </div>
                </div>
                <CardDescription className="line-clamp-2 mt-1">
                  {s.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs">
                <div className="p-2 rounded border border-border bg-muted/40 font-mono text-[11px] truncate">
                  {s.type === "local" ? (
                    <>
                      <span className="text-muted-foreground">Command: </span>
                      <span className="text-foreground">{s.command}</span>
                      {(s.args || []).length > 0 && (
                        <span className="ml-2 text-muted-foreground">
                          {" "}
                          args=[{(s.args || []).join(", ")}]
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">Endpoint: </span>
                      <span className="text-foreground">{s.endpointUrl}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>
                    Transport:{" "}
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase"
                    >
                      {s.transportType}
                    </Badge>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span>Enabled</span>
                    <Switch
                      checked={s.enabled}
                      onCheckedChange={(checked) => {
                        updateMutation.mutate(
                          { id: s.id, data: { enabled: checked } },
                          {
                            onSuccess: () =>
                              toast.success(
                                `MCP server ${checked ? "enabled" : "disabled"}`,
                              ),
                            onError: (err) =>
                              toast.error(
                                `Update failed: ${getErrorMessage(err)}`,
                              ),
                          },
                        );
                      }}
                      disabled={updateMutation.isPending}
                      aria-label="Toggle MCP server enabled"
                    />
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => openTestModal(s)}
                  >
                    <Play className="h-3 w-3 text-[#8B5CF6]" />
                    <span>Test</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      syncMutation.mutate(s.id, {
                        onSuccess: () =>
                          toast.success("MCP server tools synced"),
                        onError: (err) =>
                          toast.error(`Sync failed: ${getErrorMessage(err)}`),
                      });
                    }}
                    disabled={syncMutation.isPending}
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    <span>Sync</span>
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(s)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <ConfirmDialog
                    title="Delete MCP Server"
                    description={`Are you sure you want to unregister MCP server "${s.displayName || s.name}"?`}
                    confirmText="Delete"
                    variant="destructive"
                    onConfirm={() => {
                      deleteMutation.mutate(s.id, {
                        onSuccess: () => toast.success("MCP server removed"),
                        onError: (err) =>
                          toast.error(`Delete failed: ${getErrorMessage(err)}`),
                      });
                    }}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
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
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingServer ? "Edit MCP Server" : "Register MCP Server"}
            </DialogTitle>
            <DialogDescription>
              Configure Model Context Protocol endpoint for agent tool calls.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mcp-name">Server Identifier Name</Label>
              <Input
                id="mcp-name"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g., github-mcp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-display">Display Name</Label>
              <Input
                id="mcp-display"
                value={form.displayName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, displayName: e.target.value }))
                }
                placeholder="e.g., GitHub Tools MCP Server"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-desc">Description</Label>
              <Textarea
                id="mcp-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Capabilities provided by this MCP server..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-type">Server Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    type: (v === "local" ? "local" : "remote") as "local" | "remote",
                  }))
                }
              >
                <SelectTrigger id="mcp-type">
                  <SelectValue placeholder="Select Server Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote (URL-based)</SelectItem>
                  <SelectItem value="local">Local (stdio command)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type === "remote" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mcp-url">Endpoint URL</Label>
                  <Input
                    id="mcp-url"
                    value={form.endpointUrl}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, endpointUrl: e.target.value }))
                    }
                    placeholder="https://mcp.firecrawl.dev/v2/mcp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mcp-transport">Transport Protocol</Label>
                  <Select
                    value={form.transportType}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, transportType: v }))
                    }
                  >
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
                    onChange={(e) =>
                      setForm((p) => ({ ...p, authToken: e.target.value }))
                    }
                    placeholder="Stored as Authorization: Bearer <token>"
                  />
                </div>
                <div className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <KeyRound className="h-3.5 w-3.5 text-[#8B5CF6]" />
                      Additional Headers (Optional)
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1 text-[#8B5CF6]"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          headerRows: [...p.headerRows, { key: "", value: "" }],
                        }))
                      }
                    >
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </div>
                  {form.headerRows.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      e.g., X-Api-Key for firecrawl-style config.
                    </p>
                  )}
                  <div className="space-y-2">
                    {form.headerRows.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          className="h-8 flex-1 font-mono text-xs"
                          placeholder="Header name"
                          value={row.key}
                          onChange={(e) => {
                            const rows = [...form.headerRows];
                            rows[idx] = { ...rows[idx], key: e.target.value };
                            setForm((p) => ({ ...p, headerRows: rows }));
                          }}
                        />
                        <Input
                          className="h-8 flex-1 font-mono text-xs"
                          placeholder="Header value"
                          value={row.value}
                          onChange={(e) => {
                            const rows = [...form.headerRows];
                            rows[idx] = { ...rows[idx], value: e.target.value };
                            setForm((p) => ({ ...p, headerRows: rows }));
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              headerRows: p.headerRows.filter(
                                (_, i) => i !== idx,
                              ),
                            }))
                          }
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mcp-command" className="flex items-center gap-1">
                    <Cpu className="h-3.5 w-3.5 text-[#8B5CF6]" />
                    Command
                  </Label>
                  <Input
                    id="mcp-command"
                    value={form.command}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, command: e.target.value }))
                    }
                    placeholder="e.g., npx -y @modelcontextprotocol/server-github"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mcp-args">Arguments</Label>
                  <textarea
                    id="mcp-args"
                    className="w-full h-20 rounded-md border border-border bg-background p-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={form.argsCsv}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, argsCsv: e.target.value }))
                    }
                    placeholder={"One argument per line, e.g.\n--token\nxxx"}
                  />
                </div>
                <div className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Environment</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1 text-[#8B5CF6]"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          envRows: [...p.envRows, { key: "", value: "" }],
                        }))
                      }
                    >
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {form.envRows.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          className="h-8 flex-1 font-mono text-xs"
                          placeholder="VAR"
                          value={row.key}
                          onChange={(e) => {
                            const rows = [...form.envRows];
                            rows[idx] = { ...rows[idx], key: e.target.value };
                            setForm((p) => ({ ...p, envRows: rows }));
                          }}
                        />
                        <Input
                          className="h-8 flex-1 font-mono text-xs"
                          placeholder="value"
                          value={row.value}
                          onChange={(e) => {
                            const rows = [...form.envRows];
                            rows[idx] = { ...rows[idx], value: e.target.value };
                            setForm((p) => ({ ...p, envRows: rows }));
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              envRows: p.envRows.filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="mcp-enabled" className="text-sm font-medium">
                  Enable Server
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Disabled servers will not accept tool calls.
                </p>
              </div>
              <Switch
                id="mcp-enabled"
                checked={form.enabled}
                onCheckedChange={(v) => setForm((p) => ({ ...p, enabled: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="prismViolet"
              onClick={handleSave}
              disabled={isSaving || !form.name.trim()}
            >
              {isSaving
                ? "Saving..."
                : editingServer
                  ? "Save Changes"
                  : "Register MCP Server"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Execution Modal */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#8B5CF6]" />
              <span>
                Test MCP Tool:{" "}
                {testingServer?.displayName || testingServer?.name}
              </span>
            </DialogTitle>
            <DialogDescription>
              Execute tool call on remote MCP server endpoint.
            </DialogDescription>
          </DialogHeader>
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
              <Label className="text-xs font-semibold">
                Input Arguments (JSON)
              </Label>
              <textarea
                className="w-full h-32 rounded-md border border-border bg-background p-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={testArgsJson}
                onChange={(e) => setTestArgsJson(e.target.value)}
                placeholder="{}"
              />
            </div>

            <Button
              variant="prismViolet"
              className="w-full gap-2"
              onClick={handleRunMCPTest}
              disabled={testMCPToolMutation.isPending}
            >
              <Play className="h-4 w-4" />
              <span>
                {testMCPToolMutation.isPending
                  ? "Executing MCP Tool..."
                  : "Execute MCP Tool Test"}
              </span>
            </Button>

            {testResult && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Execution Output
                  </Label>
                  <Badge
                    variant={
                      testResult.statusCode === 200 ? "success" : "destructive"
                    }
                    className="font-mono text-[10px]"
                  >
                    Status {testResult.statusCode} ({testResult.latencyMs}ms)
                  </Badge>
                </div>
                <div className="p-3 rounded-md border border-border bg-muted/40 font-mono text-xs overflow-y-auto max-h-48 whitespace-pre-wrap">
                  {typeof testResult.result === "object"
                    ? JSON.stringify(testResult.result, null, 2)
                    : String(testResult.result)}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
