"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/molecules/Select";
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from "@/components/molecules/Sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/molecules/Form";
import {
  useCreateGovernancePolicy,
  useUpdateGovernancePolicy,
} from "@/hooks/queries/useGovernanceQuery";
import type { ApiGovernancePolicy, ApiCreateGovernancePolicyRequest } from "@/lib/api";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";

import { governancePolicySchema, GovernancePolicyFormValues as PolicyFormValues } from "@/features/governance/schemas/governance-policy.schema";

interface GovernancePolicyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  editingPolicy: ApiGovernancePolicy | null;
}

const defaultValues: PolicyFormValues = {
  name: "",
  description: "",
  role: "",
  effect: "allow",
  agentPattern: "*",
  modelPattern: "*",
  toolPattern: "*",
  resourcePattern: "*",
  priority: 100,
  enabled: true,
};

export function GovernancePolicyForm({
  open,
  onOpenChange,
  editingId,
  editingPolicy,
}: GovernancePolicyFormProps) {
  const createMutation = useCreateGovernancePolicy();
  const updateMutation = useUpdateGovernancePolicy();

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(governancePolicySchema),
    defaultValues,
  });

  const { reset } = form;

  useEffect(() => {
    if (!open) return;
    if (!editingPolicy) {
      reset(defaultValues);
      return;
    }
    reset({
      name: editingPolicy.name,
      description: editingPolicy.description,
      role: editingPolicy.role,
      effect: editingPolicy.effect,
      agentPattern: editingPolicy.agentPattern,
      modelPattern: editingPolicy.modelPattern,
      toolPattern: editingPolicy.toolPattern,
      resourcePattern: editingPolicy.resourcePattern,
      priority: editingPolicy.priority,
      enabled: editingPolicy.enabled,
    });
  }, [open, editingPolicy, reset]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: PolicyFormValues) => {
    const payload: ApiCreateGovernancePolicyRequest = {
      name: values.name.trim(),
      description: values.description,
      role: values.role,
      effect: values.effect,
      agentPattern: values.agentPattern,
      modelPattern: values.modelPattern,
      toolPattern: values.toolPattern,
      resourcePattern: values.resourcePattern,
      priority: values.priority,
      enabled: values.enabled,
    };

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast.success("Policy updated");
            onOpenChange(false);
          },
          onError: (err) =>
            toast.error(`Update failed: ${getErrorMessage(err)}`),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Policy created");
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(`Create failed: ${getErrorMessage(err)}`),
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {editingId ? "Edit Governance Policy" : "Create Governance Policy"}
          </SheetTitle>
          <SheetDescription>
            {editingId
              ? "Update the RBAC policy configuration."
              : "Define a new fine-grained access control rule."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel required>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Block External Models"
                      disabled={isSubmitting}
                    />
                  </FormControl>
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
                    <Textarea
                      {...field}
                      placeholder="Optional description"
                      className="min-h-[60px]"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., developer, admin, viewer"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="effect"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Effect</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allow">Allow</SelectItem>
                        <SelectItem value="deny">Deny</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="agentPattern"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Agent Pattern</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="* for all"
                      className="font-mono text-xs"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="modelPattern"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Model Pattern</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="* for all"
                      className="font-mono text-xs"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toolPattern"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Tool Pattern</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="* for all"
                      className="font-mono text-xs"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="resourcePattern"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Resource Pattern</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="* for all"
                      className="font-mono text-xs"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="font-mono text-xs"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="prismViolet"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : editingId
                    ? "Update Policy"
                    : "Create Policy"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
