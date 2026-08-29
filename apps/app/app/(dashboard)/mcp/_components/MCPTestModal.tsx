"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
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
import { useTestMCPToolMutation } from "@/hooks/mutations/useMCPMutations";
import { ApiMCPServer, ApiMCPToolExecutionResult } from "@/lib/api";
import { Play, Terminal } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";

const testSchema = z.object({
  toolName: z.string().min(1, "Tool name is required"),
  argsJson: z.string().default("{}"),
});

type TestFormValues = z.infer<typeof testSchema>;

interface MCPTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: ApiMCPServer | null;
}

export function MCPTestModal({
  open,
  onOpenChange,
  server,
}: MCPTestModalProps) {
  const testMCPToolMutation = useTestMCPToolMutation();
  const [testResult, setTestResult] = useState<ApiMCPToolExecutionResult | null>(
    null,
  );

  const form = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues: { toolName: "ping", argsJson: "{}" },
  });

  const onSubmit = async (values: TestFormValues) => {
    if (!server) return;
    setTestResult(null);
    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(values.argsJson);
    } catch (_parseError) {
      toast.error("Invalid JSON in args");
      return;
    }
    try {
      const res = await testMCPToolMutation.mutateAsync({
        serverId: server.id,
        toolName: values.toolName.trim(),
        args: parsedArgs,
      });
      setTestResult(res);
      if (res.statusCode === 200) {
        toast.success(`MCP Tool executed successfully (${res.latencyMs}ms)`);
      } else {
        toast.error(`MCP Tool error status: ${res.statusCode}`);
      }
    } catch (err: unknown) {
      toast.error(`Execution error: ${getErrorMessage(err)}`);
    }
  };

  const { reset } = form;

  const handleOpenChange = (openState: boolean) => {
    if (openState) {
      reset({ toolName: "ping", argsJson: "{}" });
      setTestResult(null);
    } else {
      setTestResult(null);
    }
    onOpenChange(openState);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[#8B5CF6]" />
            <span>Test MCP Tool: {server?.displayName || server?.name}</span>
          </DialogTitle>
          <DialogDescription>
            Execute tool call on remote MCP server endpoint.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="toolName"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Tool Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="ping"
                      disabled={testMCPToolMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="argsJson"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Input Arguments (JSON)</FormLabel>
                  <FormControl>
                    <textarea
                      className="w-full h-32 rounded-md border border-border bg-background p-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      {...field}
                      placeholder="{}"
                      disabled={testMCPToolMutation.isPending}
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
              disabled={testMCPToolMutation.isPending}
            >
              <Play className="h-4 w-4" />
              <span>
                {testMCPToolMutation.isPending
                  ? "Executing MCP Tool..."
                  : "Execute MCP Tool Test"}
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
