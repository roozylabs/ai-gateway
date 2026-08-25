'use client';

import React, { useState } from 'react';
import { Card, Form, Input, Button, Select, InputNumber, Switch, Divider, Space, Tag, message, Breadcrumb } from 'antd';
import { BankOutlined, SafetyCertificateOutlined, DollarOutlined, KeyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';

export default function OrganizationSettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSave = (values: any) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      message.success('Organization settings updated successfully');
    }, 600);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Breadcrumb */}
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb 
            items={[
              { title: <Link href="/settings" className="text-slate-400 hover:text-white"><ArrowLeftOutlined className="mr-1" /> Settings</Link> },
              { title: <span className="text-purple-400 font-semibold">Organization Profile</span> },
            ]}
          />
          <h1 className="text-2xl font-bold text-white mt-2 flex items-center gap-2">
            <BankOutlined className="text-purple-500" /> Organization & Billing Profile
          </h1>
          <p className="text-xs text-slate-400">Manage tenant boundaries, spend limits, and multi-tenant cryptographic vaults.</p>
        </div>
        <Tag color="purple" className="px-3 py-1 text-xs font-mono">ENTERPRISE SaaS</Tag>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: 'RoozyLabs Enterprise',
          slug: 'roozylabs-enterprise',
          planTier: 'enterprise',
          maxWorkspaces: 10,
          monthlyBudgetUSD: 500,
          enforceQuota: true,
          requireSSO: true,
        }}
        onFinish={handleSave}
      >
        {/* Profile Card */}
        <Card className="bg-[#0c0d0f] border-[#222222] text-slate-200 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BankOutlined className="text-purple-400" /> Organization Identity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="name" label={<span className="text-slate-300">Organization Name</span>} rules={[{ required: true }]}>
              <Input className="bg-[#121315] border-[#222222] text-white" />
            </Form.Item>
            <Form.Item name="slug" label={<span className="text-slate-300">Tenant Slug</span>} rules={[{ required: true }]}>
              <Input className="bg-[#121315] border-[#222222] text-white" addonBefore="https://app.prism.roozylabs.com/org/" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="planTier" label={<span className="text-slate-300">Subscription Plan Tier</span>}>
              <Select className="bg-[#121315] text-white" options={[
                { value: 'free', label: 'Developer Free' },
                { value: 'pro', label: 'Pro Scale ($99/mo)' },
                { value: 'enterprise', label: 'Enterprise SaaS ($499/mo)' },
              ]} />
            </Form.Item>
            <Form.Item name="maxWorkspaces" label={<span className="text-slate-300">Max Workspaces Limit</span>}>
              <InputNumber min={1} max={100} className="w-full bg-[#121315] border-[#222222] text-white" />
            </Form.Item>
          </div>
        </Card>

        {/* FinOps Spend Limit Card */}
        <Card className="bg-[#0c0d0f] border-[#222222] text-slate-200 shadow-xl mt-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <DollarOutlined className="text-emerald-400" /> FinOps Spend Cap & Billing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="monthlyBudgetUSD" label={<span className="text-slate-300">Monthly Spend Cap (USD)</span>}>
              <InputNumber min={0} prefix="$" className="w-full bg-[#121315] border-[#222222] text-white" />
            </Form.Item>
            <Form.Item name="enforceQuota" label={<span className="text-slate-300">Hard Quota Auto-Suspension</span>} valuePropName="checked">
              <Switch checkedChildren="ON" unCheckedChildren="OFF" />
            </Form.Item>
          </div>
        </Card>

        {/* Security & SSO Card */}
        <Card className="bg-[#0c0d0f] border-[#222222] text-slate-200 shadow-xl mt-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <SafetyCertificateOutlined className="text-cyan-400" /> Security & Enterprise SSO
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="requireSSO" label={<span className="text-slate-300">Enforce Enforce SAML / OIDC Single Sign-On</span>} valuePropName="checked">
              <Switch checkedChildren="ON" unCheckedChildren="OFF" />
            </Form.Item>
          </div>
        </Card>

        {/* Submit */}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="primary" loading={loading} htmlType="submit" className="bg-purple-600 hover:bg-purple-500 font-semibold px-6">
            Save Organization Settings
          </Button>
        </div>
      </Form>
    </div>
  );
}
