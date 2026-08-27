'use client';

import { Layers, Activity, KeyRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiGetLogs, ApiRequestLog } from '@/lib/api';

export function ModelActivityWidget({ collapsed }: { collapsed?: boolean }) {
  const { data: logsData } = useQuery({
    queryKey: ['active-model-activity'],
    queryFn: () => apiGetLogs({ page: 1, limit: 5 }),
    refetchInterval: 5000,
  });

  const logsList: ApiRequestLog[] = logsData?.data ?? [];
  const latestLog = logsList[0];
  const activeModel = latestLog?.model || 'prism-auto';
  const activeCred = latestLog?.credentialName || (latestLog?.gatewayApiKeyId ? `gw_sk_${latestLog.gatewayApiKeyId.slice(0, 6)}` : 'Gateway Key');

  if (collapsed) {
    return (
      <div
        className="flex items-center justify-center py-2 text-[#8B5CF6]"
        title={`Active Router (prism-auto) | Last Model: ${activeModel} | Credential: ${activeCred}`}
      >
        <Activity className="h-4 w-4 animate-pulse text-emerald-400" />
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

      <div className="space-y-1 font-mono text-xs pt-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <Layers className="h-3.5 w-3.5 text-[#8B5CF6]" />
            <span className="truncate max-w-[110px]">{activeModel}</span>
          </div>
          <span className="text-muted-foreground text-[10px]">
            {latestLog ? `${latestLog.latencyMs}ms` : 'Idle'}
          </span>
        </div>

        {latestLog && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5 truncate">
            <KeyRound className="h-3 w-3 text-violet-400 shrink-0" />
            <span className="truncate">Key: {activeCred}</span>
          </div>
        )}
      </div>
    </div>
  );
}
