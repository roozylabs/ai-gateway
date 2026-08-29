'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import {
  useGovernanceQuery,
  useDeleteGovernancePolicy,
} from '@/hooks/queries/useGovernanceQuery';
import type { ApiGovernancePolicy } from '@/lib/api';
import { Plus, Shield, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { toast } from 'sonner';
import { getErrorMessage } from '@/types/ui';
import { GovernancePolicyForm } from './_components/GovernancePolicyForm';

export default function GovernancePage() {
  const { data, isLoading, isError, refetch } = useGovernanceQuery();
  const deleteMutation = useDeleteGovernancePolicy();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<ApiGovernancePolicy | null>(null);

  const policies: ApiGovernancePolicy[] = (data && Array.isArray(data)) ? data : [];

  const openCreate = () => {
    setEditingId(null);
    setEditingPolicy(null);
    setDrawerOpen(true);
  };

  const openEdit = (policy: ApiGovernancePolicy) => {
    setEditingId(policy.id);
    setEditingPolicy(policy);
    setDrawerOpen(true);
  };

  const handleDelete = (policy: ApiGovernancePolicy) => {
    deleteMutation.mutate(policy.id, {
      onSuccess: () => toast.success(`${policy.name} deleted`),
      onError: (err) => toast.error(`Delete failed: ${getErrorMessage(err)}`),
    });
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
          pageSize={10}
          searchPlaceholder="Search policies..."
          emptyText="No policies match your search"
        />
      )}

      <GovernancePolicyForm
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editingId={editingId}
        editingPolicy={editingPolicy}
      />
    </AppLayout>
  );
}
