'use client';

import { Layers, Activity } from 'lucide-react';
import { useModelsListQuery } from '@/hooks/queries/useModelsListQuery';

export function ModelActivityWidget({ collapsed }: { collapsed?: boolean }) {
  const { data: modelsData } = useModelsListQuery();
  const models = modelsData?.data ?? [];
  const activeCount = models.length;

  if (collapsed) {
    return (
      <div className="flex items-center justify-center py-2 text-[#8B5CF6]" title={`Active Model Router (prism-auto): ${activeCount} Providers Online`}>
        <Activity className="h-4 w-4 animate-pulse text-[#8B5CF6]" />
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border border-border bg-card/60 backdrop-blur space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[11px]">
          <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span className="uppercase tracking-wider">ACTIVE MODEL ROUTER</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold">ONLINE</span>
      </div>

      <div className="flex items-center justify-between font-mono text-xs pt-0.5">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <Layers className="h-3.5 w-3.5 text-[#8B5CF6]" />
          <span>prism-auto</span>
        </div>
        <span className="text-muted-foreground text-[11px]">{activeCount} Models Active</span>
      </div>
    </div>
  );
}
