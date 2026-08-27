'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/molecules/Tabs';
import { Progress } from '@/components/atoms/Progress';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { useBudgetsQuery, useBudgetStatusQuery, useCreateBudget, useDeleteBudget } from '@/hooks/queries/useBudgetsQuery';
import { useQuotasQuery, useUpdateQuota } from '@/hooks/queries/useQuotasQuery';
import { ApiBudget, ApiTenantQuota } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Wallet, Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/molecules/Sheet';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Switch } from '@/components/atoms/Switch';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';

export default function BudgetsPage() {
  const { data: budgets, isLoading: budgetsLoading, isError: budgetsError, refetch: refetchBudgets } = useBudgetsQuery();
  const { data: budgetStatus, isLoading: statusLoading, isError: statusError, refetch: refetchStatus } = useBudgetStatusQuery();
  const { data: quotasData, isLoading: quotasLoading, isError: quotasError, refetch: refetchQuotas } = useQuotasQuery();
  const createMutation = useCreateBudget();
  const deleteMutation = useDeleteBudget();
  const updateQuotaMutation = useUpdateQuota();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quotaSheetOpen, setQuotaSheetOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<ApiTenantQuota | null>(null);

  const [formName, setFormName] = useState('');
  const [formMonthlyLimit, setFormMonthlyLimit] = useState('');
  const [formDailyLimit, setFormDailyLimit] = useState('');
  const [formHardLimit, setFormHardLimit] = useState(true);
  const [formWarningThreshold, setFormWarningThreshold] = useState('80');
  const [formCriticalThreshold, setFormCriticalThreshold] = useState('95');

  // Quota form states
  const [quotaMonthlyUsd, setQuotaMonthlyUsd] = useState('');
  const [quotaDailyUsd, setQuotaDailyUsd] = useState('');
  const [quotaDailyReq, setQuotaDailyReq] = useState('');
  const [quotaMaxStreams, setQuotaMaxStreams] = useState('');

  const quotasList: ApiTenantQuota[] = quotasData?.data ?? [];

  const openQuotaEdit = (q: ApiTenantQuota) => {
    setEditingQuota(q);
    setQuotaMonthlyUsd(String(q.monthlySpendLimitUsd ?? 0));
    setQuotaDailyUsd(String(q.dailySpendLimitUsd ?? 0));
    setQuotaDailyReq(String(q.dailyRequestLimit ?? 0));
    setQuotaMaxStreams(String(q.maxConcurrentStreams ?? 0));
    setQuotaSheetOpen(true);
  };

  const handleUpdateQuota = () => {
    if (!editingQuota) return;
    updateQuotaMutation.mutate(
      {
        targetType: editingQuota.targetType,
        targetId: editingQuota.targetId,
        data: {
          monthlySpendLimitUsd: parseFloat(quotaMonthlyUsd) || 0,
          dailySpendLimitUsd: parseFloat(quotaDailyUsd) || 0,
          dailyRequestLimit: parseInt(quotaDailyReq, 10) || 0,
          maxConcurrentStreams: parseInt(quotaMaxStreams, 10) || 0,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Quota for ${editingQuota.targetType}:${editingQuota.targetId} updated`);
          setQuotaSheetOpen(false);
        },
        onError: (err: Error) => toast.error(`Quota update failed: ${err.message}`),
      }
    );
  };

  const quotaColumns: Column<ApiTenantQuota>[] = [
    {
      title: 'Target Type',
      dataIndex: 'targetType',
      key: 'targetType',
      render: (type) => <Badge variant="violet">{String(type).toUpperCase()}</Badge>,
    },
    {
      title: 'Target ID',
      dataIndex: 'targetId',
      key: 'targetId',
      render: (id) => <span className="font-mono text-xs text-foreground font-semibold">{String(id)}</span>,
    },
    {
      title: 'Monthly Limit ($)',
      dataIndex: 'monthlySpendLimitUsd',
      key: 'monthlyLimit',
      render: (val) => <span className="font-mono text-xs font-bold text-emerald-500">${(val as number ?? 0).toFixed(2)}</span>,
    },
    {
      title: 'Daily Limit ($)',
      dataIndex: 'dailySpendLimitUsd',
      key: 'dailyLimit',
      render: (val) => <span className="font-mono text-xs">${(val as number ?? 0).toFixed(2)}</span>,
    },
    {
      title: 'Daily Req Limit',
      dataIndex: 'dailyRequestLimit',
      key: 'dailyReq',
      render: (val) => <span className="font-mono text-xs">{(val as number ?? 0).toLocaleString()} reqs</span>,
    },
    {
      title: 'Max Streams',
      dataIndex: 'maxConcurrentStreams',
      key: 'maxStreams',
      render: (val) => <span className="font-mono text-xs">{String(val ?? 0)}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openQuotaEdit(record)}>
          <Pencil className="h-3 w-3" /> Edit Quota
        </Button>
      ),
    },
  ];

  const monthlySpent = budgetStatus?.monthlySpent ?? 0;
  const monthlyLimit = budgetStatus?.budget?.monthlyLimit ?? 0;
  const usagePercent = budgetStatus?.usagePercent ?? 0;
  const statusLabel = budgetStatus?.status ?? 'healthy';

  const resetForm = () => {
    setFormName('');
    setFormMonthlyLimit('');
    setFormDailyLimit('');
    setFormHardLimit(true);
    setFormWarningThreshold('80');
    setFormCriticalThreshold('95');
  };

  const handleCreate = () => {
    if (!formName.trim() || !formMonthlyLimit) return;
    createMutation.mutate(
      {
        name: formName.trim(),
        monthlyLimit: parseFloat(formMonthlyLimit),
        dailyLimit: formDailyLimit ? parseFloat(formDailyLimit) : 0,
        hardLimit: formHardLimit,
        warningThreshold: parseFloat(formWarningThreshold) || 80,
        criticalThreshold: parseFloat(formCriticalThreshold) || 95,
        enabled: true,
      },
      {
        onSuccess: () => {
          toast.success('Budget created successfully');
          setDrawerOpen(false);
          resetForm();
        },
        onError: (err: Error) => toast.error(`Failed to create budget: ${err.message}`),
      }
    );
  };

  const handleDelete = (budget: ApiBudget) => {
    deleteMutation.mutate(budget.id, {
      onSuccess: () => toast.success(`Budget "${budget.name}" deleted`),
      onError: (err: Error) => toast.error(`Failed to delete budget: ${err.message}`),
    });
  };

  const budgetColumns: Column<ApiBudget>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span className="font-semibold text-foreground">{name}</span>,
    },
    {
      title: 'Monthly Limit',
      dataIndex: 'monthlyLimit',
      key: 'monthlyLimit',
      render: (val) => <span className="font-mono text-sm">${(val as number).toFixed(2)}</span>,
    },
    {
      title: 'Daily Limit',
      dataIndex: 'dailyLimit',
      key: 'dailyLimit',
      render: (val) => <span className="font-mono text-sm">{(val as number) > 0 ? `$${(val as number).toFixed(2)}` : '—'}</span>,
    },
    {
      title: 'Hard Limit',
      dataIndex: 'hardLimit',
      key: 'hardLimit',
      render: (val) => (
        <Badge variant={val ? 'destructive' : 'outline'}>
          {val ? 'Enforced' : 'Advisory'}
        </Badge>
      ),
    },
    {
      title: 'Thresholds',
      key: 'thresholds',
      render: (_, record) => (
        <span className="text-xs text-muted-foreground">
          {record.warningThreshold}% / {record.criticalThreshold}%
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (val) => (
        <Badge variant={val ? 'success' : 'outline'}>
          {val ? 'Active' : 'Disabled'}
        </Badge>
      ),
    },
    {
      title: '',
      key: 'actions',
      render: (_, record) => (
        <ConfirmDialog
          title="Delete Budget"
          description={`Delete budget "${record.name}"? This cannot be undone.`}
          confirmText="Delete"
          onConfirm={() => handleDelete(record)}
          trigger={
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 text-xs"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          }
        />
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Budgets & Multi-Tenant Quotas"
        description="Set spend caps, token rate limits, and threshold notifications across Organizations, Workspaces, Agents, and Users."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4" /> Create Budget Limit
          </Button>
        }
      />

      <Tabs defaultValue="budgets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="budgets">Global Budgets</TabsTrigger>
          <TabsTrigger value="quotas">Multi-Tenant Quotas</TabsTrigger>
        </TabsList>

        <TabsContent value="budgets" className="space-y-4">
          {budgetsError || statusError ? (
            <ErrorState
              title="Failed to load budget data"
              description="Could not connect to Prism Metering & Billing engine."
              onRetry={() => { refetchBudgets(); refetchStatus(); }}
            />
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-[#8B5CF6]" />
                        <span>Monthly Organization Budget</span>
                      </CardTitle>
                      <Badge variant={usagePercent > 80 ? 'destructive' : 'success'}>
                        {100 - Math.round(usagePercent)}% Available
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-2xl font-bold text-foreground">
                        ${monthlySpent.toFixed(2)}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        Limit: ${monthlyLimit.toFixed(2)} / month
                      </span>
                    </div>
                    <Progress value={statusLoading ? 0 : Math.min(100, Math.round(usagePercent))} />
                    <p className="text-xs text-muted-foreground">
                      {statusLabel === 'exceeded'
                        ? 'Budget limit exceeded.'
                        : statusLabel === 'critical'
                          ? 'Approaching critical threshold.'
                          : statusLabel === 'warning'
                            ? 'Approaching warning threshold.'
                            : 'Spending is within normal range.'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Budget Limits</CardTitle>
                </CardHeader>
                <CardContent>
                  {!budgetsLoading && (!budgets || budgets.length === 0) ? (
                    <EmptyState
                      title="No Budgets Configured"
                      description="Create a budget limit to start tracking spending."
                      action={
                        <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => setDrawerOpen(true)}>
                          <Plus className="h-4 w-4" /> Create Budget Limit
                        </Button>
                      }
                    />
                  ) : (
                    <DataTable
                      dataSource={budgets ?? []}
                      columns={budgetColumns}
                      rowKey="id"
                      loading={budgetsLoading}
                      pageSize={10}
                      searchPlaceholder="Search budgets..."
                    />
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="quotas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[#8B5CF6]" />
                <span>Multi-Tenant Workspace & Agent Quotas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quotasError ? (
                <ErrorState
                  title="Failed to load quotas"
                  description="Could not connect to Prism Multi-Tenant Quota engine."
                  onRetry={refetchQuotas}
                />
              ) : !quotasLoading && quotasList.length === 0 ? (
                <EmptyState
                  title="No Quotas Configured"
                  description="There are no specific multi-tenant quotas set yet."
                />
              ) : (
                <DataTable
                  dataSource={quotasList}
                  columns={quotaColumns}
                  rowKey="id"
                  loading={quotasLoading}
                  pageSize={10}
                  searchPlaceholder="Search quotas by target..."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={drawerOpen} onOpenChange={(open) => { setDrawerOpen(open); if (!open) resetForm(); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create Budget Limit</SheetTitle>
            <SheetDescription>Set a new spending cap with threshold notifications.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="budget-name">Budget Name</Label>
              <Input id="budget-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Organization Monthly Cap" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget-monthly">Monthly Limit ($)</Label>
                <Input id="budget-monthly" type="number" step="0.01" min="0" value={formMonthlyLimit} onChange={(e) => setFormMonthlyLimit(e.target.value)} placeholder="1000.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-daily">Daily Limit ($)</Label>
                <Input id="budget-daily" type="number" step="0.01" min="0" value={formDailyLimit} onChange={(e) => setFormDailyLimit(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="budget-hard">Hard Limit</Label>
                <p className="text-xs text-muted-foreground">Block requests when limit is exceeded</p>
              </div>
              <Switch id="budget-hard" checked={formHardLimit} onCheckedChange={setFormHardLimit} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget-warn">Warning Threshold (%)</Label>
                <Input id="budget-warn" type="number" min="0" max="100" value={formWarningThreshold} onChange={(e) => setFormWarningThreshold(e.target.value)} placeholder="80" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-crit">Critical Threshold (%)</Label>
                <Input id="budget-crit" type="number" min="0" max="100" value={formCriticalThreshold} onChange={(e) => setFormCriticalThreshold(e.target.value)} placeholder="95" />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => { setDrawerOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              variant="prismViolet"
              onClick={handleCreate}
              disabled={!formName.trim() || !formMonthlyLimit || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Budget'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={quotaSheetOpen} onOpenChange={setQuotaSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Quota Limits</SheetTitle>
            <SheetDescription>
              Update rate and spend limits for {editingQuota?.targetType}:{editingQuota?.targetId}.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quota-monthly">Monthly Spend Limit ($)</Label>
                <Input id="quota-monthly" type="number" step="0.01" value={quotaMonthlyUsd} onChange={(e) => setQuotaMonthlyUsd(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quota-daily">Daily Spend Limit ($)</Label>
                <Input id="quota-daily" type="number" step="0.01" value={quotaDailyUsd} onChange={(e) => setQuotaDailyUsd(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quota-reqs">Daily Request Limit</Label>
                <Input id="quota-reqs" type="number" value={quotaDailyReq} onChange={(e) => setQuotaDailyReq(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quota-streams">Max Concurrent Streams</Label>
                <Input id="quota-streams" type="number" value={quotaMaxStreams} onChange={(e) => setQuotaMaxStreams(e.target.value)} />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setQuotaSheetOpen(false)}>Cancel</Button>
            <Button
              variant="prismViolet"
              onClick={handleUpdateQuota}
              disabled={updateQuotaMutation.isPending}
            >
              {updateQuotaMutation.isPending ? 'Saving...' : 'Update Quota'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
