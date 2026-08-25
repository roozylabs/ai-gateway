'use client';

import React from 'react';
import { Button, Popconfirm } from 'antd';
import type { ButtonProps, PopconfirmProps } from 'antd';

export interface ConfirmButtonProps extends Omit<ButtonProps, 'onConfirm'> {
  confirmTitle: string;
  confirmDescription?: string;
  onConfirm: PopconfirmProps['onConfirm'];
  okText?: string;
  cancelText?: string;
}

export const ConfirmButton: React.FC<ConfirmButtonProps> = ({
  confirmTitle,
  confirmDescription,
  onConfirm,
  okText = 'Yes',
  cancelText = 'No',
  children,
  danger = true,
  type = 'link',
  ...buttonProps
}) => {
  return (
    <Popconfirm
      title={confirmTitle}
      description={confirmDescription}
      onConfirm={onConfirm}
      okText={okText}
      cancelText={cancelText}
    >
      <Button type={type} danger={danger} {...buttonProps}>
        {children}
      </Button>
    </Popconfirm>
  );
};

export default ConfirmButton;
