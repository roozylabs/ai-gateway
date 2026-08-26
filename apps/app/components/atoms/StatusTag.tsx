'use client';

import React from 'react';
import { StatusDot, StatusType } from '@/components/atoms/Badge';

export interface StatusTagProps {
  status: StatusType;
  label?: string;
}

export function StatusTag(props: StatusTagProps) {
  return <StatusDot {...props} />;
}
