'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Label } from '@/components/atoms/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { useModelsListQuery } from '@/hooks/queries/useModelsListQuery';
import { useAgentsQuery } from '@/hooks/queries/useAgentsQuery';
import { ApiModel } from '@/lib/api';
import { Box, Play, Terminal, Zap, CheckCircle2, RefreshCw, Code2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SandboxPage() {
  const { data: modelsData, isLoading: modelsLoading } = useModelsListQuery();
  const { data: agentsData } = useAgentsQuery();

  const modelsList = modelsData?.data ?? [];
  const agentsList = Array.isArray(agentsData) ? agentsData : [];

  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('default');
  const [systemPrompt, setSystemPrompt] = useState<string>('You are an expert AI agent sandbox evaluator. Analyze code safety, boundary limits, and execute tools safely.');
  const [userPrompt, setUserPrompt] = useState<string>('Write a Python function to validate JSON Schema definitions and estimate memory usage.');

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<string>('');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [tokenStats, setTokenStats] = useState<{ input: number; output: number } | null>(null);

  const handleRunSandbox = async () => {
    if (!userPrompt.trim()) {
      toast.error('Please enter code or prompt to execute');
      return;
    }

    setIsExecuting(true);
    setExecutionOutput('');
    setLatencyMs(null);
    setTokenStats(null);
    const startTime = Date.now();

    try {
      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Prism-Agent-ID': selectedAgentId !== 'default' ? selectedAgentId : undefined,
        } as any,
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      const elapsed = Date.now() - startTime;
      setLatencyMs(elapsed);

      if (!res.ok) {
        const errText = await res.text();
        setExecutionOutput(`[HTTP ${res.status} Error]\n${errText}`);
        toast.error(`Execution failed: HTTP ${res.status}`);
        return;
      }

      const data = await res.json();
      const choice = data.choices?.[0]?.message?.content ?? JSON.stringify(data, null, 2);
      setExecutionOutput(choice);
      if (data.usage) {
        setTokenStats({
          input: data.usage.prompt_tokens || 0,
          output: data.usage.completion_tokens || 0,
        });
      }
      toast.success('Sandbox execution completed');
    } catch (err: any) {
      setExecutionOutput(`[Client Exception]\n${err?.message || 'Failed to connect to gateway'}`);
      toast.error('Sandbox execution error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Developer Web Sandbox"
        description="Isolated execution container sandbox for live agent prompt evaluation, code execution, and boundary safety testing."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Code2 className="h-4 w-4 text-[#8B5CF6]" />
              <span>Sandbox Execution Controls</span>
            </CardTitle>
            <CardDescription>Select target model, bound agent identity, and prompt code payload</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Target Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelsList.length > 0 ? (
                      modelsList.map((m: ApiModel) => (
                        <SelectItem key={m.id} value={m.slug || m.name}>
                          {m.displayName || m.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="gpt-4o">OpenAI GPT-4o</SelectItem>
                        <SelectItem value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</SelectItem>
                        <SelectItem value="gemini-1.5-pro">Google Gemini 1.5 Pro</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Agent Context Boundary</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Gateway Identity</SelectItem>
                    {agentsList.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.displayName || a.name} ({a.agentType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">System Persona & Tool Rules</Label>
              <textarea
                className="w-full h-20 rounded-md border border-border bg-background p-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter system prompt..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Prompt / Code Instruction</Label>
              <textarea
                className="w-full h-36 rounded-md border border-border bg-background p-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Enter code block or execution prompt..."
              />
            </div>

            <Button
              variant="prismViolet"
              className="w-full gap-2"
              onClick={handleRunSandbox}
              disabled={isExecuting}
            >
              {isExecuting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isExecuting ? 'Executing in Sandbox...' : 'Run Sandbox Container'}
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#8B5CF6]" />
                <span>Execution Output Console</span>
              </CardTitle>
              {latencyMs != null && (
                <div className="flex gap-2">
                  <Badge variant="violet" className="font-mono text-[10px]">{latencyMs} ms</Badge>
                  {tokenStats && (
                    <Badge variant="outline" className="font-mono text-[10px]">{tokenStats.input + tokenStats.output} tokens</Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 w-full min-h-[300px] p-3 rounded-md border border-border bg-muted/40 font-mono text-xs overflow-y-auto whitespace-pre-wrap">
              {isExecuting ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#8B5CF6]" />
                  <span>Connecting to Prism Proxy Engine and evaluating sandbox safety...</span>
                </div>
              ) : executionOutput ? (
                executionOutput
              ) : (
                <span className="text-muted-foreground italic">No output yet. Click &quot;Run Sandbox Container&quot; to execute prompt.</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

