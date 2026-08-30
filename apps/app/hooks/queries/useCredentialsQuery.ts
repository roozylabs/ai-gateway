import { useQuery } from '@tanstack/react-query';
import { apiGetCredentials } from '@/lib/api';
export { useDeleteCredentialMutation as useDeleteCredential } from '@/hooks/mutations/useCredentialMutations';

export function useCredentialsQuery(providerId: string = 'openai') {
  return useQuery({
    queryKey: ['credentials', providerId],
    queryFn: () => apiGetCredentials(providerId),
  });
}
