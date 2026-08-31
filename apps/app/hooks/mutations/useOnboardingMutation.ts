import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiCompleteOnboarding,
  ApiCompleteOnboardingRequest,
  ApiCompleteOnboardingResponse,
} from '@/lib/api';

export function useOnboardingMutation() {
  const queryClient = useQueryClient();

  return useMutation<ApiCompleteOnboardingResponse, Error, ApiCompleteOnboardingRequest>({
    mutationFn: (payload: ApiCompleteOnboardingRequest) => apiCompleteOnboarding(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['gateway-keys'] });
    },
  });
}
