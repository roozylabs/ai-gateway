import { useQuery } from '@tanstack/react-query';
import { apiGetDashboardStats, apiGetDashboardUsage } from '@/lib/api';

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: apiGetDashboardStats,
  });
}

export function useUsageChartQuery() {
  return useQuery({
    queryKey: ['dashboard-usage-chart'],
    queryFn: () => apiGetDashboardUsage(),
  });
}
