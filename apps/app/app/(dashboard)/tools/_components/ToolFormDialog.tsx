"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
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
import {
  ApiTool,
  ApiCreateToolRequest,
  ApiCreateToolBackend,
  ApiToolWithBackends,
  apiGetTool,
} from "@/lib/api";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";
import { Plus, Trash2, Loader2 } from "lucide-react";

const backendSchema = z.object({
  name: z.string().min(1, "Backend name is required"),
  endpointUrl: z
    .string()
    .min(1, "Endpoint URL is required")
    .url("Must be a valid URL"),
  authToken: z.string().optional().default(""),
  timeoutMs: z.coerce.number().int().positive().optional(),
  priority: z.coerce.number().int().positive().optional(),
});

const toolSchema = z.object({
  name: z.string().min(1, "Function name is required"),
  displayName: z.string().default(""),
  description: z.string().default(""),
  enabled: z.boolean().default(true),
  inputSchema: z
    .string()
    .default("{}")
    .refine((value) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }, "Input schema must be valid JSON"),
  backends: z.array(backendSchema).default([]),
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
  inputSchema: "{}",
  backends: [],
};

function formatSchemaJSON(schema: Record<string, any> | null | undefined): string {
  if (!schema || Object.keys(schema).length === 0) return "{}";
  return JSON.stringify(schema, null, 2);
}

export function ToolFormDialog({
  open,
  onOpenChange,
  editingTool,
}: ToolFormDialogProps) {
  const createMutation = useCreateToolMutation();
  const updateMutation = useUpdateToolMutation();

  const [detail, setDetail] = useState<ApiToolWithBackends | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const form = useForm<ToolFormValues>({
    resolver: zodResolver(toolSchema),
    defaultValues,
  });

  const { reset, watch } = form;
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "backends",
  });

  const enabled = watch("enabled");

  useEffect(() => {
    if (!open) return;
    if (!editingTool) {
      setDetail(null);
      reset(defaultValues);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    apiGetTool(editingTool.id)
      .then((twb) => {
        if (cancelled) return;
        setDetail(twb);
        reset({
          name: twb.tool.name,
          displayName: twb.tool.displayName,
          description: twb.tool.description,
          enabled: twb.tool.enabled,
          inputSchema: formatSchemaJSON(twb.tool.inputSchema),
          backends: (twb.backends || []).map((b) => ({
            name: b.name,
            endpointUrl: b.endpointUrl,
            authToken: "",
            timeoutMs: b.timeoutMs,
            priority: b.priority,
          })),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setDetail(null);
        reset({
          name: editingTool.name,
          displayName: editingTool.displayName,
          description: editingTool.description,
          enabled: editingTool.enabled,
          inputSchema: formatSchemaJSON(editingTool.inputSchema),
          backends: [],
        });
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, editingTool, reset]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: ToolFormValues) => {
    let parsedSchema: Record<string, any>;
    try {
      parsedSchema = JSON.parse(values.inputSchema);
    } catch {
      toast.error("Input schema must be valid JSON");
      return;
    }

    const backends: ApiCreateToolBackend[] = values.backends
      .filter((b) => b.name && b.endpointUrl)
      .map((b) => ({
        name: b.name.trim(),
        endpointUrl: b.endpointUrl.trim(),
        authToken: b.authToken?.trim() || undefined,
        timeoutMs: b.timeoutMs || 30000,
        priority: b.priority || 1,
      }));

    const payload: ApiCreateToolRequest = {
      name: values.name.trim(),
      displayName: values.displayName.trim() || values.name.trim(),
      description: values.description.trim(),
      enabled: values.enabled,
      inputSchema: parsedSchema,
      backends,
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingTool ? "Edit Registered Tool" : "Register New Tool"}
          </DialogTitle>
          <DialogDescription>
            Configure function call schema and execution backends for agent tool
            execution.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-1">
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
                        disabled={isSubmitting || detailLoading}
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
                        disabled={isSubmitting || detailLoading}
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
                        disabled={isSubmitting || detailLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="inputSchema"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>
                      Input Schema (JSON){" "}
                      <span className="text-muted-foreground font-normal">
                        — defines the function-call arguments for the AI model
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={6}
                        placeholder='{ "type": "object", "properties": { "query": { "type": "string" } }, "required": ["query"] }'
                        disabled={isSubmitting || detailLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Execution Backends
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1"
                    onClick={() =>
                      append({
                        name: "",
                        endpointUrl: "",
                        authToken: "",
                        timeoutMs: 30000,
                        priority: 1,
                      })
                    }
                    disabled={isSubmitting || detailLoading}
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Backend</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tools execute against these HTTP endpoints in priority order.
                  At least one backend is required to run a tool.
                </p>

                {fields.length === 0 ? (
                  <div className="rounded border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No backends configured yet. Click "Add Backend" to enable
                    tool execution.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="rounded border border-border bg-muted/20 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Backend {index + 1}
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(index)}
                            disabled={isSubmitting || detailLoading}
                            aria-label={`Remove backend ${index + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Name
                            </Label>
                            <Input
                              placeholder="e.g., primary"
                              {...form.register(`backends.${index}.name`)}
                              disabled={isSubmitting || detailLoading}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Endpoint URL
                            </Label>
                            <Input
                              placeholder="https://api.example.com/run"
                              {...form.register(`backends.${index}.endpointUrl`)}
                              disabled={isSubmitting || detailLoading}
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-[11px] text-muted-foreground">
                              Auth Token{" "}
                              <span className="text-muted-foreground/70">
                                (optional)
                              </span>
                            </Label>
                            <Input
                              type="password"
                              placeholder={
                                detail
                                  ? "Re-enter to update (never shown)"
                                  : "Bearer token / API key"
                              }
                              {...form.register(`backends.${index}.authToken`)}
                              disabled={isSubmitting || detailLoading}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Timeout (ms)
                            </Label>
                            <Input
                              type="number"
                              placeholder="30000"
                              {...form.register(`backends.${index}.timeoutMs`)}
                              disabled={isSubmitting || detailLoading}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Priority
                            </Label>
                            <Input
                              type="number"
                              placeholder="1"
                              {...form.register(`backends.${index}.priority`)}
                              disabled={isSubmitting || detailLoading}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded border border-border bg-card">
                <Label
                  htmlFor="tool-enabled"
                  className="text-xs font-semibold cursor-pointer"
                >
                  Tool Enabled
                </Label>
                <Switch
                  id="tool-enabled"
                  checked={enabled}
                  onCheckedChange={(val) => form.setValue("enabled", val)}
                  disabled={isSubmitting || detailLoading}
                />
              </div>

              {detailLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading tool configuration...</span>
                </div>
              )}
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
                disabled={isSubmitting || detailLoading}
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
