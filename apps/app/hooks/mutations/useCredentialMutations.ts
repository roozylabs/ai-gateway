import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiTestCredential, apiResetCredentialCooldown, apiCreateCredential, apiDeleteCredential } from '@/lib/api';

export function useTestCredentialMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (d: { providerId: string; credId: string }) =>
      apiTestCredential(d.providerId, d.credId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
}

export function useResetCooldownMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (d: { providerId: string; credId: string }) =>
      apiResetCredentialCooldown(d.providerId, d.credId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
}

export function useCreateCredentialMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (d: { providerId: string; name: string; apiKey: string }) =>
      apiCreateCredential(d.providerId, { name: d.name, apiKey: d.apiKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
}

export function useDeleteCredentialMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (d: { providerId: string; credId: string }) =>
      apiDeleteCredential(d.providerId, d.credId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
}
