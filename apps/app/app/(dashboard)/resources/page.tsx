'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge, StatusDot } from '@/components/atoms/Badge';
import {
  useResourcesQuery,
  useDeleteResource,
} from '@/hooks/queries/useResourcesQuery';
import { ApiResource } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Database, Plus, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { toast } from 'sonner';
import { getErrorMessage } from '@/types/ui';
import { ResourceFormDialog } from './_components/ResourceFormDialog';

export default function ResourcesPage() {
  const { data: resources, isLoading, isError, refetch } = useResourcesQuery();
  const deleteMutation = useDeleteResource();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ApiResource | null>(null);

  const openCreateDrawer = () => {
    setEditingResource(null);
    setModalOpen(true);
  };

  const openEditDrawer = (resource: ApiResource) => {
    setEditingResource(resource);
    setModalOpen(true);
  };

  const handleDelete = (resource: ApiResource) => {
    deleteMutation.mutate(resource.id, {
      onSuccess: () => toast.success(`Resource "${resource.name}" deleted`),
      onError: (err) => toast.error(`Failed to delete resource: ${getErrorMessage(err)}`),
    });
  };

  const resourceList: ApiResource[] = (resources && Array.isArray(resources)) ? resources : [];

  return (
    <AppLayout>
      <PageHeader
        title="Resource Gateway & Knowledge Sources"
        description="Connect document stores, vector databases, and static resources for context injection."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={openCreateDrawer}>
            <Plus className="h-4 w-4" /> Add Resource Source
          </Button>
        }
      />

      {isError ? (
        <ErrorState
          title="Failed to load resources"
          description="Could not communicate with Prism Resource Gateway backend."
          onRetry={refetch}
        />
      ) : !isLoading && resourceList.length === 0 ? (
        <EmptyState
          title="No Resources Configured"
          description="Connect a document store, vector database, or static resource for context injection."
          action={
            <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={openCreateDrawer}>
              <Plus className="h-4 w-4" /> Add Resource Source
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {resourceList.map((resource) => (
            <Card key={resource.id} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <span>{resource.displayName || resource.name}</span>
                  </CardTitle>
                  <StatusDot status={resource.enabled ? 'healthy' : 'disabled'} />
                </div>
                <p className="font-mono text-xs text-muted-foreground truncate">{resource.name}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {resource.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
                )}
                <div className="flex items-center justify-between text-xs border-t border-border pt-3">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={resource.enabled ? 'success' : 'outline'}>
                    {resource.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardContent>
              <CardContent className="border-t border-border pt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() => openEditDrawer(resource)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <ConfirmDialog
                  title="Delete Resource"
                  description={`Delete resource "${resource.name}"? This cannot be undone.`}
                  confirmText="Delete"
                  onConfirm={() => handleDelete(resource)}
                  trigger={
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ResourceFormDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingResource={editingResource}
      />
    </AppLayout>
  );
}
