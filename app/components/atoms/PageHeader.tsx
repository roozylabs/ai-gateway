'use client';

import React from 'react';
import { Typography, Space } from 'antd';

const { Title, Text } = Typography;

export interface PageHeaderProps {
  title: string;
  description?: string;
  extra?: React.ReactNode;
  style?: React.CSSProperties;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  extra,
  style,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
        ...style,
      }}
    >
      <div>
        <Title level={3} style={{ margin: 0 }}>
          {title}
        </Title>
        {description && <Text type="secondary">{description}</Text>}
      </div>

      {extra && <Space size="middle" wrap>{extra}</Space>}
    </div>
  );
};

export default PageHeader;
