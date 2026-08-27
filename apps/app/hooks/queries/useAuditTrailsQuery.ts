import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGetAuditTrails, apiVerifyAuditIntegrity } from '@/lib/api';

export function useAuditTrailsQuery(params?: { limit?: number; page?: number }) {
  return useQuery({
    queryKey: ['audit-trails', params],
    queryFn: () => apiGetAuditTrails(params),
  });
}

export function useVerifyAuditIntegrity() {
  return useMutation({
    mutationFn: (id: string) => apiVerifyAuditIntegrity(id),
  });
}
