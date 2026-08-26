'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Slider } from '@/components/atoms/Slider';
import { Badge } from '@/components/atoms/Badge';
import { Workflow, Plus, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function PoliciesPage() {
  const [qualityWeight, setQualityWeight] = useState(40);
  const [costWeight, setCostWeight] = useState(30);
  const [speedWeight, setSpeedWeight] = useState(20);
  const [healthWeight, setHealthWeight] = useState(10);

  const handleSave = () => {
    toast.success('Prism-Auto routing policy weights saved successfully!');
  };

  return (
    <AppLayout>
      <PageHeader
        title="Routing Policies & Policy Weight Tuner"
        description="Configure dynamic multi-factor routing policies to balance Quality, Cost, Latency, and Provider Health."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => toast.info('Create Policy Drawer')}>
            <Plus className="h-4 w-4" /> Create Custom Policy
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#8B5CF6]" />
              <span>prism-auto Routing Engine Weights</span>
            </CardTitle>
            <CardDescription>Adjust the influence of each decision factor for automated model selection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-foreground">Quality Factor Weight</span>
                <span className="font-mono font-bold text-[#8B5CF6]">{qualityWeight}%</span>
              </div>
              <Slider
                value={[qualityWeight]}
                onValueChange={(val) => setQualityWeight(val[0])}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-foreground">Cost Optimization Weight</span>
                <span className="font-mono font-bold text-emerald-500">{costWeight}%</span>
              </div>
              <Slider
                value={[costWeight]}
                onValueChange={(val) => setCostWeight(val[0])}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-foreground">Speed & Latency Weight</span>
                <span className="font-mono font-bold text-cyan-500">{speedWeight}%</span>
              </div>
              <Slider
                value={[speedWeight]}
                onValueChange={(val) => setSpeedWeight(val[0])}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-foreground">Provider Health Weight</span>
                <span className="font-mono font-bold text-amber-500">{healthWeight}%</span>
              </div>
              <Slider
                value={[healthWeight]}
                onValueChange={(val) => setHealthWeight(val[0])}
                max={100}
                step={5}
              />
            </div>

            <Button variant="prismViolet" className="w-full gap-2 mt-4" onClick={handleSave}>
              <Save className="h-4 w-4" /> Save Policy Parameters
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Workflow className="h-5 w-5 text-[#8B5CF6]" />
              <span>Active Routing Rule Sets</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">prism-auto (Default Policy)</span>
                <Badge variant="violet">Active</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically resolves candidate model based on quality, latency, and cost scores.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">cost-priority-strict</span>
                <Badge variant="outline">Standby</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Forces rerouting to lowest-cost models (e.g. gpt-5-mini / opencode-coder) unless error threshold breached.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
