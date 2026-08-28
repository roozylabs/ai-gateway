'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge, StatusDot } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Switch } from '@/components/atoms/Switch';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/molecules/Dialog';
import {
  useResourcesQuery,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
} from '@/hooks/queries/useResourcesQuery';
import { ApiResource } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Database, Plus, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { toast } from 'sonner';

export default function ResourcesPage() {
  const { data: resources, isLoading, isError, refetch } = useResourcesQuery();
  const createMutation = useCreateResource();
  const updateMutation = useUpdateResource();
  const deleteMutation = useDeleteResource();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ApiResource | null>(null);

  const [formName, setFormName] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);

  const resetForm = () => {
    setFormName('');
    setFormDisplayName('');
    setFormDescription('');
    setFormEnabled(true);
    setEditingResource(null);
  };

  const openCreateDrawer = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditDrawer = (resource: ApiResource) => {
    setEditingResource(resource);
    setFormName(resource.name);
    setFormDisplayName(resource.displayName);
    setFormDescription(resource.description);
    setFormEnabled(resource.enabled);
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formName.trim()) return;

    const payload = {
      name: formName.trim(),
      displayName: formDisplayName.trim() || formName.trim(),
      description: formDescription.trim(),
      enabled: formEnabled,
    };

    if (editingResource) {
      updateMutation.mutate(
        { id: editingResource.id, data: payload },
        {
          onSuccess: () => {
            toast.success(`Resource "${payload.name}" updated`);
            setModalOpen(false);
            resetForm();
          },
          onError: (err: Error) => toast.error(`Failed to update resource: ${err.message}`),
        }
      );
    } else {
      createMutation.mutate(
        { ...payload, backends: [] },
        {
          onSuccess: () => {
            toast.success(`Resource "${payload.name}" created`);
            setModalOpen(false);
            resetForm();
          },
          onError: (err: Error) => toast.error(`Failed to create resource: ${err.message}`),
        }
      );
    }
  };

  const handleDelete = (resource: ApiResource) => {
    deleteMutation.mutate(resource.id, {
      onSuccess: () => toast.success(`Resource "${resource.name}" deleted`),
      onError: (err: Error) => toast.error(`Failed to delete resource: ${err.message}`),
    });
  };

  const resourceList: ApiResource[] = (resources && Array.isArray(resources)) ? resources : [];
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

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

      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Edit Resource' : 'Add Resource Source'}</DialogTitle>
            <DialogDescription>
              {editingResource
                ? 'Update the resource configuration.'
                : 'Connect a new document store, vector database, or static resource.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resource-name">Resource Name</Label>
              <Input
                id="resource-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., product-knowledge-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-display-name">Display Name</Label>
              <Input
                id="resource-display-name"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="e.g., Product Knowledge Base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-description">Description</Label>
              <Input
                id="resource-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe what this resource provides..."
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="resource-enabled">Enabled</Label>
                <p className="text-xs text-muted-foreground">Allow agents to access this resource</p>
              </div>
              <Switch id="resource-enabled" checked={formEnabled} onCheckedChange={setFormEnabled} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              variant="prismViolet"
              onClick={handleSubmit}
              disabled={!formName.trim() || isSubmitting}
            >
              {isSubmitting
                ? editingResource ? 'Saving...' : 'Creating...'
                : editingResource ? 'Save Changes' : 'Create Resource'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
