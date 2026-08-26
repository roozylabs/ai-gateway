'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/molecules/Sheet';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Badge } from '@/components/atoms/Badge';
import { Switch } from '@/components/atoms/Switch';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { useToolsQuery, useCreateTool, useUpdateTool, useDeleteTool } from '@/hooks/queries/useToolsQuery';
import type { ApiTool } from '@/lib/api';
import { Wrench, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ToolsPage() {
  const { data: tools, isLoading, isError, refetch } = useToolsQuery();
  const createMutation = useCreateTool();
  const updateMutation = useUpdateTool();
  const deleteMutation = useDeleteTool();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ApiTool | null>(null);

  const [formName, setFormName] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);

  const resetForm = () => {
    setFormName('');
    setFormDisplayName('');
    setFormDescription('');
    setFormEnabled(true);
    setEditingTool(null);
  };

  const openCreateDrawer = () => {
    resetForm();
    setDrawerOpen(true);
  };

  const openEditDrawer = (tool: ApiTool) => {
    setEditingTool(tool);
    setFormName(tool.name);
    setFormDisplayName(tool.displayName);
    setFormDescription(tool.description);
    setFormEnabled(tool.enabled);
    setDrawerOpen(true);
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      toast.error('Tool name is required');
      return;
    }

    const payload = {
      name: formName.trim(),
      displayName: formDisplayName.trim() || formName.trim(),
      description: formDescription.trim(),
      enabled: formEnabled,
    };

    if (editingTool) {
      updateMutation.mutate(
        { id: editingTool.id, data: payload },
        {
          onSuccess: () => {
            toast.success('Tool updated');
            setDrawerOpen(false);
            resetForm();
          },
          onError: () => toast.error('Failed to update tool'),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Tool created');
          setDrawerOpen(false);
          resetForm();
        },
        onError: () => toast.error('Failed to create tool'),
      });
    }
  };

  const handleDelete = (tool: ApiTool) => {
    if (!window.confirm(`Delete tool "${tool.displayName || tool.name}"? This action cannot be undone.`)) return;

    deleteMutation.mutate(tool.id, {
      onSuccess: () => toast.success('Tool deleted'),
      onError: () => toast.error('Failed to delete tool'),
    });
  };

  const getParamCount = (schema: Record<string, any>): number => {
    if (!schema || typeof schema !== 'object') return 0;
    return Object.keys(schema.properties || schema).length;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Tool Gateway & Security Boundaries"
        description="Register executable tools, API functions, and security sandboxes for LLM function calling."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={openCreateDrawer}>
            <Plus className="h-4 w-4" /> Register Tool
          </Button>
        }
      />

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : !isLoading && tools?.length === 0 ? (
        <EmptyState
          title="No tools registered"
          description="Register your first tool to enable LLM function calling through the gateway."
          icon={<Wrench className="h-6 w-6" />}
          action={
            <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={openCreateDrawer}>
              <Plus className="h-4 w-4" /> Register Tool
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools?.map((tool) => (
            <Card key={tool.id} className="relative group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-[#8B5CF6] shrink-0" />
                      <span className="truncate">{tool.displayName || tool.name}</span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">{tool.name}</p>
                  </div>
                  <Badge variant={tool.enabled ? 'success' : 'outline'}>
                    {tool.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {tool.description || 'No description provided'}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {getParamCount(tool.inputSchema)} parameter{getParamCount(tool.inputSchema) !== 1 ? 's' : ''}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit tool"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDrawer(tool)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete tool"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(tool)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingTool ? 'Edit Tool' : 'Register Tool'}</SheetTitle>
            <SheetDescription>
              {editingTool
                ? 'Update the tool configuration and settings.'
                : 'Register a new tool for LLM function calling through the gateway.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tool-name">Name *</Label>
              <Input
                id="tool-name"
                placeholder="e.g. get_weather"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={!!editingTool}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for the tool (letters, numbers, underscores)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tool-display-name">Display Name</Label>
              <Input
                id="tool-display-name"
                placeholder="e.g. Get Weather"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tool-description">Description</Label>
              <Input
                id="tool-description"
                placeholder="Brief description of what this tool does"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="tool-enabled">Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  {formEnabled ? 'Tool is active and available' : 'Tool is disabled'}
                </p>
              </div>
              <Switch
                id="tool-enabled"
                checked={formEnabled}
                onCheckedChange={setFormEnabled}
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDrawerOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="prismViolet"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingTool
                ? updateMutation.isPending
                  ? 'Updating...'
                  : 'Update Tool'
                : createMutation.isPending
                  ? 'Creating...'
                  : 'Register Tool'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}