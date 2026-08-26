'use client';

import React from 'react';
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
            contentStyle={{
              backgroundColor: 'var(--popover)',
              borderColor: 'var(--border)',
              borderRadius: '6px',
              color: 'var(--popover-foreground)',
              fontSize: '12px',
            }}
          />
          <Area
            type="monotone"
            dataKey="requests"
            stroke="#8B5CF6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#violetGradient)"
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
