'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { Textarea } from '@/components/atoms/Textarea';
import { Badge } from '@/components/atoms/Badge';
import { Play, Sparkles, Send, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { usePlaygroundStore } from '@/stores/usePlaygroundStore';
import { apiSimulateRouting } from '@/lib/api';
import { useModelsListQuery } from '@/hooks/queries/useModelsListQuery';

export default function PlaygroundPage() {
  const {
    model,
    prompt,
    response,
    decisionDetails,
    isStreaming,
    setModel,
    setPrompt,
    setResponse,
    setDecisionDetails,
    setIsStreaming,
  } = usePlaygroundStore();

  const { data: modelsData } = useModelsListQuery();
  const models = modelsData?.data ?? [];

  const handleExecute = async () => {
    try {
      setIsStreaming(true);
      setResponse(null);
      setDecisionDetails(null);

      const decision = await apiSimulateRouting({ prompt });
      setDecisionDetails({
        selectedModel: decision.selectedModel,
        provider: decision.selectedProvider,
        routingPolicy: decision.policyName,
        score: `${(decision.candidates?.[0]?.score ?? 0) * 100}%`,
        latency: '—',
        cost: `$${decision.candidates?.[0]?.inputPrice1M ?? 0}`,
      });

      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model === 'prism-auto' ? 'prism-auto' : model,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(errorBody || `Request failed with status ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const json = JSON.parse(line.slice(6));
              const token = json.choices?.[0]?.delta?.content;
              if (token) {
                fullResponse += token;
                setResponse(fullResponse);
              }
            } catch {}
          }
        }
      }

      toast.success(`Prompt executed successfully via ${model}!`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Execution failed: ${message}`);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Interactive AI Playground"
        description="Test LLM requests live through Prism Smart Routing engine and inspect routing decisions in real time."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request Input Form */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Play className="h-4 w-4 text-[#8B5CF6]" />
                <span>Prompt Request Payload</span>
              </CardTitle>
              <div className="w-[180px]">
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prism-auto">prism-auto (Smart)</SelectItem>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.slug}>
                        {m.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type your system or user prompt here..."
              className="flex-1 min-h-[220px] font-mono text-xs p-3"
            />

            <Button
              variant="prismViolet"
              className="w-full gap-2"
              onClick={handleExecute}
              disabled={isStreaming || !prompt.trim()}
            >
              {isStreaming ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Routing request...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Execute Prompt
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Response & Decision Inspector */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#8B5CF6]" />
                <span>Response & Decision Inspector</span>
              </CardTitle>
              {decisionDetails && (
                <Badge variant="violet" className="font-mono text-[10px]">
                  {decisionDetails.selectedModel}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            {decisionDetails && (
              <div className="grid grid-cols-3 gap-2 p-3 rounded-md border border-border bg-muted/20 font-mono text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[10px]">LATENCY</span>
                  <span className="font-bold text-foreground">{decisionDetails.latency}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">COST</span>
                  <span className="font-bold text-emerald-500">{decisionDetails.cost}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">SCORE</span>
                  <span className="font-bold text-[#8B5CF6]">{decisionDetails.score}</span>
                </div>
              </div>
            )}

            <div className="flex-1 rounded-md border border-border bg-muted/40 p-3 font-mono text-xs overflow-y-auto min-h-[220px]">
              {response ? (
                <pre className="whitespace-pre-wrap">{response}</pre>
              ) : (
                <span className="text-muted-foreground text-xs italic">
                  Response output and smart routing decision details will be displayed here...
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
