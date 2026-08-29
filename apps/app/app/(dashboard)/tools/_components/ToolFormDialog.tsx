"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
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
  useCreateToolMutation,
  useUpdateToolMutation,
} from "@/hooks/mutations/useToolMutations";
import { ApiTool, ApiCreateToolRequest } from "@/lib/api";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";

const toolSchema = z.object({
  name: z.string().min(1, "Function name is required"),
  displayName: z.string().default(""),
  description: z.string().default(""),
  enabled: z.boolean().default(true),
});

type ToolFormValues = z.infer<typeof toolSchema>;

interface ToolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTool: ApiTool | null;
}

const defaultValues: ToolFormValues = {
  name: "",
  displayName: "",
  description: "",
  enabled: true,
};

export function ToolFormDialog({
  open,
  onOpenChange,
  editingTool,
}: ToolFormDialogProps) {
  const createMutation = useCreateToolMutation();
  const updateMutation = useUpdateToolMutation();

  const form = useForm<ToolFormValues>({
    resolver: zodResolver(toolSchema),
    defaultValues,
  });

  const { reset } = form;

  useEffect(() => {
    if (!open) return;
    if (!editingTool) {
      reset(defaultValues);
      return;
    }
    reset({
      name: editingTool.name,
      displayName: editingTool.displayName,
      description: editingTool.description,
      enabled: editingTool.enabled,
    });
  }, [open, editingTool, reset]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: ToolFormValues) => {
    const payload: ApiCreateToolRequest = {
      name: values.name.trim(),
      displayName: values.displayName.trim() || values.name.trim(),
      description: values.description.trim(),
      enabled: values.enabled,
    };

    if (editingTool) {
      updateMutation.mutate(
        { id: editingTool.id, toolData: payload },
        {
          onSuccess: () => {
            toast.success("Tool updated successfully");
            onOpenChange(false);
          },
          onError: (error) =>
            toast.error(`Failed to update tool: ${getErrorMessage(error)}`),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Tool created successfully");
          onOpenChange(false);
        },
        onError: (error) =>
          toast.error(`Failed to create tool: ${getErrorMessage(error)}`),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingTool ? "Edit Registered Tool" : "Register New Tool"}
          </DialogTitle>
          <DialogDescription>
            Configure function call schema for agent tool execution.
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
                  <FormLabel>Function Name (snake_case)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., search_web"
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
                      placeholder="e.g., Web Search Engine"
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
                      placeholder="Describe tool purpose for AI model..."
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center justify-between p-3 rounded border border-border bg-card">
              <Label
                htmlFor="tool-enabled"
                className="text-xs font-semibold cursor-pointer"
              >
                Tool Enabled
              </Label>
              <Switch
                id="tool-enabled"
                checked={form.watch("enabled")}
                onCheckedChange={(val) => form.setValue("enabled", val)}
                disabled={isSubmitting}
              />
            </div>
            <DialogFooter>
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
                  : editingTool
                    ? "Save Changes"
                    : "Register Tool"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
