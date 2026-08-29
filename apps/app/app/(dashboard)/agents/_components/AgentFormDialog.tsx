"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/molecules/Select";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/molecules/Dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/molecules/Form";
import { MultiSelect, MultiSelectOption } from "@/components/molecules/MultiSelect";
import { NumberInput } from "@/components/molecules/NumberInput";
import { useCreateAgent, useUpdateAgent } from "@/hooks/queries/useAgentsQuery";
import { ApiAgent, ApiCreateAgentRequest } from "@/lib/api";
import { Pencil, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";

const AGENT_TYPES = ["general", "code", "research", "ops", "custom"];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const agentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  displayName: z.string().default(""),
  description: z.string().default(""),
  agentType: z.string().default("general"),
  maxBudgetCents: z.number().default(0),
  allowedTools: z.array(z.string()).default([]),
  allowedResources: z.array(z.string()).default([]),
  allowedMcpServers: z.array(z.string()).default([]),
});

type AgentFormValues = z.infer<typeof agentSchema>;

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAgent: ApiAgent | null;
  toolOptions: MultiSelectOption[];
  resourceOptions: MultiSelectOption[];
  mcpServerOptions: MultiSelectOption[];
}

const defaultValues: AgentFormValues = {
  name: "",
  displayName: "",
  description: "",
  agentType: "general",
  maxBudgetCents: 0,
  allowedTools: [],
  allowedResources: [],
  allowedMcpServers: [],
};

export function AgentFormDialog({
  open,
  onOpenChange,
  editingAgent,
  toolOptions,
  resourceOptions,
  mcpServerOptions,
}: AgentFormDialogProps) {
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const [nameLocked, setNameLocked] = useState(true);

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues,
  });

  const { reset, watch } = form;
  const formName = watch("name");
  const formDisplayName = watch("displayName");

  useEffect(() => {
    if (!open) return;
    if (!editingAgent) {
      setNameLocked(true);
      reset(defaultValues);
      return;
    }
    setNameLocked(editingAgent.name === slugify(editingAgent.displayName));
    reset({
      name: editingAgent.name,
      displayName: editingAgent.displayName,
      description: editingAgent.description,
      agentType: editingAgent.agentType,
      maxBudgetCents: editingAgent.maxBudgetCents,
      allowedTools: editingAgent.allowedTools ?? [],
      allowedResources: editingAgent.allowedResources ?? [],
      allowedMcpServers: editingAgent.allowedMcpServers ?? [],
    });
  }, [open, editingAgent, reset]);

  const handleDisplayNameChange = (v: string) => {
    form.setValue("displayName", v, { shouldValidate: true });
    if (nameLocked) {
      form.setValue("name", slugify(v));
    }
  };

  const handleToggleNameLock = (locked: boolean) => {
    setNameLocked(locked);
    if (locked) {
      form.setValue("name", slugify(formDisplayName));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: AgentFormValues) => {
    const payload: ApiCreateAgentRequest = {
      name: values.name,
      displayName: values.displayName || undefined,
      description: values.description || undefined,
      agentType: values.agentType,
      maxBudgetCents: values.maxBudgetCents,
      allowedTools: values.allowedTools,
      allowedResources: values.allowedResources,
      allowedMcpServers: values.allowedMcpServers,
    };

    if (editingAgent) {
      updateMutation.mutate(
        { id: editingAgent.id, data: payload },
        {
          onSuccess: () => {
            toast.success(`Agent "${values.name}" updated`);
            onOpenChange(false);
          },
          onError: (err) =>
            toast.error(`Failed to update: ${getErrorMessage(err)}`),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(`Agent "${values.name}" created`);
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(`Failed to create: ${getErrorMessage(err)}`),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingAgent ? "Configure Agent" : "Instantiate New Agent"}
          </DialogTitle>
          <DialogDescription>
            {editingAgent
              ? `Update settings for "${editingAgent.name}".`
              : "Provision a new AI agent identity in this workspace."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => handleDisplayNameChange(e.target.value)}
                      placeholder="e.g., Code Reviewer"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>
                    Agent Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        readOnly={nameLocked}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="auto-from-display-name"
                        className={
                          nameLocked
                            ? "pr-10 bg-muted/50 text-muted-foreground"
                            : "pr-10"
                        }
                        disabled={isPending}
                      />
                      <button
                        type="button"
                        aria-label={
                          nameLocked
                            ? "Edit agent name"
                            : "Auto-generate from display name"
                        }
                        onClick={() => handleToggleNameLock(!nameLocked)}
                        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {nameLocked ? (
                          <Pencil className="h-3.5 w-3.5" />
                        ) : (
                          <LinkIcon className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  {nameLocked && (
                    <p className="text-[10px] text-muted-foreground">
                      Auto-generated from Display Name. Click the pencil to edit.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="What this agent does..."
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="agentType"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Agent Type</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AGENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxBudgetCents"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Max Budget (cents/mo)</FormLabel>
                  <FormControl>
                    <NumberInput
                      value={field.value}
                      onValueChange={field.onChange}
                      min={0}
                      step={100}
                      placeholder="0"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowedTools"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Allowed Tools</FormLabel>
                  <FormControl>
                    <MultiSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={toolOptions}
                      placeholder="Select tools..."
                      searchPlaceholder="Search tools..."
                      emptyMessage="No tools available."
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowedResources"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Allowed Resources</FormLabel>
                  <FormControl>
                    <MultiSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={resourceOptions}
                      placeholder="Select resources..."
                      searchPlaceholder="Search resources..."
                      emptyMessage="No resources available."
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowedMcpServers"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Allowed MCP Servers</FormLabel>
                  <FormControl>
                    <MultiSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={mcpServerOptions}
                      placeholder="Select MCP servers..."
                      searchPlaceholder="Search MCP servers..."
                      emptyMessage="No MCP servers available."
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="prismViolet"
                disabled={!formName.trim() || isPending}
              >
                {isPending
                  ? "Saving..."
                  : editingAgent
                    ? "Update Agent"
                    : "Create Agent"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
