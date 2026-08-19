'use client';

import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Typography,
  Space,
  Tag,
  App,
} from 'antd';
import {
  SendOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  ClearOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import { PageHeader } from '@/components/atoms';
import {
  apiGetGatewayKeys,
  apiGetProviders,
  apiGetCredentials,
  apiGetModels,
  ApiGatewayKey,
  ApiProvider,
  ApiCredential,
  ApiModel,
} from '@/lib/api';

const { Text } = Typography;
const { TextArea } = Input;

export default function SandboxPage() {
  const { message } = App.useApp();
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const [selectedKeyPrefix, setSelectedKeyPrefix] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('You are a helpful AI coding assistant.');
  const [userPrompt, setUserPrompt] = useState<string>('Explain Server-Sent Events (SSE) streaming in 2 paragraphs.');
  const [isStreaming, setIsStreaming] = useState<boolean>(true);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [streamedText, setStreamedText] = useState<string>('');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [ttftMs, setTtftMs] = useState<number | null>(null);

  // Fetch available Gateway Keys
  const { data: gatewayKeys = [], isLoading: keysLoading } = useQuery({
    queryKey: ['gateway-keys'],
    queryFn: apiGetGatewayKeys,
  });

  // Fetch Providers list
  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });

  // Fetch Credentials for all providers to filter valid Gateway Keys
  const { data: credentialsMap = {}, isLoading: credsLoading } = useQuery({
    queryKey: ['sandbox-creds', providers.map((p) => p.id).join(',')],
    queryFn: async () => {
      if (!providers || providers.length === 0) return {};
      const map: Record<string, ApiCredential[]> = {};
      await Promise.all(
        providers.map(async (p) => {
          try {
            const list = await apiGetCredentials(p.id);
            map[p.id] = list;
          } catch {
            map[p.id] = [];
          }
        })
      );
      return map;
    },
    enabled: providers.length > 0,
    staleTime: 30000,
  });

  // Filter Gateway Auth Keys to ONLY include keys whose Provider has active credentials
  const validGatewayKeys = React.useMemo(() => {
    if (!gatewayKeys) return [];
    return gatewayKeys.filter((k: ApiGatewayKey) => {
      if (!k.enabled) return false;
      if (!k.providerId) return true; // If unbounded, keep
      const providerCreds = credentialsMap[k.providerId] || [];
      return providerCreds.some((c) => c.enabled && c.status !== 'disabled');
    });
  }, [gatewayKeys, credentialsMap]);

  // Active key calculation
  const activeKeyObj = React.useMemo(() => {
    if (selectedKeyPrefix) {
      return validGatewayKeys.find((k) => k.keyPrefix === selectedKeyPrefix) || validGatewayKeys[0];
    }
    return validGatewayKeys[0];
  }, [selectedKeyPrefix, validGatewayKeys]);

  const activeKeyPrefix = activeKeyObj?.keyPrefix || '';
  const activeProviderId = activeKeyObj?.providerId || '';
  const activeProvider = providers.find((p) => p.id === activeProviderId);

  // Fetch Models for active Key's Provider
  const { data: availableModels = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['sandbox-models', activeProviderId],
    queryFn: () => (activeProviderId ? apiGetModels(activeProviderId) : Promise.resolve([])),
    enabled: !!activeProviderId,
  });

  // Auto-select first model when availableModels change
  useEffect(() => {
    if (availableModels.length > 0) {
      const exists = availableModels.some((m) => m.slug === selectedModel || m.name === selectedModel);
      if (!exists) {
        setSelectedModel(availableModels[0].slug || availableModels[0].name);
      }
    }
  }, [availableModels, selectedModel]);

  const handleSendRequest = async () => {
    if (!userPrompt.trim()) {
      message.error('Please enter a user prompt');
      return;
    }

    if (!selectedModel) {
      message.error('Please select a target model');
      return;
    }

    setIsGenerating(true);
    setStreamedText('');
    setLatencyMs(null);
    setTtftMs(null);

    const startTime = performance.now();
    let firstTokenTime: number | null = null;

    try {
      // Send request to Gateway proxy endpoint /api/v1/chat/completions
      const response = await fetch('/api/sandbox/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sandbox-Key-Prefix': activeKeyPrefix || '',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: isStreaming,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`);
      }

      if (isStreaming && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let accumulated = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;

          if (value) {
            if (!firstTokenTime) {
              firstTokenTime = performance.now();
              setTtftMs(Math.round(firstTokenTime - startTime));
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.replace(/^data:\s*/, '');
                if (dataStr === '[DONE]') break;
                try {
                  const json = JSON.parse(dataStr);
                  const content = json.choices?.[0]?.delta?.content || json.choices?.[0]?.text || '';
                  accumulated += content;
                  setStreamedText(accumulated);
                } catch {
                  // Skip invalid SSE JSON lines
                }
              }
            }
          }
        }
      } else {
        const json = await response.json();
        const text = json.choices?.[0]?.message?.content || JSON.stringify(json, null, 2);
        setStreamedText(text);
      }

      const endTime = performance.now();
      setLatencyMs(Math.round(endTime - startTime));
    } catch (err: any) {
      message.error(`Request Failed: ${err.message}`);
      setStreamedText(`[Error]: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyResponse = () => {
    if (!streamedText) return;
    navigator.clipboard.writeText(streamedText);
    message.success('Copied response to clipboard!');
  };

  const isDropdownLoading = keysLoading || credsLoading;

  return (
    <div>
      <PageHeader
        title="AI Gateway Streaming Sandbox"
        description="Interactive testing sandbox for LLM completions, real-time SSE streaming, model routing, and token latencies"
      />

      <Row gutter={[16, 16]}>
        {/* Left Column: Request Configuration */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <CodeOutlined style={{ color: '#1677ff' }} />
                <span>Sandbox Configuration</span>
              </Space>
            }
            size="small"
            variant="borderless"
            style={{ borderRadius: 8 }}
          >
            <Form layout="vertical" style={{ marginTop: 8 }}>
              <Form.Item label="Gateway Auth Key">
                <Select
                  placeholder={isDropdownLoading ? 'Loading Gateway Keys...' : 'Select Gateway Key'}
                  value={activeKeyPrefix}
                  onChange={(val) => setSelectedKeyPrefix(val)}
                  loading={isDropdownLoading}
                  options={
                    validGatewayKeys.length > 0
                      ? validGatewayKeys.map((k: ApiGatewayKey) => {
                          const providerName = k.providerId
                            ? providers.find((p) => p.id === k.providerId)?.name
                            : null;
                          return {
                            label: `${k.name} (${providerName ? `${providerName} • ` : ''}${k.keyPrefix || 'gw_sk_...'})`,
                            value: k.keyPrefix,
                          };
                        })
                      : [
                          {
                            label: 'No Gateway Keys with active credentials available',
                            value: '',
                          },
                        ]
                  }
                />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <span>Target Model Alias</span>
                    {activeProvider && <Tag color="blue">{activeProvider.name}</Tag>}
                  </Space>
                }
              >
                <Select
                  placeholder={modelsLoading ? 'Loading models...' : 'Select Model'}
                  value={selectedModel}
                  onChange={(val) => setSelectedModel(val)}
                  loading={modelsLoading}
                  options={
                    availableModels.length > 0
                      ? availableModels.map((m: ApiModel) => ({
                          label: `${m.displayName || m.name} (${m.slug})`,
                          value: m.slug || m.name,
                        }))
                      : [{ label: 'No models registered for this provider', value: '' }]
                  }
                />
              </Form.Item>

              <Form.Item label="System Prompt">
                <TextArea
                  rows={2}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="System role instructions..."
                />
              </Form.Item>

              <Form.Item label="User Prompt">
                <TextArea
                  rows={4}
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Enter your prompt here..."
                />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Space>
                  <Typography.Text strong style={{ fontSize: 13 }}>Enable Real-time SSE Streaming:</Typography.Text>
                  <Switch checked={isStreaming} onChange={(val) => setIsStreaming(val)} />
                </Space>

                <Button
                  icon={<ClearOutlined />}
                  type="text"
                  onClick={() => {
                    setUserPrompt('');
                    setStreamedText('');
                  }}
                >
                  Clear
                </Button>
              </div>

              <Button
                type="primary"
                icon={isGenerating ? <SyncOutlined spin /> : <SendOutlined />}
                loading={isGenerating || validGatewayKeys.length === 0}
                disabled={validGatewayKeys.length === 0}
                onClick={handleSendRequest}
                block
                size="large"
              >
                {isGenerating ? 'Streaming Response...' : 'Send Completion Request'}
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Right Column: Real-time Response Output */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <ThunderboltOutlined style={{ color: '#52c41a' }} />
                  <span>Real-time Completion Stream</span>
                </Space>

                {streamedText && (
                  <Button type="text" icon={<CopyOutlined />} onClick={handleCopyResponse} size="small">
                    Copy
                  </Button>
                )}
              </div>
            }
            size="small"
            variant="borderless"
            style={{ borderRadius: 8, height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 340,
                background: isDark ? '#141414' : '#f9f9f9',
                border: `1px solid ${isDark ? '#303030' : '#e8e8e8'}`,
                borderRadius: 6,
                padding: 16,
                fontFamily: 'monospace',
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowY: 'auto',
                color: isDark ? '#e6f4ff' : '#262626',
              }}
            >
              {streamedText || <Text type="secondary">Output response stream will appear here in real-time...</Text>}
            </div>

            {(latencyMs !== null || ttftMs !== null) && (
              <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {ttftMs !== null && (
                  <Tag color="purple">Time to First Token (TTFT): {ttftMs} ms</Tag>
                )}
                {latencyMs !== null && (
                  <Tag color="green">Total Completion Latency: {latencyMs} ms</Tag>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
