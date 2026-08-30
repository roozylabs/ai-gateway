'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { Textarea } from '@/components/atoms/Textarea';
import { Badge } from '@/components/atoms/Badge';
import { Cpu, Send, RefreshCw, Box, Layers, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { usePlaygroundStore } from '@/stores/usePlaygroundStore';
import { useSimulateRoutingMutation } from '@/hooks/mutations/usePlaygroundMutations';
import { useModelsListQuery } from '@/hooks/queries/useModelsListQuery';
import { getErrorMessage } from '@/types/ui';
import { ApiModelScoreDetail } from '@/lib/api';

export default function PlaygroundPage() {
  const {
    model,
    prompt,
    decisionDetails,
    isStreaming,
    setModel,
    setPrompt,
    setDecisionDetails,
    setIsStreaming,
  } = usePlaygroundStore();

  const { data: modelsData } = useModelsListQuery();
  const models = modelsData?.data ?? [];
  const simulateMutation = useSimulateRoutingMutation();

  const handleSimulate = async () => {
    try {
      setIsStreaming(true);
      setDecisionDetails(null);

      const decision = await simulateMutation.mutateAsync({ prompt });
      const candidateList = decision.candidates || [];
      setDecisionDetails({
        selectedModel: decision.selectedModel,
        provider: decision.selectedProvider,
        routingPolicy: decision.policyName,
        score: `${Math.round((decision.candidates?.[0]?.score ?? 0) * 100)}%`,
        latency: decision.candidates?.[0]?.speedScore != null ? `${decision.candidates[0].speedScore}ms` : '-',
        cost: decision.candidates?.[0]?.inputPrice1M != null ? `$${decision.candidates[0].inputPrice1M}/1M` : '-',
        candidates: candidateList,
      });

      toast.success(`Dry-run simulation completed! Selected candidate: ${decision.selectedModel}`);
    } catch (error: unknown) {
      toast.error(`Simulation failed: ${getErrorMessage(error)}`);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Routing Simulator & Dry-Run Playground"
        description="Dry-run simulator for Prism Smart Router. Evaluate multi-factor candidate scoring, policy decision matrices, and candidate rankings without consuming API keys or token budgets."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request Input Form */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span>Simulation Prompt Input</span>
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
              placeholder="Type your system or user prompt here to evaluate dry-run routing decision..."
              className="flex-1 min-h-[220px] font-mono text-xs p-3"
            />

            <div className="flex gap-2">
              <Button
                variant="prismViolet"
                className="flex-1 gap-2"
                onClick={handleSimulate}
                disabled={isStreaming || !prompt.trim()}
              >
                {isStreaming ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Simulating Routing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Run Dry-Run Simulation
                  </>
                )}
              </Button>

              <Button variant="outline" asChild className="gap-2 text-xs border-violet-500/30">
                <Link href="/sandbox">
                  <Box className="h-4 w-4 text-primary" />
                  <span>Live Sandbox</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Response & Decision Inspector */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                <span>Candidate Ranking & Decision Matrix</span>
              </CardTitle>
              {decisionDetails && (
                <Badge variant="violet" className="font-mono text-[10px] gap-1">
                  <Layers className="h-3 w-3" />
                  {decisionDetails.selectedModel}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            {decisionDetails ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 p-3 rounded-md border border-border bg-muted/20 font-mono text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">WINNING CANDIDATE</span>
                    <span className="font-bold text-foreground">{decisionDetails.selectedModel}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">EVALUATED POLICY</span>
                    <span className="font-bold text-foreground">{decisionDetails.routingPolicy || 'Auto Score'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">TOP MATCH SCORE</span>
                    <span className="font-bold text-[#8B5CF6]">{decisionDetails.score}</span>
                  </div>
                </div>

                {decisionDetails.candidates && decisionDetails.candidates.length > 0 && (
                  <div className="p-3 rounded-md border border-border bg-muted/10 space-y-2 text-[11px]">
                    <span className="font-semibold text-muted-foreground text-[10px] block">CANDIDATE FACTOR BREAKDOWN RANKING</span>
                    {decisionDetails.candidates.map((cand: ApiModelScoreDetail, idx: number) => (
                      <div key={idx} className="flex justify-between items-center font-mono text-[11px] border-t border-border/40 pt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[#8B5CF6] font-bold">#{idx + 1}</span>
                          <span className="font-semibold">{cand.displayName || cand.slug || cand.modelId}</span>
                          <span className="text-muted-foreground text-[10px]">({cand.providerName})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-400 text-[10px]">${cand.inputPrice1M}/1M</span>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {Math.round((cand.score || 0) * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center rounded-md border border-border bg-muted/40 p-6 text-center">
                <Cpu className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <span className="text-muted-foreground text-xs italic">
                  Enter a prompt and click &quot;Run Dry-Run Simulation&quot; to inspect candidate rankings and scoring breakdown without consuming API keys.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
