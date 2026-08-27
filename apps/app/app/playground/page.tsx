'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { Textarea } from '@/components/atoms/Textarea';
import { Badge } from '@/components/atoms/Badge';
import { Play, Cpu, Send, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { usePlaygroundStore } from '@/stores/usePlaygroundStore';
import { useSimulateRoutingMutation } from '@/hooks/mutations/usePlaygroundMutations';
import { useModelsListQuery } from '@/hooks/queries/useModelsListQuery';
import { getErrorMessage } from '@/types/ui';

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
  const simulateMutation = useSimulateRoutingMutation();

  const handleExecute = async () => {
    try {
      setIsStreaming(true);
      setResponse(null);
      setDecisionDetails(null);

      const decision = await simulateMutation.mutateAsync({ prompt });
      const candidateList = decision.candidates || [];
      setDecisionDetails({
        selectedModel: decision.selectedModel,
        provider: decision.selectedProvider,
        routingPolicy: decision.policyName,
        score: `${Math.round((decision.candidates?.[0]?.score ?? 0) * 100)}%`,
        latency: decision.candidates?.[0]?.speedScore != null ? `${decision.candidates[0].speedScore}ms` : '—',
        cost: decision.candidates?.[0]?.inputPrice1M != null ? `$${decision.candidates[0].inputPrice1M}/1M` : '—',
        candidates: candidateList,
      });

      // Pass authorization bearer token or fallback token header to pass gateway auth cleanly
      const token = typeof window !== 'undefined' ? localStorage.getItem('prism_token') || 'pk_live_default_gateway_key' : 'pk_live_default_gateway_key';

      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
              const tokenStr = json.choices?.[0]?.delta?.content;
              if (tokenStr) {
                fullResponse += tokenStr;
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
        description="Test LLM requests live through Prism Smart Routing engine and inspect multi-factor routing score breakdowns in real time."
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
                    <SelectItem value="prism-auto">prism-auto (Smart Routing)</SelectItem>
                    {models.map((m: { id: string; slug: string; displayName: string }) => (
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
                <Cpu className="h-4 w-4 text-[#8B5CF6]" />
                <span>Response & Candidate Decision Matrix</span>
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
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 p-3 rounded-md border border-border bg-muted/20 font-mono text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">SELECTED MODEL</span>
                    <span className="font-bold text-foreground">{decisionDetails.selectedModel}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">POLICY</span>
                    <span className="font-bold text-foreground">{decisionDetails.routingPolicy || 'Auto Score'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">TOP MATCH SCORE</span>
                    <span className="font-bold text-[#8B5CF6]">{decisionDetails.score}</span>
                  </div>
                </div>

                {decisionDetails.candidates && decisionDetails.candidates.length > 0 && (
                  <div className="p-2 rounded-md border border-border bg-muted/10 space-y-1 text-[11px]">
                    <span className="font-semibold text-muted-foreground text-[10px] block">CANDIDATE RANKING BREAKDOWN</span>
                    {decisionDetails.candidates.slice(0, 3).map((cand: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center font-mono text-[10px] border-t border-border/40 pt-1">
                        <span>#{idx + 1} {cand.modelSlug}</span>
                        <span className="text-[#8B5CF6]">Score: {Math.round((cand.score || 0) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                )}
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
