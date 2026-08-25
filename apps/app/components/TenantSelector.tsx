'use client';

import React, { useState } from 'react';
import { Select, Space, Tag } from 'antd';
import { BankOutlined, FolderOutlined, ProjectOutlined } from '@ant-design/icons';

export function TenantSelector() {
  const [selectedOrg, setSelectedOrg] = useState('org_default');
  const [selectedWs, setSelectedWs] = useState('ws_default');
  const [selectedProj, setSelectedProj] = useState('proj_default');

  return (
    <Space size="middle" className="bg-[#0f1115] px-3 py-1.5 rounded-lg border border-[#222222]">
      {/* Organization */}
      <Space size={4}>
        <BankOutlined style={{ color: '#8B5CF6' }} />
        <Select
          size="small"
          value={selectedOrg}
          onChange={setSelectedOrg}
          variant="borderless"
          style={{ width: 140, color: '#e3e2e3' }}
          options={[
            { value: 'org_default', label: 'Default Org' },
            { value: 'org_enterprise', label: 'RoozyLabs Enterprise' },
          ]}
        />
      </Space>

      <span className="text-slate-600">/</span>

      {/* Workspace */}
      <Space size={4}>
        <FolderOutlined style={{ color: '#06B6D4' }} />
        <Select
          size="small"
          value={selectedWs}
          onChange={setSelectedWs}
          variant="borderless"
          style={{ width: 140, color: '#e3e2e3' }}
          options={[
            { value: 'ws_default', label: 'Default Workspace' },
            { value: 'ws_core_eng', label: 'Core Engineering' },
          ]}
        />
      </Space>

      <span className="text-slate-600">/</span>

      {/* Project */}
      <Space size={4}>
        <ProjectOutlined style={{ color: '#10B981' }} />
        <Select
          size="small"
          value={selectedProj}
          onChange={setSelectedProj}
          variant="borderless"
          style={{ width: 140, color: '#e3e2e3' }}
          options={[
            { value: 'proj_default', label: 'Default Project' },
            { value: 'proj_api_gateway', label: 'Prism API Gateway' },
          ]}
        />
      </Space>

      <Tag color="purple" style={{ margin: 0, fontSize: '10px' }}>ENTERPRISE SaaS</Tag>
    </Space>
  );
}
