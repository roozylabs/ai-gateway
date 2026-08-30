"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/atoms/Button";
import { Textarea } from "@/components/atoms/Textarea";
import { Label } from "@/components/atoms/Label";
import { Badge } from "@/components/atoms/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
import { useTestToolMutation } from "@/hooks/mutations/useToolMutations";
import { ApiTool, ApiToolExecutionResult } from "@/lib/api";
import { Play, Terminal } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";

const testSchema = z.object({
  argsJson: z.string().default("{}"),
});

type TestFormValues = z.infer<typeof testSchema>;

interface ToolTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: ApiTool | null;
}

function buildDefaultArgs(tool: ApiTool): string {
  const properties = tool.inputSchema?.properties;
  if (!properties || Object.keys(properties).length === 0) return "{}";
  const sample = Object.fromEntries(
    Object.keys(properties).map((k) => [k, "sample_value"]),
  );
  return JSON.stringify(sample, null, 2);
}

export function ToolTestModal({
  open,
  onOpenChange,
  tool,
}: ToolTestModalProps) {
  const testToolMutation = useTestToolMutation();
  const [testResult, setTestResult] = useState<ApiToolExecutionResult | null>(
    null,
  );

  const form = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues: { argsJson: "{}" },
  });

  const handleOpenChange = (openState: boolean) => {
    if (openState && tool) {
      form.reset({ argsJson: buildDefaultArgs(tool) });
      setTestResult(null);
    } else {
      setTestResult(null);
    }
    onOpenChange(openState);
  };

  const onSubmit = async (values: TestFormValues) => {
    if (!tool) return;
    setTestResult(null);
    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(values.argsJson);
    } catch (_parseError) {
      toast.error("Invalid JSON in args");
      return;
    }
    try {
      const res = await testToolMutation.mutateAsync({
        toolId: tool.id,
        args: parsedArgs,
      });
      setTestResult(res);
      if (res.statusCode === 200) {
        toast.success(`Tool executed successfully (${res.latencyMs}ms)`);
      } else {
        toast.error(`Tool execution returned status ${res.statusCode}`);
      }
    } catch (err: unknown) {
      toast.error(`Invalid JSON or request error: ${getErrorMessage(err)}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <span>Test Tool Execution: {tool?.displayName || tool?.name}</span>
          </DialogTitle>
          <DialogDescription>
            Provide JSON argument payload and evaluate execution output.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="argsJson"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Input Arguments (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      counter
                      counterLabel="characters"
                      className="w-full h-32 rounded-md border border-border bg-background p-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      {...field}
                      placeholder="{}"
                      disabled={testToolMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              variant="prismViolet"
              className="w-full gap-2"
              disabled={testToolMutation.isPending}
            >
              <Play className="h-4 w-4" />
              <span>
                {testToolMutation.isPending
                  ? "Executing Tool..."
                  : "Execute Tool Test"}
              </span>
            </Button>

            {testResult && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Execution Output
                  </Label>
                  <Badge
                    variant={
                      testResult.statusCode === 200 ? "success" : "destructive"
                    }
                    className="font-mono text-[10px]"
                  >
                    Status {testResult.statusCode} ({testResult.latencyMs}ms)
                  </Badge>
                </div>
                <div className="p-3 rounded-md border border-border bg-muted/40 font-mono text-xs overflow-y-auto max-h-48 whitespace-pre-wrap">
                  {typeof testResult.result === "object"
                    ? JSON.stringify(testResult.result, null, 2)
                    : String(testResult.result)}
                </div>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
