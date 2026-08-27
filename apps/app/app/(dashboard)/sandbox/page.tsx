'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Switch } from '@/components/atoms/Switch';
import { Textarea } from '@/components/atoms/Textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/molecules/Form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/atoms/Tooltip';
import { useModelsListQuery } from '@/hooks/queries/useModelsListQuery';
import { useAgentsQuery } from '@/hooks/queries/useAgentsQuery';
import { useGatewayKeysQuery } from '@/hooks/queries/useGatewayKeysQuery';
import { usePoliciesQuery } from '@/hooks/queries/usePoliciesQuery';
import { ApiModel } from '@/lib/api';
import { toast } from 'sonner';
import { getErrorMessage } from '@/types/ui';
import { useSandboxExecutionMutation } from '@/hooks/mutations/useSandboxMutation';
import { useSSE } from '@/hooks/useSSE';

import {
  Play as PlayIcon,
  Terminal as TerminalIcon,
  RefreshCw as RefreshCwIcon,
  Code2 as Code2Icon,
  Copy as CopyIcon,
  Check as CheckIcon,
  Layers as LayersIcon,
  HelpCircle as HelpCircleIcon,
  Sparkles as SparklesIcon,
  Cpu as CpuIcon,
  Zap as ZapIcon,
  Clock as ClockIcon,
  CheckCircle2 as CheckCircle2Icon,
  Loader2 as Loader2Icon,
} from 'lucide-react';

const sandboxSchema = z.object({
  model: z.string().min(1, 'Target model is required'),
  routingPolicy: z.string().min(1, 'Routing policy is required'),
  keyPrefix: z.string().min(1, 'Gateway API Key Context is required'),
  agentId: z.string().default('default'),
  enableStream: z.boolean().default(true),
  enableAsync: z.boolean().default(false),
  userPrompt: z.string().min(1, 'Prompt / Code Instruction is required'),
});

type SandboxFormValues = z.infer<typeof sandboxSchema>;

