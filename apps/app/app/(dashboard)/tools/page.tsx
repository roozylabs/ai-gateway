"use client";

import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Card, CardHeader, CardContent } from "@/components/molecules/Card";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { ErrorState, EmptyState } from "@/components/molecules/StateAlerts";
import { useToolsQuery } from "@/hooks/queries/useToolsQuery";
import { ApiTool } from "@/lib/api";
import { Wrench, Plus, Pencil, Trash2, Play } from "lucide-react";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { useDeleteToolMutation } from "@/hooks/mutations/useToolMutations";
import { ToolFormDialog } from "./_components/ToolFormDialog";
import { ToolTestModal } from "./_components/ToolTestModal";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";

export default function ToolsPage() {
  const { data: tools, isLoading, isError, refetch } = useToolsQuery();
  const deleteMutation = useDeleteToolMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingTool, setTestingTool] = useState<ApiTool | null>(null);
  const [editingTool, setEditingTool] = useState<ApiTool | null>(null);

  const openTestModal = (tool: ApiTool) => {
    setTestingTool(tool);
    setTestModalOpen(true);
  };

  const openCreateDrawer = () => {
    setEditingTool(null);
    setModalOpen(true);
  };

  const openEditDrawer = (tool: ApiTool) => {
    setEditingTool(tool);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Tool Gateway & Function Registry"
          description="Register and manage dynamic function call schemas for AI agent execution."
        />
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Loading tools...
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <PageHeader
          title="Tool Gateway & Function Registry"
          description="Register and manage dynamic function call schemas for AI agent execution."
        />
        <Card>
          <CardContent className="py-8">
            <ErrorState
              title="Failed to load tool registry"
              onRetry={() => refetch()}
            />
          </CardContent>
        </Card>
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
          <Button
            variant="prismViolet"
            onClick={openCreateDrawer}
            className="gap-2"
          >
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
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {toolList.map((tool) => (
            <Card key={tool.id} className="flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">
                      {tool.displayName || tool.name}
                    </span>
                  </div>
                  <Badge
                    variant={tool.enabled ? "success" : "secondary"}
                    className="text-[10px]"
                  >
                    {tool.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {tool.description || "No description provided"}
                </p>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                <div className="text-[11px] font-mono bg-muted/40 p-2 rounded border border-border">
                  <span className="text-muted-foreground">Function:</span>{" "}
                  <span className="text-foreground font-semibold">
                    {tool.name}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => openTestModal(tool)}
                  >
                    <Play className="h-3 w-3 text-primary" />
                    <span>Test Tool</span>
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDrawer(tool)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <ConfirmDialog
                      title="Delete Tool"
                      description={`Are you sure you want to delete tool "${tool.displayName || tool.name}"?`}
                      confirmText="Delete"
                      variant="destructive"
                      onConfirm={() => {
                        deleteMutation.mutate(tool.id, {
                          onSuccess: () =>
                            toast.success("Tool deleted successfully"),
                          onError: (err) =>
                            toast.error(
                              `Delete failed: ${getErrorMessage(err)}`,
                            ),
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ToolFormDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingTool={editingTool}
      />

      <ToolTestModal
        open={testModalOpen}
        onOpenChange={setTestModalOpen}
        tool={testingTool}
      />
    </AppLayout>
  );
}
