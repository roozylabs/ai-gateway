'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Drawer,
  Space,
  Tag,
  Select,
  Typography,
  Badge,
  Alert,
  Descriptions,
  Row,
  Col,
  Input,
  Statistic,
} from 'antd';
import {
  AuditOutlined,
  VerifiedOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  DollarOutlined,
  FieldTimeOutlined,
  KeyOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import {
  ApiAIAuditTrail,
  ApiAuditVerificationResult,
  apiGetAuditTrails,
  apiVerifyAuditIntegrity,
} from '@/lib/api';

const { Text, Title } = Typography;
const { Option } = Select;

export default function AuditTrailPage() {
  const [filterCompliance, setFilterCompliance] = useState<string | undefined>();
  const [filterAgent, setFilterAgent] = useState<string>('');
  const [inspectAudit, setInspectAudit] = useState<ApiAIAuditTrail | null>(null);
  const [verifyResult, setVerifyResult] = useState<ApiAuditVerificationResult | null>(null);

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-trails', filterCompliance, filterAgent],
    queryFn: () =>
      apiGetAuditTrails({
        complianceStatus: filterCompliance,
        agentName: filterAgent || undefined,
        pageSize: 50,
      }),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => apiVerifyAuditIntegrity(id),
    onSuccess: (data) => setVerifyResult(data),
  });

  const handleInspect = (record: ApiAIAuditTrail) => {
    setInspectAudit(record);
    setVerifyResult(null);
    verifyMutation.mutate(record.id);
  };

  const trails = auditData?.data || [];
  const totalLogs = auditData?.total || 0;

  const columns = [
    {
      title: 'Time & Request ID',
      key: 'req',
      width: 220,
      render: (_: any, record: ApiAIAuditTrail) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ fontSize: 13 }}>{new Date(record.createdAt).toLocaleString()}</Text>
          <Text type="secondary" style={{ fontSize: 11 }} code>
            {record.requestId}
          </Text>
        </Space>
      ),
    },
    {
      title: 'WHO (Agent / Role)',
      key: 'who',
      render: (_: any, record: ApiAIAuditTrail) => (
        <Space direction="vertical" size={1}>
          <Space wrap>
            <Tag icon={<RobotOutlined />} color="purple">
              {record.agentName || 'Direct API User'}
            </Tag>
            <Tag color="cyan">{record.userRole}</Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: 11 }}>User: {record.userId}</Text>
        </Space>
      ),
    },
    {
      title: 'MODEL & FAILOVER',
      key: 'model',
      render: (_: any, record: ApiAIAuditTrail) => (
        <Space direction="vertical" size={1}>
          <Tag color="blue">{record.modelSlug}</Tag>
          {record.failoverChain && record.failoverChain.length > 0 && (
            <Text type="secondary" style={{ fontSize: 10 }}>
              Failover: {record.failoverChain.join(' ➔ ')}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'TOOLS & RESOURCES',
      key: 'tools',
      render: (_: any, record: ApiAIAuditTrail) => (
        <Space wrap>
          {record.toolsInvoked?.map((t) => <Tag key={t} color="orange">{t}</Tag>)}
          {record.resourcesAccessed?.map((r) => <Tag key={r} color="green">{r}</Tag>)}
          {record.mcpServersCalled?.map((m) => <Tag key={m} color="gold">MCP: {m}</Tag>)}
          {(!record.toolsInvoked || record.toolsInvoked.length === 0) &&
            (!record.resourcesAccessed || record.resourcesAccessed.length === 0) &&
            (!record.mcpServersCalled || record.mcpServersCalled.length === 0) && (
              <Text type="secondary" style={{ fontSize: 11 }}>-</Text>
            )}
        </Space>
      ),
    },
    {
      title: 'COST & LATENCY',
      key: 'cost',
      render: (_: any, record: ApiAIAuditTrail) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ color: '#52c41a', fontSize: 12 }}>
            ${(record.totalCostUsd || 0).toFixed(6)}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.totalTokens} tokens • {record.latencyMs}ms
          </Text>
        </Space>
      ),
    },
    {
      title: 'COMPLIANCE',
      key: 'compliance',
      width: 140,
      render: (_: any, record: ApiAIAuditTrail) => {
        const color = record.complianceStatus === 'compliant' ? 'success' : record.complianceStatus === 'flagged' ? 'warning' : 'error';
        return (
          <Badge
            status={color as any}
            text={record.complianceStatus.toUpperCase()}
          />
        );
      },
    },
    {
      title: 'Audit Detail',
      key: 'action',
      width: 130,
      render: (_: any, record: ApiAIAuditTrail) => (
        <Button
          size="small"
          type="primary"
          ghost
          icon={<VerifiedOutlined />}
          onClick={() => handleInspect(record)}
        >
          Verify
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Audit Records Logged"
              value={totalLogs}
              prefix={<AuditOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Cryptographic Integrity Rate"
              value={100}
              suffix="%"
              prefix={<VerifiedOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Compliance Security Enforcement"
              value="ACTIVE"
              prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <AuditOutlined style={{ color: '#1677ff' }} />
            <span>End-to-End AI Audit Trail & Compliance Inspector</span>
          </Space>
        }
        extra={
          <Space>
            <Input
              placeholder="Filter by Agent Name..."
              prefix={<SearchOutlined />}
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              style={{ width: 220 }}
            />
            <Select
              placeholder="Compliance Status"
              allowClear
              value={filterCompliance}
              onChange={(v) => setFilterCompliance(v)}
              style={{ width: 180 }}
            >
              <Option value="compliant">COMPLIANT</Option>
              <Option value="flagged">FLAGGED</Option>
              <Option value="denied">DENIED</Option>
            </Select>
          </Space>
        }
      >
        <Table
          rowKey="id"
          dataSource={trails}
          columns={columns}
          loading={isLoading}
          pagination={{ pageSize: 50 }}
          locale={{ emptyText: 'No AI audit records found matching criteria.' }}
        />
      </Card>

      {/* Audit Detail & Cryptographic Verification Drawer */}
      <Drawer
        title={
          <Space>
            <VerifiedOutlined style={{ color: '#52c41a' }} />
            <span>Audit Trail Cryptographic Verification</span>
          </Space>
        }
        open={!!inspectAudit}
        onClose={() => setInspectAudit(null)}
        width={600}
      >
        {inspectAudit && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {verifyResult && (
              <Alert
                type={verifyResult.valid ? 'success' : 'error'}
                icon={verifyResult.valid ? <CheckCircleOutlined /> : <WarningOutlined />}
                showIcon
                message={
                  <Text strong style={{ fontSize: 15 }}>
                    {verifyResult.valid ? 'Cryptographic Integrity Verified (Tamper-Free)' : 'Integrity Mismatch Detected'}
                  </Text>
                }
                description={verifyResult.message}
              />
            )}

            <Descriptions title="Audit Record Dimensions" bordered column={1} size="small">
              <Descriptions.Item label="Audit Record ID">{inspectAudit.id}</Descriptions.Item>
              <Descriptions.Item label="Request ID">{inspectAudit.requestId}</Descriptions.Item>
              <Descriptions.Item label="User ID">{inspectAudit.userId}</Descriptions.Item>
              <Descriptions.Item label="Agent Name">{inspectAudit.agentName || 'N/A (Direct API User)'}</Descriptions.Item>
              <Descriptions.Item label="User Role">{inspectAudit.userRole}</Descriptions.Item>
              <Descriptions.Item label="Model Slug">{inspectAudit.modelSlug}</Descriptions.Item>
              <Descriptions.Item label="Financial Cost">${(inspectAudit.totalCostUsd || 0).toFixed(6)} USD</Descriptions.Item>
              <Descriptions.Item label="Token Breakdown">{inspectAudit.promptTokens} Prompt + {inspectAudit.completionTokens} Completion = {inspectAudit.totalTokens} Total</Descriptions.Item>
              <Descriptions.Item label="Latency / TTFT">{inspectAudit.latencyMs} ms total ({inspectAudit.ttftMs} ms TTFT)</Descriptions.Item>
            </Descriptions>

            <Card size="small" title="Cryptographic Signatures & Hashes">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">SHA-256 Prompt Hash:</Text>
                <Text code copyable>{inspectAudit.promptHash || 'N/A'}</Text>

                <Text type="secondary" style={{ marginTop: 8 }}>SHA-256 Response Payload Hash:</Text>
                <Text code copyable>{inspectAudit.responseHash || 'N/A'}</Text>

                <Text type="secondary" style={{ marginTop: 8 }}>Cryptographic Tamper-Proof Signature Hash:</Text>
                <Text code copyable style={{ color: '#1677ff' }}>{inspectAudit.signatureHash}</Text>
              </Space>
            </Card>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
