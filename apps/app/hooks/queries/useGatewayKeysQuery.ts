import { useQuery } from '@tanstack/react-query';
import { apiGetGatewayKeys } from '@/lib/api';
export { useCreateGatewayKeyMutation as useCreateGatewayKey, useDeleteGatewayKeyMutation as useDeleteGatewayKey } from '@/hooks/mutations/useGatewayKeyMutations';

export function useGatewayKeysQuery(params?: Parameters<typeof apiGetGatewayKeys>[0]) {
  return useQuery({
    queryKey: ['gateway-keys', params],
    queryFn: () => apiGetGatewayKeys(params),
  });
}
