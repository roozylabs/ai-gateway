'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge, StatusDot } from '@/components/atoms/Badge';
import { useAgentsQuery, useCreateAgent, useUpdateAgent, useDeleteAgent } from '@/hooks/queries/useAgentsQuery';
import { ApiAgent } from '@/lib/api';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Bot, Plus, Settings, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/molecules/Dialog';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';

const AGENT_TYPES = ['general', 'code', 'research', 'ops', 'custom'];

function formatBudgetCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}/mo`;
}

interface AgentFormProps {
  name: string;
  displayName: string;
  description: string;
  agentType: string;
  maxBudgetCents: number;
  onNameChange: (v: string) => void;
  onDisplayNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onAgentTypeChange: (v: string) => void;
  onMaxBudgetCentsChange: (v: number) => void;
}

function AgentFormFields({
  name, displayName, description, agentType, maxBudgetCents,
  onNameChange, onDisplayNameChange, onDescriptionChange, onAgentTypeChange, onMaxBudgetCentsChange,
}: AgentFormProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="agent-name">Agent Name *</Label>
        <Input id="agent-name" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g., code-reviewer" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="agent-display-name">Display Name</Label>
        <Input id="agent-display-name" value={displayName} onChange={(e) => onDisplayNameChange(e.target.value)} placeholder="e.g., Code Reviewer" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="agent-description">Description</Label>
        <Input id="agent-description" value={description} onChange={(e) => onDescriptionChange(e.target.value)} placeholder="What this agent does..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="agent-type">Agent Type</Label>
        <Select value={agentType} onValueChange={onAgentTypeChange}>
          <SelectTrigger id="agent-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            {AGENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="agent-budget">Max Budget (cents/mo)</Label>
        <Input id="agent-budget" type="number" min={0} value={maxBudgetCents} onChange={(e) => onMaxBudgetCentsChange(Number(e.target.value))} placeholder="0" />
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const { data, isLoading, isError, refetch } = useAgentsQuery();
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const deleteMutation = useDeleteAgent();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<ApiAgent | null>(null);

  const [formName, setFormName] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAgentType, setFormAgentType] = useState('general');
  const [formMaxBudgetCents, setFormMaxBudgetCents] = useState(0);

  const resetForm = () => {
    setFormName('');
    setFormDisplayName('');
    setFormDescription('');
    setFormAgentType('general');
    setFormMaxBudgetCents(0);
    setEditingAgent(null);
  };

  const openCreateDrawer = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditDrawer = (agent: ApiAgent) => {
    setEditingAgent(agent);
    setFormName(agent.name);
    setFormDisplayName(agent.displayName);
    setFormDescription(agent.description);
    setFormAgentType(agent.agentType);
    setFormMaxBudgetCents(agent.maxBudgetCents);
    setModalOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      name: formName,
      displayName: formDisplayName || undefined,
      description: formDescription || undefined,
      agentType: formAgentType,
      maxBudgetCents: formMaxBudgetCents,
    };

    if (editingAgent) {
      updateMutation.mutate({ id: editingAgent.id, data: payload }, {
        onSuccess: () => {
          toast.success(`Agent "${formName}" updated`);
          setModalOpen(false);
          resetForm();
        },
        onError: (err: Error) => toast.error(`Failed to update: ${err.message}`),
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(`Agent "${formName}" created`);
          setModalOpen(false);
          resetForm();
        },
        onError: (err: Error) => toast.error(`Failed to create: ${err.message}`),
      });
    }
  };

  const handleDelete = (agent: ApiAgent) => {
    deleteMutation.mutate(agent.id, {
      onSuccess: () => toast.success(`Agent "${agent.name}" deleted`),
      onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
    });
  };

  const agents: ApiAgent[] = (data && Array.isArray(data)) ? data : [];
  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <AppLayout>
      <PageHeader
        title="Agent Gateway & Agent Catalog"
        description="Provision autonomous AI agent identities with bound system prompts, tool boundaries, and key quotas."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={openCreateDrawer}>
            <Plus className="h-4 w-4" /> Instantiate New Agent
          </Button>
        }
      />

      {isError ? (
        <ErrorState
          title="Failed to fetch agents"
          description="Could not communicate with the Prism Agent Gateway backend."
          onRetry={refetch}
        />
      ) : !isLoading && agents.length === 0 ? (
        <EmptyState
          title="No Agents Configured"
          description="There are no AI agents provisioned in this workspace yet."
          action={
            <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={openCreateDrawer}>
              <Plus className="h-4 w-4" /> Instantiate New Agent
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Bot className="h-5 w-5 text-[#8B5CF6]" />
                    <span>{agent.displayName || agent.name}</span>
                  </CardTitle>
                  <StatusDot status={agent.enabled ? 'healthy' : 'cooldown'} />
                </div>
                <CardDescription className="font-mono text-xs">{agent.description || `type: ${agent.agentType}`}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={agent.enabled ? 'success' : 'default'}>
                    {agent.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                {agent.allowedModels.length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Models</span>
                    <div className="flex gap-1 flex-wrap justify-end max-w-[180px]">
                      {agent.allowedModels.slice(0, 3).map((m) => (
                        <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                      ))}
                      {agent.allowedModels.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">+{agent.allowedModels.length - 3}</Badge>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Spend Cap</span>
                  <span className="font-mono text-emerald-500 font-bold">{formatBudgetCents(agent.maxBudgetCents)}</span>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border pt-3 gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => openEditDrawer(agent)}>
                  <Settings className="h-3.5 w-3.5" /> Configure
                </Button>
                <ConfirmDialog
                  title="Delete Agent"
                  description={`Delete agent "${agent.name}"? This cannot be undone.`}
                  confirmText="Delete"
                  onConfirm={() => handleDelete(agent)}
                  trigger={
                    <Button variant="destructive" size="sm" className="flex-1 gap-1.5 text-xs" disabled={isPending}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  }
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAgent ? 'Configure Agent' : 'Instantiate New Agent'}</DialogTitle>
            <DialogDescription>
              {editingAgent ? `Update settings for "${editingAgent.name}".` : 'Provision a new AI agent identity in this workspace.'}
            </DialogDescription>
          </DialogHeader>
          <AgentFormFields
            name={formName}
            displayName={formDisplayName}
            description={formDescription}
            agentType={formAgentType}
            maxBudgetCents={formMaxBudgetCents}
            onNameChange={setFormName}
            onDisplayNameChange={setFormDisplayName}
            onDescriptionChange={setFormDescription}
            onAgentTypeChange={setFormAgentType}
            onMaxBudgetCentsChange={setFormMaxBudgetCents}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              variant="prismViolet"
              onClick={handleSubmit}
              disabled={!formName.trim() || isPending}
            >
              {isPending ? 'Saving...' : editingAgent ? 'Update Agent' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
