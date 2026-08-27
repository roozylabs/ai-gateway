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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/molecules/Form';
import { useModelsListQuery } from '@/hooks/queries/useModelsListQuery';
import { useAgentsQuery } from '@/hooks/queries/useAgentsQuery';
import { useGatewayKeysQuery } from '@/hooks/queries/useGatewayKeysQuery';
import { usePoliciesQuery } from '@/hooks/queries/usePoliciesQuery';
import { ApiModel } from '@/lib/api';
import { Play, Terminal, RefreshCw, Code2, Copy, Check, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/types/ui';
import { useSandboxExecutionMutation } from '@/hooks/mutations/useSandboxMutation';

const sandboxSchema = z.object({
  model: z.string().min(1, 'Target model is required'),
  routingPolicy: z.string().min(1, 'Routing policy is required'),
  keyPrefix: z.string().min(1, 'Gateway API Key Context is required'),
  agentId: z.string().default('default'),
  enableStream: z.boolean().default(true),
  userPrompt: z.string().min(1, 'Prompt / Code Instruction is required'),
});

type SandboxFormValues = z.infer<typeof sandboxSchema>;

function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return text;
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
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
        <em key={i} className="italic text-slate-300">
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
                  <Code2 className="h-3.5 w-3.5" />
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
                  <Copy className="h-3 w-3 text-[#8B5CF6]" />
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

  const [executionOutput, setExecutionOutput] = useState<string>('');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [tokenStats, setTokenStats] = useState<{ input: number; output: number } | null>(null);
  const [routedModel, setRoutedModel] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<SandboxFormValues>({
    resolver: zodResolver(sandboxSchema),
    defaultValues: {
      model: 'prism-auto',
      routingPolicy: 'balanced',
      keyPrefix: keysList[0]?.keyPrefix || '',
      agentId: 'default',
      enableStream: true,
      userPrompt:
        '',
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

  const isExecuting = sandboxMutation.isPending;
  const selectedModel = form.watch('model');

  const handleCopyOutput = () => {
    if (!executionOutput) return;
    navigator.clipboard.writeText(executionOutput);
    setCopied(true);
    toast.success('Copied output to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = async (values: SandboxFormValues) => {
    setExecutionOutput('');
    setLatencyMs(null);
    setTokenStats(null);
    setRoutedModel(null);
    const startTime = Date.now();

    try {
      const res = await sandboxMutation.mutateAsync({
        keyPrefix: values.keyPrefix,
        routingPolicy: values.routingPolicy,
        agentId: values.agentId,
        model: values.model,
        messages: [
          { role: 'user', content: values.userPrompt },
        ],
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
        toast.success('Sandbox stream execution completed');
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
      setExecutionOutput(`[Client Exception]\n${getErrorMessage(err)}`);
      toast.error('Sandbox execution error');
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Developer Web Sandbox"
        description="Isolated execution container sandbox for live agent prompt evaluation, code execution, and boundary safety testing."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-w-0 flex-1">
        {/* Left Column: Sandbox Controls with RHF & Molecule Form */}
        <Card className="flex flex-col min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Code2 className="h-4 w-4 text-[#8B5CF6]" />
              <span>Sandbox Execution Controls</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Select target model, bound agent identity, and prompt code payload.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
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
                          <FormLabel className="text-xs font-semibold">Target Model</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange} disabled={isExecuting}>
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="prism-auto">prism-auto (Smart Router)</SelectItem>
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

                    {/* Smart Router Policy (Dynamic from /api/policies) */}
                    <FormField
                      control={form.control}
                      name="routingPolicy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold">Smart Router Policy</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={isExecuting || selectedModel !== 'prism-auto'}
                            >
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue placeholder="Select policy" />
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
                                    <SelectItem value="balanced">Balanced Policy</SelectItem>
                                    <SelectItem value="quality">Quality Policy</SelectItem>
                                    <SelectItem value="cheap">Cheap Policy</SelectItem>
                                    <SelectItem value="fast">Fast Policy</SelectItem>
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
                          <FormLabel className="text-xs font-semibold" required>
                            Gateway API Key Context
                          </FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange} disabled={isExecuting}>
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue placeholder="Select key" />
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
                          <FormLabel className="text-xs font-semibold">Agent Context Boundary</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange} disabled={isExecuting}>
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue placeholder="Select agent" />
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
                      <FormItem className="flex items-center justify-between p-3 rounded-md border border-border bg-card space-y-0">
                        <div className="space-y-0.5">
                          <FormLabel className="text-xs font-semibold cursor-pointer">
                            Enable SSE Response Streaming
                          </FormLabel>
                          <p className="text-[11px] text-muted-foreground">Stream tokens live chunk-by-chunk in output console</p>
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
                        <FormLabel className="text-xs font-semibold">Prompt / Code Instruction</FormLabel>
                        <FormControl>
                          <textarea
                            {...field}
                            disabled={isExecuting}
                            className="w-full h-24 rounded-md border border-border bg-background p-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Enter code block or execution prompt..."
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
                  className="w-full gap-2 mt-4"
                  disabled={isExecuting}
                >
                  {isExecuting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {isExecuting ? 'Executing in Sandbox...' : 'Run Sandbox Container'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Right Column: Execution Output Console */}
        <Card className="flex flex-col min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#8B5CF6]" />
                <span>Execution Output Console</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                {routedModel && (
                  <Badge variant="violet" className="font-mono text-[10px] gap-1 border-violet-500/30">
                    <Layers className="h-3 w-3 text-[#8B5CF6]" />
                    Routed: {routedModel}
                  </Badge>
                )}
                {latencyMs != null && (
                  <Badge variant="violet" className="font-mono text-[10px]">{latencyMs} ms</Badge>
                )}
                {tokenStats && (
                  <Badge variant="outline" className="font-mono text-[10px]">{tokenStats.input + tokenStats.output} tokens</Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1.5 border-violet-500/20 hover:border-violet-500/40"
                  onClick={handleCopyOutput}
                  disabled={!executionOutput}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-[#8B5CF6]" />}
                  <span>{copied ? 'Copied!' : 'Copy Result'}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 w-full max-h-[560px] min-h-[400px] p-4 rounded-lg border border-border/80 bg-[#0A0C10] font-mono text-xs overflow-y-auto custom-scrollbar shadow-inner">
              {isExecuting && !executionOutput ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#8B5CF6]" />
                  <span>Connecting to Prism Proxy Engine and evaluating sandbox safety...</span>
                </div>
              ) : executionOutput ? (
                <FormattedSandboxOutput content={executionOutput} />
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
