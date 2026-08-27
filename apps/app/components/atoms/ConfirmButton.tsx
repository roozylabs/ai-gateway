'use client';

import { ConfirmDialog, ConfirmDialogProps } from '@/components/molecules/ConfirmDialog';

export type ConfirmButtonProps = ConfirmDialogProps;

export function ConfirmButton(props: ConfirmButtonProps) {
  return <ConfirmDialog {...props} />;
}
