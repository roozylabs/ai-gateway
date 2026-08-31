'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { FeatureFlagKey, ApiFeaturesResponse, DEFAULT_FEATURE_FLAGS } from '@/lib/features/features';

export function useFeatureFlagsQuery() {
  return useQuery<ApiFeaturesResponse>({
    queryKey: ['features'],
    queryFn: async () => {
      try {
        const res = await api.get<ApiFeaturesResponse>('/features');
        return res.data;
      } catch {
        return {
          version: '0.2.3',
          planTier: 'free',
          flags: DEFAULT_FEATURE_FLAGS,
        };
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const { data } = useFeatureFlagsQuery();
  if (!data || !data.flags) {
    return DEFAULT_FEATURE_FLAGS[flag] ?? false;
  }
  return data.flags[flag] ?? DEFAULT_FEATURE_FLAGS[flag] ?? false;
}
