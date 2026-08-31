'use client';

import React from 'react';
import { FeatureFlagKey } from '@/lib/features/features';
import { useFeatureFlag } from '@/hooks/queries/useFeatureFlags';

interface FeatureGateProps {
  flag: FeatureFlagKey;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function FeatureGate({ flag, fallback = null, children }: FeatureGateProps) {
  const isEnabled = useFeatureFlag(flag);

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
