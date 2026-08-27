'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { Textarea } from '@/components/atoms/Textarea';
import { Label } from '@/components/atoms/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/molecules/Sheet';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import {
  useGovernanceQuery,
  useCreateGovernancePolicy,
  useUpdateGovernancePolicy,
  useDeleteGovernancePolicy,
} from '@/hooks/queries/useGovernanceQuery';
import type { ApiGovernancePolicy, ApiCreateGovernancePolicyRequest } from '@/lib/api';
import { Plus, Shield, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { toast } from 'sonner';

const defaultForm: ApiCreateGovernancePolicyRequest = {
  name: '',
  description: '',
  role: '',
  effect: 'allow',
  agentPattern: '*',
  modelPattern: '*',
  toolPattern: '*',
  resourcePattern: '*',
  priority: 100,
  enabled: true,
};

export default function GovernancePage() {
  const { data, isLoading, isError, refetch } = useGovernanceQuery();
  const createMutation = useCreateGovernancePolicy();
  const updateMutation = useUpdateGovernancePolicy();
  const deleteMutation = useDeleteGovernancePolicy();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ApiCreateGovernancePolicyRequest>(defaultForm);

  const policies: ApiGovernancePolicy[] = (data && Array.isArray(data)) ? data : [];

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDrawerOpen(true);
  };

  const openEdit = (policy: ApiGovernancePolicy) => {
    setEditingId(policy.id);
    setForm({
      name: policy.name,
      description: policy.description,
      role: policy.role,
      effect: policy.effect,
      agentPattern: policy.agentPattern,
      modelPattern: policy.modelPattern,
      toolPattern: policy.toolPattern,
      resourcePattern: policy.resourcePattern,
      priority: policy.priority,
      enabled: policy.enabled,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name?.trim()) {
      toast.error('Policy name is required');
      return;
    }

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: form },
        {
          onSuccess: () => {
            toast.success('Policy updated');
            setDrawerOpen(false);
          },
          onError: (err: Error) => toast.error(`Update failed: ${err.message}`),
        }
      );
    } else {
      createMutation.mutate(form, {
        onSuccess: () => {
          toast.success('Policy created');
          setDrawerOpen(false);
          setForm(defaultForm);
        },
        onError: (err: Error) => toast.error(`Create failed: ${err.message}`),
      });
    }
  };

  const handleDelete = (policy: ApiGovernancePolicy) => {
    deleteMutation.mutate(policy.id, {
      onSuccess: () => toast.success(`${policy.name} deleted`),
      onError: (err: Error) => toast.error(`Delete failed: ${err.message}`),
    });
  };

  const setField = (field: keyof ApiCreateGovernancePolicyRequest, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const columns: Column<ApiGovernancePolicy>[] = [
    { title: 'Name', dataIndex: 'name', key: 'name', className: 'font-medium' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
    {
      title: 'Effect',
      dataIndex: 'effect',
      key: 'effect',
      render: (val) => (
        <Badge variant={val === 'deny' ? 'destructive' : 'success'}>
          {String(val)}
        </Badge>
      ),
    },
    { title: 'Agent', dataIndex: 'agentPattern', key: 'agentPattern', className: 'font-mono text-[11px]' },
    { title: 'Model', dataIndex: 'modelPattern', key: 'modelPattern', className: 'font-mono text-[11px]' },
    { title: 'Tool', dataIndex: 'toolPattern', key: 'toolPattern', className: 'font-mono text-[11px]' },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (val) => <span className="font-mono text-[11px]">{String(val)}</span>,
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (val) => (
        <Badge variant={val ? 'success' : 'default'}>{val ? 'Yes' : 'No'}</Badge>
      ),
    },
    {
      title: '',
      key: 'actions',
      render: (_val, record) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(record)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <ConfirmDialog
            title="Delete Governance Policy"
            description={`Delete policy "${record.name}"? This cannot be undone.`}
            confirmText="Delete"
            onConfirm={() => handleDelete(record)}
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            }
          />
        </div>
      ),
      className: 'w-[70px]',
    },
  ];

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <PageHeader
        title="Governance & RBAC Permission Matrix"
        description="Configure fine-grained Role-Based Access Control (Owner, Admin, Developer, Viewer) permissions."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Create Governance Policy
          </Button>
        }
      />

      {isError ? (
        <ErrorState
          title="Failed to fetch governance policies"
          description="Could not communicate with the Prism API backend."
          onRetry={refetch}
        />
      ) : !isLoading && policies.length === 0 ? (
        <EmptyState
          title="No Governance Policies"
          description="No RBAC policies have been configured yet. Create one to define access rules."
          icon={<Shield className="h-6 w-6" />}
          action={
            <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Create Governance Policy
            </Button>
          }
        />
      ) : (
        <DataTable<ApiGovernancePolicy>
          dataSource={policies}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          searchPlaceholder="Search policies..."
          emptyText="No policies match your search"
        />
      )}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit Governance Policy' : 'Create Governance Policy'}</SheetTitle>
            <SheetDescription>
              {editingId ? 'Update the RBAC policy configuration.' : 'Define a new fine-grained access control rule.'}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="policy-name">Name *</Label>
              <Input id="policy-name" value={form.name || ''} onChange={(e) => setField('name', e.target.value)} placeholder="e.g., Block External Models" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-desc">Description</Label>
              <Textarea id="policy-desc" value={form.description || ''} onChange={(e) => setField('description', e.target.value)} placeholder="Optional description" className="min-h-[60px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-role">Role</Label>
              <Input id="policy-role" value={form.role || ''} onChange={(e) => setField('role', e.target.value)} placeholder="e.g., developer, admin, viewer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-effect">Effect</Label>
              <Select value={form.effect || 'allow'} onValueChange={(v) => setField('effect', v)}>
                <SelectTrigger id="policy-effect"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="deny">Deny</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-agent">Agent Pattern</Label>
              <Input id="policy-agent" value={form.agentPattern || ''} onChange={(e) => setField('agentPattern', e.target.value)} placeholder="* for all" className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-model">Model Pattern</Label>
              <Input id="policy-model" value={form.modelPattern || ''} onChange={(e) => setField('modelPattern', e.target.value)} placeholder="* for all" className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-tool">Tool Pattern</Label>
              <Input id="policy-tool" value={form.toolPattern || ''} onChange={(e) => setField('toolPattern', e.target.value)} placeholder="* for all" className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-resource">Resource Pattern</Label>
              <Input id="policy-resource" value={form.resourcePattern || ''} onChange={(e) => setField('resourcePattern', e.target.value)} placeholder="* for all" className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-priority">Priority</Label>
              <Input id="policy-priority" type="number" value={form.priority ?? 100} onChange={(e) => setField('priority', Number(e.target.value))} className="font-mono text-xs" />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="prismViolet" onClick={handleSubmit} disabled={!form.name?.trim() || isSubmitting}>
              {isSubmitting ? 'Saving...' : editingId ? 'Update Policy' : 'Create Policy'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
