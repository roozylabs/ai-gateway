import { useQuery } from '@tanstack/react-query';
import { apiGetLogs } from '@/lib/api';

export function useLogsQuery() {
  return useQuery({
    queryKey: ['request-logs'],
    queryFn: () => apiGetLogs(),
  });
}
