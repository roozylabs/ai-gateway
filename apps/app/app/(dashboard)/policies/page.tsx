'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardContent } from '@/components/molecules/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/molecules/Tabs';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { usePoliciesQuery, useUpdatePolicy, useDeletePolicy, useSetDefaultPolicy } from '@/hooks/queries/usePoliciesQuery';
import { ApiRoutingPolicy } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { getErrorMessage } from '@/types/ui';
import { PolicyFormDialog } from './_components/PolicyFormDialog';
import { PolicyTuner } from './_components/PolicyTuner';

export default function PoliciesPage() {
  const { data: policies, isLoading, isError, refetch } = usePoliciesQuery();
  const updateMutation = useUpdatePolicy();
  const deleteMutation = useDeletePolicy();
  const setDefaultMutation = useSetDefaultPolicy();

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedPolicy = policies?.find((p) => p.id === selectedPolicyId);

  useEffect(() => {
    if (policies && policies.length > 0 && !selectedPolicyId) {
      setSelectedPolicyId(policies[0].id);
    }
  }, [policies, selectedPolicyId]);

  const handleSaveWeights = (weights: { quality: number; cost: number; speed: number }) => {
    if (!selectedPolicyId) return;
    updateMutation.mutate(
      {
        id: selectedPolicyId,
        data: { weights },
      },
      {
        onSuccess: () => toast.success('Policy weights updated'),
        onError: (err) => toast.error(`Failed to update: ${getErrorMessage(err)}`),
      }
    );
  };

  const handleDelete = (policy: ApiRoutingPolicy) => {
    deleteMutation.mutate(policy.id, {
      onSuccess: () => {
        toast.success(`Policy "${policy.name}" deleted`);
        if (selectedPolicyId === policy.id) {
          setSelectedPolicyId(policies?.find((p) => p.id !== policy.id)?.id ?? '');
        }
      },
      onError: (err) => toast.error(`Failed to delete: ${getErrorMessage(err)}`),
    });
  };

  const handleSetDefault = (policy: ApiRoutingPolicy) => {
    setDefaultMutation.mutate(policy.id, {
      onSuccess: () => toast.success(`"${policy.name}" set as default`),
      onError: (err) => toast.error(`Failed to set default: ${getErrorMessage(err)}`),
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Routing Policies"
        description="Configure dynamic multi-factor routing policies to balance quality, cost, and latency."
        extra={
          <Button
            variant="prismViolet"
            size="sm"
            className="gap-1.5"
            onClick={() => setDrawerOpen(true)}
          >
            <Plus className="h-4 w-4" /> Create Custom Policy
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardContent className="py-12 text-center text-muted-foreground">Loading policies...</CardContent></Card>
          <Card><CardContent className="py-12 text-center text-muted-foreground">Loading policies...</CardContent></Card>
        </div>
      ) : isError ? (
        <ErrorState title="Failed to load policies" onRetry={() => refetch()} />
      ) : !policies || policies.length === 0 ? (
        <EmptyState
          title="No routing policies found"
          description="Create a routing policy to get started."
          action={<Button variant="prismViolet" size="sm" onClick={() => setDrawerOpen(true)}>Create Policy</Button>}
        />
      ) : (
        <Tabs defaultValue="tuner">
          <TabsList>
            <TabsTrigger value="tuner">Policy Weight Tuner</TabsTrigger>
            <TabsTrigger value="active">Active Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="tuner">
            <PolicyTuner
              policies={policies}
              selectedPolicyId={selectedPolicyId}
              selectedPolicy={selectedPolicy}
              onSelectedPolicyChange={setSelectedPolicyId}
              saving={updateMutation.isPending}
              onSave={handleSaveWeights}
            />
          </TabsContent>

          <TabsContent value="active">
            <div className="grid gap-4 lg:grid-cols-2">
              {policies.map((policy) => (
                <Card key={policy.id}>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{policy.name}</span>
                        {policy.isDefault && <Badge variant="violet">Default</Badge>}
                        {!policy.enabled && <Badge variant="outline">Disabled</Badge>}
                      </div>
                      <div className="flex items-center gap-1">
                        {!policy.isDefault && (
                          <ConfirmDialog
                            title="Set Default Policy"
                            description={`Set "${policy.name}" as the default routing policy for all gateway requests without explicit policy override?`}
                            confirmText="Set Default"
                            onConfirm={() => handleSetDefault(policy)}
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 gap-1 text-xs"
                                disabled={setDefaultMutation.isPending}
                              >
                                <Star className="h-3 w-3" /> Set Default
                              </Button>
                            }
                          />
                        )}
                        <ConfirmDialog
                          title="Delete Routing Policy"
                          description={`Delete policy "${policy.name}"? This cannot be undone.`}
                          confirmText="Delete"
                          onConfirm={() => handleDelete(policy)}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 gap-1 text-xs text-destructive hover:text-destructive"
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground font-mono">
                      {policy.weights?.quality != null && <span>Quality: {policy.weights.quality}%</span>}
                      {policy.weights?.cost != null && <span>Cost: {policy.weights.cost}%</span>}
                      {policy.weights?.speed != null && <span>Speed: {policy.weights.speed}%</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <PolicyFormDialog open={drawerOpen} onOpenChange={setDrawerOpen} />
    </AppLayout>
  );
}
