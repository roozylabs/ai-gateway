'use client';

import React from 'react';
import { Tag } from 'antd';
import type { TagProps } from 'antd';
import {
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

export type StatusType =
  | 'active'
  | 'enabled'
  | 'healthy'
  | 'success'
  | 'revoked'
  | 'disabled'
  | 'inactive'
  | 'rate_limited'
  | 'degraded'
  | 'warning'
  | 'error'
  | 'down'
  | 'invalid'
  | (string & {})
  | number;

export interface StatusTagProps extends Omit<TagProps, 'status'> {
  status: StatusType;
  label?: string;
}

export const StatusTag: React.FC<StatusTagProps> = ({ status, label, ...tagProps }) => {
  let color: TagProps['color'] = 'default';
  let icon: React.ReactNode = null;
  let textLabel = label || String(status).toUpperCase();

  if (typeof status === 'number') {
    if (status >= 200 && status < 300) {
      color = 'success';
      icon = <CheckCircleOutlined />;
      textLabel = label || `${status} OK`;
    } else if (status === 429) {
      color = 'warning';
      icon = <SyncOutlined spin />;
      textLabel = label || `429 Rate Limit`;
    } else {
      color = 'error';
      icon = <CloseCircleOutlined />;
      textLabel = label || `${status} Error`;
    }
  } else {
    const s = String(status).toLowerCase();
    switch (s) {
      case 'active':
      case 'enabled':
      case 'healthy':
      case 'success':
        color = 'success';
        icon = <CheckCircleOutlined />;
        textLabel = label || s.toUpperCase();
        break;
      case 'rate_limited':
      case 'rate-limited':
        color = 'warning';
        icon = <SyncOutlined spin />;
        textLabel = label || 'RATE LIMITED';
        break;
      case 'degraded':
      case 'warning':
        color = 'warning';
        icon = <ExclamationCircleOutlined />;
        textLabel = label || s.toUpperCase();
        break;
      case 'revoked':
      case 'error':
      case 'down':
      case 'invalid':
        color = 'error';
        icon = <CloseCircleOutlined />;
        textLabel = label || s.toUpperCase();
        break;
      case 'disabled':
      case 'inactive':
      default:
        color = 'default';
        icon = <MinusCircleOutlined />;
        textLabel = label || s.toUpperCase();
        break;
    }
  }

  return (
    <Tag color={color} icon={icon} {...tagProps}>
      {textLabel}
    </Tag>
  );
};

export default StatusTag;
