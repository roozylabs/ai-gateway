'use client';

import React from 'react';
import { Card, Statistic } from 'antd';
import type { StatisticProps } from 'antd';
import { useTheme } from '@/context/ThemeContext';

export interface MetricCardProps extends StatisticProps {
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ loading = false, ...statisticProps }) => {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <Card
      size="small"
      variant="borderless"
      loading={loading}
      style={{
        borderRadius: 8,
        boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <Statistic {...statisticProps} />
    </Card>
  );
};

export default MetricCard;
