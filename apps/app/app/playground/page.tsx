'use client';

import React, { useState } from 'react';
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

export default function PlaygroundPage() {
  const {
    model,
    prompt,
    response,
    decisionDetails,
    setModel,
    setPrompt,
    setResponse,
    setDecisionDetails,
  } = usePlaygroundStore();

  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    try {
      setLoading(true);
      setResponse(null);
      setDecisionDetails(null);

      // Simulate execution call
      await new Promise((res) => setTimeout(res, 600));

      setResponse(`\`\`\`go
package main

import (
    "sync"
    "time"
)

type TokenBucket struct {
    capacity   int64
    tokens     int64
    refillRate int64
    lastRefill time.Time
    mu         sync.Mutex
}

func NewTokenBucket(capacity, refillRate int64) *TokenBucket {
    return &TokenBucket{
        capacity:   capacity,
        tokens:     capacity,
        refillRate: refillRate,
        lastRefill: time.Now(),
    }
}
\`\`\``);

      setDecisionDetails({
        selectedModel: 'claude-3-7-sonnet',
        provider: 'Anthropic',
        routingPolicy: 'prism-auto',
        score: '99.4%',
        latency: '184 ms',
        cost: '$0.0032',
      });

      toast.success('Prompt executed successfully via prism-auto!');
    } finally {
      setLoading(false);
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
                    <SelectItem value="gpt-5-turbo">gpt-5-turbo</SelectItem>
                    <SelectItem value="claude-3-7-sonnet">claude-3-7-sonnet</SelectItem>
                    <SelectItem value="gemini-2.5-pro">gemini-2.5-pro</SelectItem>
                    <SelectItem value="opencode-coder">opencode-coder</SelectItem>
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
              disabled={loading || !prompt.trim()}
            >
              {loading ? (
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
