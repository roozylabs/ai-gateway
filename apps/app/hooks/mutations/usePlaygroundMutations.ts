import { useMutation } from '@tanstack/react-query';
import { apiSimulateRouting, ApiRoutingSimulationReq } from '@/lib/api';

export function useSimulateRoutingMutation() {
  return useMutation({
    mutationFn: (req: ApiRoutingSimulationReq) => apiSimulateRouting(req),
  });
}
