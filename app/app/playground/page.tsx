'use client';

import React, { useState } from 'react';
import {
  Row,
  Col,
  Card,
  Input,
  Select,
  Slider,
  Button,
  Typography,
  Space,
  Tag,
  Table,
  Segmented,
  Progress,
  Descriptions,
  Badge,
  Spin,
  Alert,
  Tooltip,
} from 'antd';
import {
  ExperimentOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  BranchesOutlined,
  AreaChartOutlined,
  RocketOutlined,
  SlidersOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, StatusTag } from '@/components/atoms';
import {
  apiGetProviders,
  apiGetPolicies,
  apiSimulateRouting,
  ApiRoutingSimulationReq,
  ApiRoutingSimulationRes,
  ApiModelScoreDetail,
  ApiRoutingPolicy,
} from '@/lib/api';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

export default function RoutingPlaygroundPage() {
  const [activeTab, setActiveTab] = useState<'tuner' | 'compare'>('tuner');

  // Input states
  const [prompt, setPrompt] = useState<string>(
    'Create an efficient Golang HTTP server with SSE streaming, concurrency limiters, and clean error handling.'
  );
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [isCustomPolicy, setIsCustomPolicy] = useState<boolean>(false);
  const [budgetStatus, setBudgetStatus] = useState<string>('healthy');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');

  // Custom weight sliders (percentages summing to 100)
  const [taskWeight, setTaskWeight] = useState<number>(35);
  const [qualityWeight, setQualityWeight] = useState<number>(35);
  const [costWeight, setCostWeight] = useState<number>(15);
  const [speedWeight, setSpeedWeight] = useState<number>(15);

  // Fetch Providers & Policies
  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: apiGetPolicies,
  });

  // Calculate custom weights payload (converting % to 0.0 - 1.0)
  const customWeightsPayload = React.useMemo(() => {
    if (!isCustomPolicy) return undefined;
    const total = taskWeight + qualityWeight + costWeight + speedWeight || 100;
    return {
      task_match: Number((taskWeight / total).toFixed(2)),
      quality: Number((qualityWeight / total).toFixed(2)),
      cost: Number((costWeight / total).toFixed(2)),
      speed: Number((speedWeight / total).toFixed(2)),
    };
  }, [isCustomPolicy, taskWeight, qualityWeight, costWeight, speedWeight]);

  // Simulation Query for Primary Tuner
  const simulationPayload: ApiRoutingSimulationReq = {
    prompt,
    policyId: isCustomPolicy ? undefined : selectedPolicyId || undefined,
    customWeights: customWeightsPayload,
    budgetStatus,
    providerId: selectedProviderId || undefined,
  };

  const {
    data: simResult,
    isLoading: simLoading,
    refetch: refetchSim,
  } = useQuery({
    queryKey: ['routing-simulation', prompt, selectedPolicyId, isCustomPolicy, budgetStatus, selectedProviderId, customWeightsPayload],
    queryFn: () => apiSimulateRouting(simulationPayload),
    staleTime: 5000,
  });

  // Comparison Queries for Side-by-Side Mode (Balanced, Cheap, Quality)
  const { data: compareBalanced, isLoading: compareBalLoading } = useQuery({
    queryKey: ['compare-balanced', prompt, budgetStatus],
    queryFn: () => {
      const pol = policies.find((p) => p.name === 'balanced');
      return apiSimulateRouting({ prompt, policyId: pol?.id, budgetStatus });
    },
    enabled: activeTab === 'compare' && policies.length > 0,
  });

  const { data: compareCheap, isLoading: compareCheapLoading } = useQuery({
    queryKey: ['compare-cheap', prompt, budgetStatus],
    queryFn: () => {
      const pol = policies.find((p) => p.name === 'cheap');
      return apiSimulateRouting({ prompt, policyId: pol?.id, budgetStatus });
    },
    enabled: activeTab === 'compare' && policies.length > 0,
  });

  const { data: compareQuality, isLoading: compareQualLoading } = useQuery({
    queryKey: ['compare-quality', prompt, budgetStatus],
    queryFn: () => {
      const pol = policies.find((p) => p.name === 'quality');
      return apiSimulateRouting({ prompt, policyId: pol?.id, budgetStatus });
    },
    enabled: activeTab === 'compare' && policies.length > 0,
  });

  const safeStr = (v: any) => (v ? String(v) : '');

  const columnsCandidates = [
    {
      title: 'Rank',
      key: 'rank',
      render: (_: any, __: any, index: number) => (
        <Tag color={index === 0 ? 'gold' : 'default'} style={{ fontWeight: 'bold' }}>
          #{index + 1}
        </Tag>
      ),
    },
    {
      title: 'Candidate Model',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: ApiModelScoreDetail) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: record.slug === simResult?.selectedModel ? '#1677ff' : undefined }}>
            {name || record.slug}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.providerName || 'Provider'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Final Score',
      dataIndex: 'score',
      key: 'score',
      render: (score: number, record: ApiModelScoreDetail) => (
        <div style={{ width: 140 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Text strong style={{ color: score >= 0.8 ? '#52c41a' : score >= 0.5 ? '#faad14' : '#ff4d4f' }}>
              {(score * 100).toFixed(1)}%
            </Text>
          </div>
          <Progress
            percent={Number((score * 100).toFixed(0))}
            size="small"
            status={score >= 0.8 ? 'success' : score >= 0.5 ? 'normal' : 'exception'}
            showInfo={false}
          />
        </div>
      ),
    },
    {
      title: 'Price / 1M',
      key: 'price',
      render: (_: any, record: ApiModelScoreDetail) => (
        <Text style={{ fontSize: 11 }}>
          ${record.inputPrice1M.toFixed(2)} in / ${record.outputPrice1M.toFixed(2)} out
        </Text>
      ),
    },
    {
      title: 'Trace Notes / Penalties',
      dataIndex: 'reasons',
      key: 'reasons',
      render: (reasons: string[]) => (
        <Space wrap size={[2, 2]}>
          {reasons && reasons.length > 0
            ? reasons.map((r, i) => (
                <Tag key={i} color={r.includes('penalty') ? 'volcano' : 'blue'} style={{ fontSize: 10 }}>
                  {r}
                </Tag>
              ))
            : <Text type="secondary" style={{ fontSize: 11 }}>Optimal match</Text>}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Routing Simulation & Playground"
        description="Interactive playground to test prompts, simulate policy weights, compare routing strategies, and inspect decision traces in real-time"
      />

      {/* Mode Switcher */}
      <Card bodyStyle={{ padding: 16 }} style={{ marginBottom: 20, borderRadius: 8 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Segmented
              options={[
                { label: 'Simulation & Weight Tuner', value: 'tuner', icon: <SlidersOutlined /> },
                { label: 'Policy Comparison (Side-by-Side)', value: 'compare', icon: <SwapOutlined /> },
              ]}
              value={activeTab}
              onChange={(val) => setActiveTab(val as any)}
            />
          </Col>
          <Col>
            <Space wrap>
              <Tag color="cyan">
                <ThunderboltOutlined /> Zero-Cost Dry Run Simulation
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      {activeTab === 'tuner' ? (
        <Row gutter={[20, 20]}>
          {/* Left Column: Simulation Controls */}
          <Col xs={24} lg={10}>
            <Card
              title={
                <Space>
                  <ExperimentOutlined style={{ color: '#1677ff' }} />
                  <span>Simulation Input & Policy Tuning</span>
                </Space>
              }
              style={{ borderRadius: 8 }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Test Prompt Input
                  </Text>
                  <TextArea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Type or paste any test prompt to simulate Smart Router decision..."
                    maxLength={1000}
                    showCount
                  />
                </div>

                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Routing Policy Profile
                  </Text>
                  <Select
                    style={{ width: '100%' }}
                    value={isCustomPolicy ? 'custom' : selectedPolicyId || 'default'}
                    onChange={(val) => {
                      if (val === 'custom') {
                        setIsCustomPolicy(true);
                      } else {
                        setIsCustomPolicy(false);
                        setSelectedPolicyId(val === 'default' ? '' : val);
                      }
                    }}
                    options={[
                      { label: '⭐ Active Default Policy', value: 'default' },
                      ...policies.map((p: ApiRoutingPolicy) => ({
                        label: `${p.name} ${p.isDefault ? '(Default Active)' : ''}`,
                        value: p.id,
                      })),
                      { label: '🛠️ Custom Weight Tuner', value: 'custom' },
                    ]}
                  />
                </div>

                {/* Custom Weight Sliders */}
                {isCustomPolicy && (
                  <Card size="small" style={{ background: '#141414', borderRadius: 8 }}>
                    <Text strong style={{ display: 'block', marginBottom: 12 }}>
                      Custom Scoring Weights Tuning
                    </Text>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div>
                        <Row justify="space-between">
                          <Col><Text style={{ fontSize: 12 }}>Task Match Weight:</Text></Col>
                          <Col><Text strong style={{ fontSize: 12, color: '#722ed1' }}>{taskWeight}%</Text></Col>
                        </Row>
                        <Slider value={taskWeight} onChange={(v) => setTaskWeight(v)} min={0} max={100} />
                      </div>
                      <div>
                        <Row justify="space-between">
                          <Col><Text style={{ fontSize: 12 }}>Quality Weight:</Text></Col>
                          <Col><Text strong style={{ fontSize: 12, color: '#faad14' }}>{qualityWeight}%</Text></Col>
                        </Row>
                        <Slider value={qualityWeight} onChange={(v) => setQualityWeight(v)} min={0} max={100} />
                      </div>
                      <div>
                        <Row justify="space-between">
                          <Col><Text style={{ fontSize: 12 }}>Cost Efficiency Weight:</Text></Col>
                          <Col><Text strong style={{ fontSize: 12, color: '#52c41a' }}>{costWeight}%</Text></Col>
                        </Row>
                        <Slider value={costWeight} onChange={(v) => setCostWeight(v)} min={0} max={100} />
                      </div>
                      <div>
                        <Row justify="space-between">
                          <Col><Text style={{ fontSize: 12 }}>Speed / TTFT Weight:</Text></Col>
                          <Col><Text strong style={{ fontSize: 12, color: '#13c2c2' }}>{speedWeight}%</Text></Col>
                        </Row>
                        <Slider value={speedWeight} onChange={(v) => setSpeedWeight(v)} min={0} max={100} />
                      </div>
                    </Space>
                  </Card>
                )}

                <Row gutter={12}>
                  <Col span={12}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      Simulated Budget Status
                    </Text>
                    <Select
                      style={{ width: '100%' }}
                      value={budgetStatus}
                      onChange={(val) => setBudgetStatus(val)}
                      options={[
                        { label: '🟢 Healthy (<80%)', value: 'healthy' },
                        { label: '🟡 Warning (80-99%)', value: 'warning' },
                        { label: '🔴 Critical (100%+)', value: 'critical' },
                        { label: '⚠️ Exceeded (Hard Limit)', value: 'exceeded' },
                      ]}
                    />
                  </Col>
                  <Col span={12}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      Provider Filter
                    </Text>
                    <Select
                      style={{ width: '100%' }}
                      allowClear
                      placeholder="All Providers"
                      value={selectedProviderId || undefined}
                      onChange={(val) => setSelectedProviderId(val || '')}
                      options={[
                        { label: 'All Providers', value: '' },
                        ...providers.map((p) => ({ label: p.name, value: p.id })),
                      ]}
                    />
                  </Col>
                </Row>
              </Space>
            </Card>
          </Col>

          {/* Right Column: Simulation Output & Candidate Matrix */}
          <Col xs={24} lg={14}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Winning Model Callout */}
              <Card
                loading={simLoading}
                style={{
                  borderRadius: 8,
                  borderLeft: '4px solid #1677ff',
                  background: 'linear-gradient(135deg, rgba(22,119,255,0.08) 0%, rgba(20,20,20,1) 100%)',
                }}
              >
                <Row justify="space-between" align="middle" gutter={[16, 16]}>
                  <Col>
                    <Space direction="vertical" size={2}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        SELECTED WINNING MODEL
                      </Text>
                      <Title level={3} style={{ margin: 0, color: '#1677ff' }}>
                        {simResult?.selectedModel || 'No Eligible Model'}
                      </Title>
                      <Text style={{ fontSize: 13 }}>
                        Provider: <Tag color="blue">{simResult?.selectedProvider || 'Unknown'}</Tag>
                      </Text>
                    </Space>
                  </Col>
                  <Col>
                    <Space direction="vertical" align="end" size={2}>
                      <Tag color="purple">Task: {simResult?.taskType || 'general'}</Tag>
                      <Tag color="geekblue">Complexity: {simResult?.complexity || 'standard'}</Tag>
                      {simResult?.downgradeReason && (
                        <Tag color="volcano">{simResult.downgradeReason}</Tag>
                      )}
                    </Space>
                  </Col>
                </Row>
              </Card>

              {/* Candidate Models Ranking Table */}
              <Card
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span>Candidate Models Scoring & Decision Trace</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {simResult?.candidates?.length || 0} Evaluated Candidates
                    </Text>
                  </div>
                }
                loading={simLoading}
                style={{ borderRadius: 8 }}
              >
                <Table<ApiModelScoreDetail>
                  dataSource={simResult?.candidates || []}
                  columns={columnsCandidates}
                  rowKey="modelId"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  size="small"
                />
              </Card>
            </Space>
          </Col>
        </Row>
      ) : (
        /* Policy Comparison Mode (Side-by-Side) */
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card
              title={
                <Space>
                  <Tag color="geekblue">BALANCED POLICY</Tag>
                </Space>
              }
              loading={compareBalLoading}
              style={{ borderRadius: 8 }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Winning Model">
                    <Text strong style={{ color: '#1677ff' }}>
                      {compareBalanced?.selectedModel || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Provider">
                    <Tag color="blue">{compareBalanced?.selectedProvider || '-'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Task Match">{compareBalanced?.taskType || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Complexity">{compareBalanced?.complexity || '-'}</Descriptions.Item>
                </Descriptions>

                <Text strong style={{ fontSize: 12 }}>Candidate Model Scores:</Text>
                <Table
                  dataSource={compareBalanced?.candidates || []}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Model', dataIndex: 'slug', key: 'slug', render: (s: string) => <Text style={{ fontSize: 11 }}>{s}</Text> },
                    { title: 'Score', dataIndex: 'score', key: 'score', render: (s: number) => <Text strong style={{ fontSize: 11 }}>{(s * 100).toFixed(0)}%</Text> },
                  ]}
                />
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card
              title={
                <Space>
                  <Tag color="green">CHEAP POLICY</Tag>
                </Space>
              }
              loading={compareCheapLoading}
              style={{ borderRadius: 8 }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Winning Model">
                    <Text strong style={{ color: '#52c41a' }}>
                      {compareCheap?.selectedModel || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Provider">
                    <Tag color="green">{compareCheap?.selectedProvider || '-'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Task Match">{compareCheap?.taskType || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Complexity">{compareCheap?.complexity || '-'}</Descriptions.Item>
                </Descriptions>

                <Text strong style={{ fontSize: 12 }}>Candidate Model Scores:</Text>
                <Table
                  dataSource={compareCheap?.candidates || []}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Model', dataIndex: 'slug', key: 'slug', render: (s: string) => <Text style={{ fontSize: 11 }}>{s}</Text> },
                    { title: 'Score', dataIndex: 'score', key: 'score', render: (s: number) => <Text strong style={{ fontSize: 11 }}>{(s * 100).toFixed(0)}%</Text> },
                  ]}
                />
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card
              title={
                <Space>
                  <Tag color="gold">QUALITY POLICY</Tag>
                </Space>
              }
              loading={compareQualLoading}
              style={{ borderRadius: 8 }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Winning Model">
                    <Text strong style={{ color: '#faad14' }}>
                      {compareQuality?.selectedModel || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Provider">
                    <Tag color="gold">{compareQuality?.selectedProvider || '-'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Task Match">{compareQuality?.taskType || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Complexity">{compareQuality?.complexity || '-'}</Descriptions.Item>
                </Descriptions>

                <Text strong style={{ fontSize: 12 }}>Candidate Model Scores:</Text>
                <Table
                  dataSource={compareQuality?.candidates || []}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Model', dataIndex: 'slug', key: 'slug', render: (s: string) => <Text style={{ fontSize: 11 }}>{s}</Text> },
                    { title: 'Score', dataIndex: 'score', key: 'score', render: (s: number) => <Text strong style={{ fontSize: 11 }}>{(s * 100).toFixed(0)}%</Text> },
                  ]}
                />
              </Space>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}
