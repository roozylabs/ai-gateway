import { useQuery } from '@tanstack/react-query';
import { apiGetAuditLogs } from '@/lib/api';

export function useAuditLogsQuery() {
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => apiGetAuditLogs(),
  });
}
