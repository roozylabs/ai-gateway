import { useQuery } from '@tanstack/react-query';
import { apiGetDashboardStats, apiGetDashboardUsage, apiGetDashboardHealth } from '@/lib/api';

export function dateRangeToParams(dateRange?: string): { days?: number } | undefined {
  if (!dateRange || dateRange === '30d') return { days: 30 };
  if (dateRange === '24h') return { days: 1 };
  if (dateRange === '7d') return { days: 7 };
  if (dateRange === '90d') return { days: 90 };
  if (dateRange === 'all') return { days: 0 };
  return { days: 30 };
}

export function useDashboardStatsQuery(dateRange?: string) {
  const params = dateRangeToParams(dateRange);
  return useQuery({
    queryKey: ['dashboard-stats', dateRange || '30d'],
    queryFn: () => apiGetDashboardStats(params),
  });
}

export function useUsageChartQuery(dateRange?: string) {
  const params = dateRangeToParams(dateRange);
  return useQuery({
    queryKey: ['dashboard-usage-chart', dateRange || '30d'],
    queryFn: () => apiGetDashboardUsage(params),
  });
}

export function useDashboardHealthQuery() {
  return useQuery({
    queryKey: ['dashboard-health'],
    queryFn: apiGetDashboardHealth,
  });
}
