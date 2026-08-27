'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/molecules/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/molecules/Tabs';
import { Button } from '@/components/atoms/Button';
import { Slider } from '@/components/atoms/Slider';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Switch } from '@/components/atoms/Switch';
import { usePoliciesQuery, useCreatePolicy, useUpdatePolicy, useDeletePolicy, useSetDefaultPolicy } from '@/hooks/queries/usePoliciesQuery';
import { ApiRoutingPolicy } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Workflow, Plus, Save, Sparkles, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/molecules/Sheet';

import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';

export default function PoliciesPage() {
  const { data: policies, isLoading, isError, refetch } = usePoliciesQuery();
  const createMutation = useCreatePolicy();
  const updateMutation = useUpdatePolicy();
  const deleteMutation = useDeletePolicy();
  const setDefaultMutation = useSetDefaultPolicy();

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [qualityWeight, setQualityWeight] = useState(40);
  const [costWeight, setCostWeight] = useState(30);
  const [speedWeight, setSpeedWeight] = useState(20);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formQuality, setFormQuality] = useState(40);
  const [formCost, setFormCost] = useState(30);
  const [formSpeed, setFormSpeed] = useState(20);

  const selectedPolicy = policies?.find((p) => p.id === selectedPolicyId);

  useEffect(() => {
    if (policies && policies.length > 0 && !selectedPolicyId) {
      setSelectedPolicyId(policies[0].id);
    }
  }, [policies, selectedPolicyId]);

  useEffect(() => {
    if (selectedPolicy) {
      setQualityWeight(selectedPolicy.weights.quality ?? 40);
      setCostWeight(selectedPolicy.weights.cost ?? 30);
      setSpeedWeight(selectedPolicy.weights.speed ?? 20);
    }
  }, [selectedPolicy]);

  const handleSave = () => {
    if (!selectedPolicyId) return;
    updateMutation.mutate(
      {
        id: selectedPolicyId,
        data: {
          weights: {
            quality: qualityWeight,
            cost: costWeight,
            speed: speedWeight,
          },
        },
      },
      {
        onSuccess: () => toast.success('Policy weights updated'),
        onError: (err: Error) => toast.error(`Failed to update: ${err.message}`),
      }
    );
  };

  const handleCreate = () => {
    if (!formName.trim()) return;
    createMutation.mutate(
      {
        name: formName.trim(),
        weights: {
          quality: formQuality,
          cost: formCost,
          speed: formSpeed,
        },
        constraints: {},
        enabled: true,
      },
      {
        onSuccess: (created) => {
          toast.success(`Policy "${created.name}" created`);
          setDrawerOpen(false);
          setFormName('');
          setFormQuality(40);
          setFormCost(30);
          setFormSpeed(20);
        },
        onError: (err: Error) => toast.error(`Failed to create: ${err.message}`),
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
      onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
    });
  };

  const handleSetDefault = (policy: ApiRoutingPolicy) => {
    setDefaultMutation.mutate(policy.id, {
      onSuccess: () => toast.success(`"${policy.name}" set as default`),
      onError: (err: Error) => toast.error(`Failed to set default: ${err.message}`),
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#8B5CF6]" />
                  <span>Tune Policy Weights</span>
                </CardTitle>
                <CardDescription>Select a policy and adjust its routing weight sliders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Select Policy</Label>
                  <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a policy" />
                    </SelectTrigger>
                    <SelectContent>
                      {policies.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}{p.isDefault ? ' (Default)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">Quality Factor</span>
                    <span className="font-mono font-bold text-[#8B5CF6]">{qualityWeight}%</span>
                  </div>
                  <Slider
                    value={[qualityWeight]}
                    onValueChange={(val) => setQualityWeight(val[0])}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">Cost Optimization</span>
                    <span className="font-mono font-bold text-emerald-500">{costWeight}%</span>
                  </div>
                  <Slider
                    value={[costWeight]}
                    onValueChange={(val) => setCostWeight(val[0])}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">Speed & Latency</span>
                    <span className="font-mono font-bold text-cyan-500">{speedWeight}%</span>
                  </div>
                  <Slider
                    value={[speedWeight]}
                    onValueChange={(val) => setSpeedWeight(val[0])}
                    max={100}
                    step={5}
                  />
                </div>

                <Button
                  variant="prismViolet"
                  className="w-full gap-2 mt-4"
                  onClick={handleSave}
                  disabled={!selectedPolicyId || updateMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Policy Parameters'}
                </Button>
              </CardContent>
            </Card>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 gap-1 text-xs"
                            onClick={() => handleSetDefault(policy)}
                            disabled={setDefaultMutation.isPending}
                          >
                            <Star className="h-3 w-3" /> Set Default
                          </Button>
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
                      {policy.weights.quality != null && <span>Quality: {policy.weights.quality}%</span>}
                      {policy.weights.cost != null && <span>Cost: {policy.weights.cost}%</span>}
                      {policy.weights.speed != null && <span>Speed: {policy.weights.speed}%</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create Custom Policy</SheetTitle>
            <SheetDescription>Define a new routing policy with custom weight parameters</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Policy Name</Label>
              <Input
                placeholder="e.g. cost-priority"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label className="font-semibold">Quality</Label>
                <span className="font-mono font-bold text-[#8B5CF6]">{formQuality}%</span>
              </div>
              <Slider
                value={[formQuality]}
                onValueChange={(val) => setFormQuality(val[0])}
                max={100}
                step={5}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label className="font-semibold">Cost</Label>
                <span className="font-mono font-bold text-emerald-500">{formCost}%</span>
              </div>
              <Slider
                value={[formCost]}
                onValueChange={(val) => setFormCost(val[0])}
                max={100}
                step={5}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label className="font-semibold">Speed</Label>
                <span className="font-mono font-bold text-cyan-500">{formSpeed}%</span>
              </div>
              <Slider
                value={[formSpeed]}
                onValueChange={(val) => setFormSpeed(val[0])}
                max={100}
                step={5}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              variant="prismViolet"
              onClick={handleCreate}
              disabled={!formName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Policy'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