function FormTooltipLabel({
  label,
  tooltip,
  required,
}: {
  label: string;
  tooltip: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {required && <span className="text-destructive">*</span>}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-[#8B5CF6] transition-colors focus:outline-none"
          >
            <HelpCircleIcon className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-[11px] leading-relaxed bg-[#141720] border-violet-500/30 text-slate-200 shadow-xl">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return text;
  const tokens = text.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*|__.*?__|`.*?`|\*.*?\*|_.*?_)/g);
  return tokens.map((token, i) => {
    if (token.startsWith('***') && token.endsWith('***') && token.length >= 6) {
      return (
        <strong key={i} className="font-semibold italic text-slate-100">
          {token.slice(3, -3)}
        </strong>
      );
    }
    if ((token.startsWith('**') && token.endsWith('**') && token.length >= 4) || (token.startsWith('__') && token.endsWith('__') && token.length >= 4)) {
      return (
        <strong key={i} className="font-semibold text-slate-100">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-violet-500/15 text-[#06B6D4] font-mono text-[11px]">
          {token.slice(1, -1)}
        </code>
      );
    }
    if ((token.startsWith('*') && token.endsWith('*') && token.length >= 2) || (token.startsWith('_') && token.endsWith('_') && token.length >= 2)) {
      return (
        <em key={i} className="italic opacity-90">
          {token.slice(1, -1)}
        </em>
      );
    }
    return token;
  });
}

function FormattedSandboxOutput({ content }: { content: string }) {
  if (!content) return null;

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-xs leading-relaxed text-slate-200">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const firstLineEnd = part.indexOf('\n');
          const language = part.slice(3, firstLineEnd).trim() || 'code';
          const codeBody = part.slice(firstLineEnd + 1, -3).trim();

          return (
            <div key={index} className="my-3 rounded-md border border-violet-500/25 bg-[#0D0F14] overflow-hidden shadow-md">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#141720] border-b border-violet-500/20 text-[11px]">
                <div className="flex items-center gap-1.5 text-[#8B5CF6] font-semibold font-mono">
                  <Code2Icon className="h-3.5 w-3.5" />
                  <span className="uppercase tracking-wider">{language}</span>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(codeBody);
                    toast.success(`Copied ${language} code block`);
                  }}
                >
                  <CopyIcon className="h-3 w-3 text-[#8B5CF6]" />
                  <span>Copy Code</span>
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-[#06B6D4] whitespace-pre font-mono text-[11px] leading-relaxed custom-scrollbar">
                {codeBody}
              </pre>
            </div>
          );
        }

        const lines = part.split('\n');

        return (
          <div key={index} className="space-y-1.5">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();

              if (/^#{1,6}\s+/.test(trimmed)) {
                const headingText = trimmed.replace(/^#{1,6}\s+/, '');
                return (
                  <h4 key={lineIdx} className="text-[#8B5CF6] font-bold text-xs pt-3 pb-1 border-b border-violet-500/20 flex items-center gap-1.5">
                    <span className="text-[#06B6D4]">#</span>
                    <span>{renderInlineMarkdown(headingText)}</span>
                  </h4>
                );
              }

              if (trimmed === '---' || trimmed === '***') {
                return <hr key={lineIdx} className="border-violet-500/20 my-3" />;
              }

              const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
              if (numMatch) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-2 text-slate-200">
                    <span className="text-[#8B5CF6] font-semibold min-w-[16px] text-[11px] font-mono">{numMatch[1]}.</span>
                    <div className="flex-1">{renderInlineMarkdown(numMatch[2])}</div>
                  </div>
                );
              }

              if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                const itemText = trimmed.replace(/^[*|-]\s*/, '');
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-2 text-slate-200">
                    <span className="text-[#8B5CF6] font-bold mt-0.5">•</span>
                    <div className="flex-1">{renderInlineMarkdown(itemText)}</div>
                  </div>
                );
              }

              if (!trimmed) {
                return <div key={lineIdx} className="h-1" />;
              }

              return (
                <p key={lineIdx} className="text-slate-300 text-xs leading-normal">
                  {renderInlineMarkdown(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function SandboxPage() {
  const { data: modelsData } = useModelsListQuery();
  const { data: agentsData } = useAgentsQuery();
  const { data: keysData } = useGatewayKeysQuery();
  const { data: policiesData } = usePoliciesQuery();

  const modelsList = modelsData?.data ?? [];
  const agentsList = Array.isArray(agentsData) ? agentsData : [];
  const keysList = keysData?.data ?? [];
  const policiesList = Array.isArray(policiesData) ? policiesData : [];

  const sandboxMutation = useSandboxExecutionMutation();
  const { lastEvent } = useSSE();

  const [executionOutput, setExecutionOutput] = useState<string>('');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [tokenStats, setTokenStats] = useState<{ input: number; output: number } | null>(null);
  const [routedModel, setRoutedModel] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isAsyncExecuting, setIsAsyncExecuting] = useState(false);

  const isExecuting = sandboxMutation.isPending || activeJobId !== null || isAsyncExecuting;

  React.useEffect(() => {
    if (!activeJobId || !lastEvent) return;

    if (lastEvent.type === 'async_job_updated') {
      const payload = lastEvent.payload as any;
      if (payload && (payload.jobId === activeJobId || payload.job_id === activeJobId)) {
        const status = payload.status;
        if (status === 'completed') {
          const res = payload.result;
          const content = res?.choices?.[0]?.message?.content || JSON.stringify(res, null, 2);
          setExecutionOutput(content);
          if (res?.usage) {
            setTokenStats({
              input: res.usage.prompt_tokens || 0,
              output: res.usage.completion_tokens || 0,
            });
          }
          if (payload.model) {
            setRoutedModel(payload.model);
          }
          toast.success(`Async Job ${activeJobId} completed processing!`);
          setActiveJobId(null);
          setIsAsyncExecuting(false);
        } else if (status === 'failed') {
          setExecutionOutput(`Execution Failed:\n${payload.error}`);
          toast.error(`Async Job ${activeJobId} failed: ${payload.error}`);
          setActiveJobId(null);
          setIsAsyncExecuting(false);
        } else if (status === 'processing') {
          setExecutionOutput(`Status: PROCESSING (Job ID: ${activeJobId})\nExecuting on background worker pool...`);
        }
      }
    }
  }, [lastEvent, activeJobId]);

  const form = useForm<SandboxFormValues>({
    resolver: zodResolver(sandboxSchema),
    defaultValues: {
      model: 'prism-auto',
      routingPolicy: 'balanced',
      keyPrefix: keysList[0]?.keyPrefix || '',
      agentId: 'default',
      enableStream: true,
      enableAsync: false,
      userPrompt: '',
    },
  });

  React.useEffect(() => {
    if (keysList.length > 0) {
      const currentPrefix = form.getValues('keyPrefix');
      if (!currentPrefix || currentPrefix === 'auto' || !keysList.some((k) => k.keyPrefix === currentPrefix)) {
        form.setValue('keyPrefix', keysList[0].keyPrefix);
      }
    }
  }, [keysList, form]);

  const selectedModel = form.watch('model');

  const handleCopyOutput = () => {
    if (!executionOutput) return;
    navigator.clipboard.writeText(executionOutput);
    setCopied(true);
    toast.success('Result copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = async (values: SandboxFormValues) => {
    setExecutionOutput('');
    setLatencyMs(null);
    setTokenStats(null);
    setRoutedModel(null);
    const startTime = Date.now();

    try {
      if (values.enableAsync) {
        setIsAsyncExecuting(true);
        setExecutionOutput('Submitting request to Background Queue...');
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const asyncRes = await fetch('/api/sandbox/chat/completions/async', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sandbox-Key-Prefix': values.keyPrefix,
            ...(values.agentId !== 'default' && { 'X-Prism-Agent-ID': values.agentId }),
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            model: values.model,
            messages: [{ role: 'user', content: values.userPrompt }],
            temperature: 0.7,
            stream: false,
          }),
        });

        if (!asyncRes.ok) {
          const errData = await asyncRes.json();
          setIsAsyncExecuting(false);
          throw new Error(errData?.error?.message || `Failed to submit async job (Status ${asyncRes.status})`);
        }

        const asyncJob = await asyncRes.json();
        const jobId = asyncJob.job_id;
        setActiveJobId(jobId);
        setExecutionOutput(`Status: QUEUED (Job ID: ${jobId})\nListening to real-time SSE stream & polling status in background...`);
        toast.info(`Async Job ${jobId} queued successfully`);

        let isDone = false;
        let pollCount = 0;

        while (!isDone && pollCount < 60) {
          await new Promise((r) => setTimeout(r, 1000));
          pollCount++;

          const jobRes = await fetch(`/api/jobs/${jobId}`, {
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });

          if (!jobRes.ok) continue;

          const jobData = await jobRes.json();
          if (jobData.status === 'completed') {
            isDone = true;
            const content = jobData.result?.choices?.[0]?.message?.content || JSON.stringify(jobData.result, null, 2);
            setExecutionOutput(content);
            if (jobData.result?.usage) {
              setTokenStats({
                input: jobData.result.usage.prompt_tokens || 0,
                output: jobData.result.usage.completion_tokens || 0,
              });
            }
            if (jobData.model) {
              setRoutedModel(jobData.model);
            }
            setLatencyMs(Date.now() - startTime);
            toast.success(`Async Job ${jobId} completed successfully`);
            setActiveJobId(null);
            setIsAsyncExecuting(false);
            break;
          } else if (jobData.status === 'failed') {
            isDone = true;
            setExecutionOutput(`Job ${jobId} Failed:\n${jobData.error}`);
            toast.error(`Job ${jobId} failed: ${jobData.error}`);
            setActiveJobId(null);
            setIsAsyncExecuting(false);
            break;
          } else {
            setExecutionOutput(`Status: ${String(jobData.status).toUpperCase()} (Job ID: ${jobId})\nWaiting for worker execution... (${pollCount}s)`);
          }
        }
        setIsAsyncExecuting(false);
        return;
      }

      const res = await sandboxMutation.mutateAsync({
        keyPrefix: values.keyPrefix,
        routingPolicy: values.routingPolicy,
        agentId: values.agentId,
        model: values.model,
        messages: [{ role: 'user', content: values.userPrompt }],
        temperature: 0.7,
        stream: values.enableStream,
      });

      const selectedHeaderModel = res.headers?.get('X-Prism-Selected-Model');
      if (selectedHeaderModel) {
        setRoutedModel(selectedHeaderModel);
      }

      if (values.enableStream && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedText = '';
        let doneReading = false;

        while (!doneReading) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') {
              doneReading = true;
              break;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.model) {
                setRoutedModel(parsed.model);
              }
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                accumulatedText += delta;
                setExecutionOutput(accumulatedText);
              }
              if (parsed.usage) {
                setTokenStats({
                  input: parsed.usage.prompt_tokens || 0,
                  output: parsed.usage.completion_tokens || 0,
                });
              }
            } catch (_parseError) {
              // Ignore partial SSE JSON chunks
            }
          }
        }

        setLatencyMs(Date.now() - startTime);
        toast.success('Stream execution completed');
      } else {
        const data = await res.json();
        if (data.model) {
          setRoutedModel(data.model);
        }
        const choice = data.choices?.[0]?.message?.content ?? JSON.stringify(data, null, 2);
        setExecutionOutput(choice);
        if (data.usage) {
          setTokenStats({
            input: data.usage.prompt_tokens || 0,
            output: data.usage.completion_tokens || 0,
          });
        }
        setLatencyMs(Date.now() - startTime);
        toast.success('Sandbox execution completed');
      }
    } catch (err: unknown) {
      setExecutionOutput(`[System Exception]\n${getErrorMessage(err)}`);
      toast.error('Failed to run Sandbox container instruction');
    }
  };

  const isAsyncMode = form.watch('enableAsync') || activeJobId !== null;

  return (
    <TooltipProvider>
      <AppLayout>
        <PageHeader
          title="Developer Web Sandbox"
          description="Isolated execution container for prompt evaluation, real-time AI responses, and boundary safety testing."
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-w-0 flex-1">
          {/* Left Column: Sandbox Controls */}
          <Card className="flex flex-col min-w-0 overflow-hidden border-border/70 shadow-lg">
            <CardHeader className="pb-3 border-b border-border/40 bg-card/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Code2Icon className="h-4 w-4 text-[#8B5CF6]" />
                <span>Sandbox Execution Controls</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Configure target AI model, API key context, agent boundaries, and execution mode.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 flex-1 flex flex-col justify-between pt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-1 flex flex-col justify-start">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Target Model */}
                      <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                          <FormItem>
                            <FormTooltipLabel
                              label="Target AI Model"
                              tooltip="Select a specific AI model (e.g. Gemini, Claude, OpenAI) or use 'prism-auto' for automatic optimal routing."
                            />
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange} disabled={isExecuting}>
                                <SelectTrigger className="w-full min-w-0">
                                  <SelectValue placeholder="Select target model" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="prism-auto">prism-auto (Auto Selection)</SelectItem>
                                  {modelsList.map((m: ApiModel) => (
                                    <SelectItem key={m.id} value={m.slug}>
                                      {m.displayName || m.name} ({m.providerName || m.slug})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Smart Router Policy */}
                      <FormField
                        control={form.control}
                        name="routingPolicy"
                        render={({ field }) => (
                          <FormItem>
                            <FormTooltipLabel
                              label="Smart Router Policy"
                              tooltip="Rules for automatic model selection. E.g. 'Balanced' for speed/cost balance, 'Quality' for highest accuracy, or 'Cheap' for lowest cost."
                            />
                            <FormControl>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={isExecuting || selectedModel !== 'prism-auto'}
                              >
                                <SelectTrigger className="w-full min-w-0">
                                  <SelectValue placeholder="Select routing policy" />
                                </SelectTrigger>
                                <SelectContent>
                                  {policiesList.length > 0 ? (
                                    policiesList.map((p) => (
                                      <SelectItem key={p.id} value={p.name.toLowerCase()}>
                                        {p.name} {p.isDefault ? '(Default)' : ''}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <>
                                      <SelectItem value="balanced">Balanced (Optimal Balance)</SelectItem>
                                      <SelectItem value="quality">Quality (Highest Accuracy)</SelectItem>
                                      <SelectItem value="cheap">Cheap (Cost Efficient)</SelectItem>
                                      <SelectItem value="fast">Fast (Highest Speed)</SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Gateway API Key Context */}
                      <FormField
                        control={form.control}
                        name="keyPrefix"
                        render={({ field }) => (
                          <FormItem>
                            <FormTooltipLabel
                              label="Gateway API Key Context"
                              required
                              tooltip="Your organization's API Key used to evaluate quota limits, budget policies, and access rights."
                            />
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange} disabled={isExecuting}>
                                <SelectTrigger className="w-full min-w-0">
                                  <SelectValue placeholder="Select API key" />
                                </SelectTrigger>
                                <SelectContent>
                                  {keysList.map((k) => (
                                    <SelectItem key={k.id} value={k.keyPrefix}>
                                      <span className="truncate block max-w-[220px]">
                                        {k.name} ({k.keyPrefix}...)
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Agent Context Boundary */}
                      <FormField
                        control={form.control}
                        name="agentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormTooltipLabel
                              label="Agent Context Boundary"
                              tooltip="Bound AI Agent identity restricting security rules (RBAC) and allowed tool executions."
                            />
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange} disabled={isExecuting}>
                                <SelectTrigger className="w-full min-w-0">
                                  <SelectValue placeholder="Select AI agent" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="default">Default Gateway Identity</SelectItem>
                                  {agentsList.map((a) => (
                                    <SelectItem key={a.id} value={a.name}>
                                      <span className="truncate block max-w-[220px]">
                                        {a.displayName || a.name}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Enable SSE Response Streaming */}
                    <FormField
                      control={form.control}
                      name="enableStream"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-3.5 border border-border bg-card/60 hover:bg-card transition-colors space-y-0">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <FormLabel className="text-xs font-semibold cursor-pointer">
                                Live Response Streaming (SSE)
                              </FormLabel>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="text-muted-foreground hover:text-[#8B5CF6]">
                                    <HelpCircleIcon className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-[11px] bg-[#141720] border-violet-500/30 text-slate-200">
                                  Receive AI responses word-by-word in real time (SSE streaming) without waiting for full completion.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Display response text live as it is generated by the AI model
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isExecuting || form.watch('enableAsync')}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Enable Async Execution (HTTP 202) */}
                    <FormField
                      control={form.control}
                      name="enableAsync"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-3.5 border border-border bg-card/60 hover:bg-card transition-colors space-y-0">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <FormLabel className="text-xs font-semibold cursor-pointer">
                                Background Queue Execution (Async)
                              </FormLabel>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="text-muted-foreground hover:text-[#8B5CF6]">
                                    <HelpCircleIcon className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-[11px] bg-[#141720] border-violet-500/30 text-slate-200">
                                  Offloads requests to a background Redis queue. Ideal for long-running prompts without keeping the browser connection waiting.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Dispatch requests asynchronously to background workers without holding browser connection
                            </p>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isExecuting} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Prompt / Code Instruction */}
                    <FormField
                      control={form.control}
                      name="userPrompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormTooltipLabel
                            label="Prompt / Code Instruction"
                            required
                            tooltip="Enter the instruction, prompt text, or code block for the AI sandbox to evaluate."
                          />
                          <FormControl>
                            <Textarea
                              {...field}
                              disabled={isExecuting}
                              className="h-28 text-xs font-mono custom-scrollbar"
                              placeholder="Type your prompt or code instructions here..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="prismViolet"
                    className="w-full gap-2 mt-4 py-2.5 font-semibold text-xs shadow-md transition-all duration-200"
                    disabled={isExecuting}
                  >
                    {isExecuting ? (
                      <RefreshCwIcon className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <PlayIcon className="h-4 w-4 fill-white" />
                    )}
                    {isExecuting
                      ? isAsyncMode
                        ? 'Processing in Background Queue...'
                        : 'Running AI Instruction...'
                      : 'Run Sandbox Container'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Right Column: Execution Output Console */}
          <Card className="flex flex-col min-w-0 overflow-hidden border-border/70 shadow-lg">
            <CardHeader className="pb-3 border-b border-border/40 bg-card/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TerminalIcon className="h-4 w-4 text-[#8B5CF6]" />
                  <span>Execution Output Console</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  {routedModel && (
                    <Badge variant="violet" className="font-mono text-[10px] gap-1 border-violet-500/30">
                      <LayersIcon className="h-3 w-3 text-[#8B5CF6]" />
                      Model: {routedModel}
                    </Badge>
                  )}
                  {latencyMs != null && (
                    <Badge variant="violet" className="font-mono text-[10px] gap-1">
                      <ClockIcon className="h-3 w-3" />
                      {latencyMs} ms
                    </Badge>
                  )}
                  {tokenStats && (
                    <Badge variant="outline" className="font-mono text-[10px] gap-1">
                      <ZapIcon className="h-3 w-3 text-amber-400" />
                      {tokenStats.input + tokenStats.output} tokens
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1.5 border-violet-500/20 hover:border-violet-500/40"
                    onClick={handleCopyOutput}
                    disabled={!executionOutput || isExecuting}
                  >
                    {copied ? (
                      <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <CopyIcon className="h-3.5 w-3.5 text-[#8B5CF6]" />
                    )}
                    <span>{copied ? 'Copied!' : 'Copy Result'}</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col pt-4">
              <div className="flex-1 w-full max-h-[580px] min-h-[420px] p-4 rounded-none border border-border/80 bg-[#0A0C10] font-mono text-xs overflow-y-auto custom-scrollbar shadow-inner relative">
                {/* Modern Animated Loading Progress Screen */}
                {isExecuting && !executionOutput ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-5 p-6 text-center">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center animate-pulse">
                        {isAsyncMode ? (
                          <CpuIcon className="h-7 w-7 text-[#8B5CF6] animate-bounce" />
                        ) : (
                          <SparklesIcon className="h-7 w-7 text-[#06B6D4] animate-spin" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center">
                        <Loader2Icon className="h-3 w-3 text-white animate-spin" />
                      </div>
                    </div>

                    <div className="space-y-1.5 max-w-sm">
                      <h4 className="text-sm font-semibold text-slate-100 flex items-center justify-center gap-2">
                        <span>{isAsyncMode ? 'Async Job Processing in Background' : 'Connecting to Prism AI Engine'}</span>
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {isAsyncMode
                          ? 'Request has been queued. Background worker pool is executing the job.'
                          : 'Evaluating RBAC security policies & selecting optimal AI model...'}
                      </p>
                    </div>

                    {/* Visual Progress Steps */}
                    <div className="w-full max-w-xs space-y-2 border border-violet-500/20 bg-[#12151E] p-3 rounded-lg text-[11px] text-left">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-emerald-400 font-semibold">
                          <CheckCircle2Icon className="h-3.5 w-3.5" />
                          <span>1. Dispatch Request</span>
                        </span>
                        <span className="text-[10px] text-emerald-400/80 font-mono">OK</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[#8B5CF6] font-semibold">
                          <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                          <span>2. Execute AI Model</span>
                        </span>
                        <span className="text-[10px] text-[#8B5CF6] font-mono animate-pulse">PROCESSING</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground opacity-60">
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 flex items-center justify-center text-[9px]">3</span>
                          <span>3. Receive Response</span>
                        </span>
                        <span className="text-[10px] font-mono">PENDING</span>
                      </div>
                    </div>

                    {/* Animated Shimmer Line */}
                    <div className="w-full max-w-xs h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#8B5CF6] via-[#06B6D4] to-[#8B5CF6] rounded-full animate-pulse w-full" />
                    </div>
                  </div>
                ) : executionOutput ? (
                  <div>
                    <FormattedSandboxOutput content={executionOutput} />
                    {/* Blinking cursor effect during active streaming */}
                    {isExecuting && (
                      <span className="inline-block w-2 h-4 bg-[#8B5CF6] animate-pulse ml-1 align-middle rounded-sm" />
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-3">
                    <TerminalIcon className="h-10 w-10 text-muted-foreground/30" />
                    <div className="space-y-1 max-w-xs">
                      <p className="text-xs font-semibold text-slate-300">Console Ready</p>
                      <p className="text-[11px] text-muted-foreground">
                        Type your prompt in the left panel and click &quot;Run Sandbox Container&quot; to view AI output.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </TooltipProvider>
  );
}
