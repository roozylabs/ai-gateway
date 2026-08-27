'use client';

import dynamic from 'next/dynamic';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export interface TrafficChartData {
  time: string;
  requests: number;
}

export interface TrafficChartProps {
  data: TrafficChartData[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="rounded-none border border-violet-500/40 bg-slate-950/95 px-3 py-2 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 border-b border-white/10 pb-1 mb-1.5 text-[11px] font-mono text-slate-400">
          <span className="h-1.5 w-1.5 bg-[#8B5CF6] inline-block" />
          <span>{label}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-xs font-mono">
          <span className="text-slate-300">Requests:</span>
          <span className="font-bold text-[#8B5CF6]">{Number(value).toLocaleString()} req</span>
        </div>
      </div>
    );
  }
  return null;
};

function TrafficChartInner({ data, height = 240 }: TrafficChartProps) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            stroke="currentColor"
            className="text-[10px] text-muted-foreground"
            tickLine={false}
          />
          <YAxis
            stroke="currentColor"
            className="text-[10px] text-muted-foreground"
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(139, 92, 246, 0.4)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="requests"
            stroke="#8B5CF6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#violetGradient)"
            activeDot={{ r: 4, stroke: '#8B5CF6', strokeWidth: 2, fill: '#090D16' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export const LazyTrafficChart = dynamic(() => Promise.resolve(TrafficChartInner), {
  ssr: false,
  loading: () => <div className="h-[240px] w-full animate-pulse rounded bg-muted/40" />,
});
