'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardContent } from '@/components/molecules/Card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/molecules/Sheet';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Badge } from '@/components/atoms/Badge';
import { Switch } from '@/components/atoms/Switch';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { useToolsQuery } from '@/hooks/queries/useToolsQuery';
import type { ApiTool } from '@/lib/api';
import { Wrench, Plus, Pencil, Trash2, Play, Terminal } from 'lucide-react';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { ApiToolExecutionResult } from '@/lib/api';
import { toast } from 'sonner';
import { getErrorMessage } from '@/types/ui';
import {
  useTestToolMutation,
  useCreateToolMutation,
  useUpdateToolMutation,
  useDeleteToolMutation,
} from '@/hooks/mutations/useToolMutations';

interface ToolFormData {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
}

const initialToolFormData: ToolFormData = {
  name: '',
  displayName: '',
  description: '',
  enabled: true,
};

export default function ToolsPage() {
  const { data: tools, isLoading, isError, refetch } = useToolsQuery();
  const testToolMutation = useTestToolMutation();
  const createMutation = useCreateToolMutation();
  const updateMutation = useUpdateToolMutation();
  const deleteMutation = useDeleteToolMutation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingTool, setTestingTool] = useState<ApiTool | null>(null);
  const [testArgsJson, setTestArgsJson] = useState('{}');
  const [testResult, setTestResult] = useState<ApiToolExecutionResult | null>(null);
  const [editingTool, setEditingTool] = useState<ApiTool | null>(null);
  const [formData, setFormData] = useState<ToolFormData>(initialToolFormData);

  const openTestModal = (tool: ApiTool) => {
    setTestingTool(tool);
    setTestArgsJson(
      JSON.stringify(
        tool.inputSchema?.properties
          ? Object.fromEntries(Object.keys(tool.inputSchema.properties).map((k) => [k, 'sample_value']))
          : {},
        null,
        2
      )
    );
    setTestResult(null);
    setTestModalOpen(true);
  };

  const handleRunToolTest = async () => {
    if (!testingTool) return;
    setTestResult(null);

    try {
      const parsedArgs = JSON.parse(testArgsJson);
      const res = await testToolMutation.mutateAsync({ toolId: testingTool.id, args: parsedArgs });
      setTestResult(res);
      if (res.statusCode === 200) {
        toast.success(`Tool executed successfully (${res.latencyMs}ms)`);
      } else {
        toast.error(`Tool execution returned status ${res.statusCode}`);
      }
    } catch (err: unknown) {
      toast.error(`Invalid JSON or request error: ${getErrorMessage(err)}`);
    }
  };

  const resetForm = () => {
    setFormData(initialToolFormData);
    setEditingTool(null);
  };

  const openCreateDrawer = () => {
    resetForm();
    setDrawerOpen(true);
  };

  const openEditDrawer = (tool: ApiTool) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      displayName: tool.displayName,
      description: tool.description,
      enabled: tool.enabled,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Tool name is required');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      displayName: formData.displayName.trim() || formData.name.trim(),
      description: formData.description.trim(),
      enabled: formData.enabled,
    };

    if (editingTool) {
      updateMutation.mutate(
        { id: editingTool.id, toolData: payload },
        {
          onSuccess: () => {
            toast.success('Tool updated successfully');
            setDrawerOpen(false);
            resetForm();
          },
          onError: (error) => {
            toast.error(`Failed to update tool: ${getErrorMessage(error)}`);
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Tool created successfully');
          setDrawerOpen(false);
          resetForm();
        },
        onError: (error) => {
          toast.error(`Failed to create tool: ${getErrorMessage(error)}`);
        },
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Tool Gateway & Function Registry" description="Register and manage dynamic function call schemas for AI agent execution." />
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading tools...</CardContent></Card>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <PageHeader title="Tool Gateway & Function Registry" description="Register and manage dynamic function call schemas for AI agent execution." />
        <Card><CardContent className="py-8"><ErrorState title="Failed to load tool registry" onRetry={() => refetch()} /></CardContent></Card>
      </AppLayout>
    );
  }

  const toolList = Array.isArray(tools) ? tools : [];

  return (
    <AppLayout>
      <PageHeader
        title="Tool Gateway & Function Registry"
        description="Register and manage dynamic function call schemas for AI agent execution."
        extra={
          <Button variant="prismViolet" onClick={openCreateDrawer} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Register Tool</span>
          </Button>
        }
      />

      {toolList.length === 0 ? (
        <EmptyState
          title="No Tools Registered"
          description="Register custom tools and function calling schemas for AI agent execution."
          action={
            <Button variant="prismViolet" onClick={openCreateDrawer}>
              Register Tool
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {toolList.map((tool) => (
            <Card key={tool.id} className="flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{tool.displayName || tool.name}</span>
                  </div>
                  <Badge variant={tool.enabled ? 'success' : 'secondary'} className="text-[10px]">
                    {tool.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{tool.description || 'No description provided'}</p>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                <div className="text-[11px] font-mono bg-muted/40 p-2 rounded border border-border">
                  <span className="text-muted-foreground">Function:</span> <span className="text-foreground font-semibold">{tool.name}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => openTestModal(tool)}>
                    <Play className="h-3 w-3 text-primary" />
                    <span>Test Tool</span>
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => openEditDrawer(tool)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <ConfirmDialog
                      title="Delete Tool"
                      description={`Are you sure you want to delete tool "${tool.displayName || tool.name}"?`}
                      confirmText="Delete"
                      variant="destructive"
                      onConfirm={() => {
                        deleteMutation.mutate(tool.id, {
                          onSuccess: () => toast.success('Tool deleted successfully'),
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingTool ? 'Edit Registered Tool' : 'Register New Tool'}</SheetTitle>
            <SheetDescription>Configure function call schema for agent tool execution.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tool-name">Function Name (snake_case)</Label>
              <Input
                id="tool-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., search_web"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-display">Display Name</Label>
              <Input
                id="tool-display"
                value={formData.displayName}
                onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
                placeholder="e.g., Web Search Engine"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-desc">Description</Label>
              <Input
                id="tool-desc"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe tool purpose for AI model..."
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded border border-border bg-card">
              <Label htmlFor="tool-enabled" className="text-xs font-semibold cursor-pointer">Tool Enabled</Label>
              <Switch
                id="tool-enabled"
                checked={formData.enabled}
                onCheckedChange={(val) => setFormData((prev) => ({ ...prev, enabled: val }))}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="prismViolet" onClick={handleSubmit} disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? 'Saving...' : editingTool ? 'Save Changes' : 'Register Tool'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Test Execution Modal Sheet */}
      <Sheet open={testModalOpen} onOpenChange={setTestModalOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <span>Test Tool Execution: {testingTool?.displayName || testingTool?.name}</span>
            </SheetTitle>
            <SheetDescription>Provide JSON argument payload and evaluate execution output.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Input Arguments (JSON)</Label>
              <textarea
                className="w-full h-32 rounded-md border border-border bg-background p-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={testArgsJson}
                onChange={(e) => setTestArgsJson(e.target.value)}
                placeholder="{}"
              />
            </div>

            <Button variant="prismViolet" className="w-full gap-2" onClick={handleRunToolTest} disabled={testToolMutation.isPending}>
              <Play className="h-4 w-4" />
              <span>{testToolMutation.isPending ? 'Executing Tool...' : 'Execute Tool Test'}</span>
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