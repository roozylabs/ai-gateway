'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Tag,
  Badge,
  Space,
  Table,
  Statistic,
  Alert,
  message,
  List,
} from 'antd';
import {
  CreditCardOutlined,
  CheckCircleOutlined,
  CrownOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import {
  apiGetBillingPlans,
  apiGetActiveSubscription,
  apiUpgradeSubscription,
  apiGetInvoices,
  ApiBillingPlan,
  ApiBillingInvoice,
} from '@/lib/api';
import { PermissionGuard } from '@/components/PermissionProvider';

const { Title, Text, Paragraph } = Typography;

export default function BillingSettingsPage() {
  const queryClient = useQueryClient();

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: apiGetBillingPlans,
  });

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: apiGetActiveSubscription,
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: apiGetInvoices,
  });

  const upgradeMutation = useMutation({
    mutationFn: (slug: string) => apiUpgradeSubscription(slug),
    onSuccess: (data) => {
      message.success(`Successfully switched plan to ${data.planSlug.toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: ['billing-subscription'] });
    },
    onError: (err: any) => {
      message.error('Failed to upgrade plan: ' + (err.message || 'Unknown error'));
    },
  });

  const plans = plansData?.data || [];
  const currentPlan = subData?.plan;
  const invoices = invoicesData?.data || [];

  const invoiceColumns = [
    {
      title: 'Invoice ID / Number',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (val: string) => <Text code copyable>{val}</Text>,
    },
    {
      title: 'Billing Period',
      key: 'period',
      render: (_: any, record: ApiBillingInvoice) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(record.periodStart).toLocaleDateString()} ➔ {new Date(record.periodEnd).toLocaleDateString()}
        </Text>
      ),
    },
    {
      title: 'Amount Due',
      dataIndex: 'amountDueUsd',
      key: 'amountDueUsd',
      render: (val: number) => <Text strong style={{ color: '#52c41a' }}>${(val || 0).toFixed(2)} USD</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Badge
          status={status === 'paid' ? 'success' : status === 'pending' ? 'warning' : 'error'}
          text={status.toUpperCase()}
        />
      ),
    },
    {
      title: 'Receipt Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
  ];

  return (
    <PermissionGuard permission="billing:read" fallback={<Alert type="error" message="Access Denied" description="Required permission: billing:read" />}>
      <div style={{ padding: '24px' }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          <CreditCardOutlined style={{ marginRight: 8, color: '#1677ff' }} />
          Subscriptions & Billing Management
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          Manage your organization's subscription plan, provider cost markup structures, and billing invoice receipts.
        </Paragraph>

        {/* Current Active Plan Card */}
        <Card style={{ marginBottom: 32, background: 'linear-gradient(135deg, #141414 0%, #1f1f1f 100%)', borderColor: '#303030' }}>
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} md={12}>
              <Space direction="vertical" size="small">
                <Space>
                  <CrownOutlined style={{ color: '#faad14', fontSize: 20 }} />
                  <Text strong style={{ fontSize: 18, color: '#fff' }}>
                    Active Plan: {currentPlan?.name || 'Pro Developer'}
                  </Text>
                  <Tag color="success">ACTIVE</Tag>
                </Space>
                <Text type="secondary" style={{ color: '#bfbfbf' }}>
                  Renews on: {subData?.currentPeriodEnd ? new Date(subData.currentPeriodEnd).toLocaleDateString() : 'Next Month'}
                </Text>
              </Space>
            </Col>
            <Col xs={24} md={12}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title={<Text style={{ color: '#bfbfbf' }}>Monthly Usage Spent</Text>}
                    value={subData?.monthlyUsageSpent || 0}
                    precision={2}
                    prefix="$"
                    suffix="USD"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<Text style={{ color: '#bfbfbf' }}>Platform Fee Markup</Text>}
                    value={(currentPlan?.markupPercentage || 0) * 100}
                    precision={1}
                    suffix="%"
                    valueStyle={{ color: '#1677ff' }}
                  />
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>

        {/* Pricing Tiers Grid */}
        <Title level={4} style={{ marginBottom: 16 }}>Available Subscription Tiers</Title>
        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          {plans.map((plan: ApiBillingPlan) => {
            const isCurrent = currentPlan?.slug === plan.slug;
            return (
              <Col xs={24} sm={12} lg={6} key={plan.id}>
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    borderColor: isCurrent ? '#1677ff' : undefined,
                    borderWidth: isCurrent ? 2 : 1,
                  }}
                  title={
                    <Space>
                      {plan.slug === 'enterprise' ? <CrownOutlined style={{ color: '#faad14' }} /> : <ThunderboltOutlined style={{ color: '#1677ff' }} />}
                      <span>{plan.name}</span>
                    </Space>
                  }
                  extra={isCurrent ? <Tag color="blue">CURRENT</Tag> : null}
                >
                  <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 24 }}>${plan.priceMonthlyUsd}</Text>
                    <Text type="secondary"> / month</Text>
                  </div>

                  <List
                    size="small"
                    dataSource={plan.features}
                    renderItem={(item) => (
                      <List.Item style={{ padding: '6px 0', border: 'none' }}>
                        <Space>
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          <Text style={{ fontSize: 12 }}>{item}</Text>
                        </Space>
                      </List.Item>
                    )}
                    style={{ marginBottom: 20 }}
                  />

                  <PermissionGuard permission="billing:manage" disabledTooltip="Requires billing:manage to change subscription plans">
                    <Button
                      type={isCurrent ? 'default' : 'primary'}
                      block
                      disabled={isCurrent}
                      loading={upgradeMutation.isPending}
                      onClick={() => upgradeMutation.mutate(plan.slug)}
                    >
                      {isCurrent ? 'Active Tier' : 'Upgrade Plan'}
                    </Button>
                  </PermissionGuard>
                </Card>
              </Col>
            );
          })}
        </Row>

        {/* Invoice Receipts Table */}
        <Card title={
          <Space>
            <FileTextOutlined style={{ color: '#1677ff' }} />
            <span>Billing Invoice Receipts & Financial Logs</span>
          </Space>
        }>
          <Table
            rowKey="id"
            dataSource={invoices}
            columns={invoiceColumns}
            loading={invoicesLoading}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'No billing invoices recorded yet.' }}
          />
        </Card>
      </div>
    </PermissionGuard>
  );
}
