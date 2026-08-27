import { useMutation } from '@tanstack/react-query';
import { apiExportAuditLogs } from '@/lib/api';

export function useExportAuditLogsMutation() {
  return useMutation({
    mutationFn: (params: { format: 'csv' | 'json'; startDate?: string; endDate?: string }) =>
      apiExportAuditLogs(params),
  });
}
