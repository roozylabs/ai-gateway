"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Switch } from "@/components/atoms/Switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/molecules/Dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/molecules/Form";
import {
  useCreateResource,
  useUpdateResource,
} from "@/hooks/queries/useResourcesQuery";
import type { ApiResource } from "@/lib/api";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";

import { resourceSchema, ResourceFormValues } from "@/features/resources/schemas/create-resource.schema";

const defaultValues: ResourceFormValues = {
  name: "",
  displayName: "",
  description: "",
  enabled: true,
};

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingResource: ApiResource | null;
}

export function ResourceFormDialog({
  open,
  onOpenChange,
  editingResource,
}: ResourceFormDialogProps) {
  const createMutation = useCreateResource();
  const updateMutation = useUpdateResource();

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues,
  });

  const { reset } = form;

  useEffect(() => {
    if (!open) return;
    if (!editingResource) {
      reset(defaultValues);
      return;
    }
    reset({
      name: editingResource.name,
      displayName: editingResource.displayName,
      description: editingResource.description,
      enabled: editingResource.enabled,
    });
  }, [open, editingResource, reset]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: ResourceFormValues) => {
    const payload = {
      name: values.name.trim(),
      displayName: values.displayName.trim() || values.name.trim(),
      description: values.description.trim(),
      enabled: values.enabled,
    };

    if (editingResource) {
      updateMutation.mutate(
        { id: editingResource.id, data: payload },
        {
          onSuccess: () => {
            toast.success(`Resource "${payload.name}" updated`);
            onOpenChange(false);
          },
          onError: (err) =>
            toast.error(`Failed to update resource: ${getErrorMessage(err)}`),
        },
      );
    } else {
      createMutation.mutate(
        { ...payload, backends: [] },
        {
          onSuccess: () => {
            toast.success(`Resource "${payload.name}" created`);
            onOpenChange(false);
          },
          onError: (err) =>
            toast.error(`Failed to create resource: ${getErrorMessage(err)}`),
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingResource ? "Edit Resource" : "Add Resource Source"}
          </DialogTitle>
          <DialogDescription>
            {editingResource
              ? "Update the resource configuration."
              : "Connect a new document store, vector database, or static resource."}
          </DialogDescription>
        </DialogHeader>
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
                  <FormLabel>Resource Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., product-knowledge-base"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Product Knowledge Base"
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
                    <Input
                      {...field}
                      placeholder="Describe what this resource provides..."
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel>Enabled</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Allow agents to access this resource
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="prismViolet" disabled={isSubmitting}>
                {isSubmitting
                  ? editingResource
                    ? "Saving..."
                    : "Creating..."
                  : editingResource
                    ? "Save Changes"
                    : "Create Resource"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
