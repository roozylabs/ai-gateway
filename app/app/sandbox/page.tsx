'use client';

import React, { useState } from 'react';
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
import { apiGetGatewayKeys, apiGetProviders, ApiGatewayKey } from '@/lib/api';

const { Text } = Typography;
const { TextArea } = Input;

export default function SandboxPage() {
  const { message } = App.useApp();
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const [selectedKey, setSelectedKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
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

  // Auto-select first active key if available
  const activeKey = selectedKey || gatewayKeys.find((k: ApiGatewayKey) => k.enabled)?.keyPrefix || '';

  const handleSendRequest = async () => {
    if (!userPrompt.trim()) {
      message.error('Please enter a user prompt');
      return;
    }

    setIsGenerating(true);
    setStreamedText('');
    setLatencyMs(null);
    setTtftMs(null);

    const startTime = performance.now();
    let firstTokenTime: number | null = null;

    try {
      // Send request to Gateway proxy endpoint /v1/chat/completions
      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: activeKey ? `Bearer ${activeKey}` : '',
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
                  placeholder="Select Gateway Key"
                  value={activeKey}
                  onChange={(val) => setSelectedKey(val)}
                  loading={keysLoading}
                  options={gatewayKeys.map((k: ApiGatewayKey) => ({
                    label: `${k.name} (${k.keyPrefix || 'gw_sk_...'})`,
                    value: k.keyPrefix,
                  }))}
                />
              </Form.Item>

              <Form.Item label="Target Model Alias">
                <Select
                  placeholder="Select Model"
                  value={selectedModel}
                  onChange={(val) => setSelectedModel(val)}
                  options={[
                    { label: 'gpt-4o (OpenAI Auto-Route)', value: 'gpt-4o' },
                    { label: 'gpt-4o-mini (Fast OpenAI)', value: 'gpt-4o-mini' },
                    { label: 'claude-3-7-sonnet (Anthropic)', value: 'claude-3-7-sonnet' },
                    { label: 'deepseek-r1 (DeepSeek)', value: 'deepseek-r1' },
                    { label: 'gemini-1.5-pro (Google AI)', value: 'gemini-1.5-pro' },
                  ]}
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
                loading={isGenerating}
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
                  <ThunderboltOutlined style={{ color: '#fa8c16' }} />
                  <span>Real-time Completion Stream</span>
                </Space>
                <Space>
                  {ttftMs !== null && <Tag color="blue">TTFT: {ttftMs} ms</Tag>}
                  {latencyMs !== null && <Tag color="green">Total Latency: {latencyMs} ms</Tag>}
                  <Button icon={<CopyOutlined />} type="text" size="small" onClick={handleCopyResponse} disabled={!streamedText}>
                    Copy
                  </Button>
                </Space>
              </div>
            }
            size="small"
            variant="borderless"
            style={{ borderRadius: 8, minHeight: 460 }}
          >
            <div
              style={{
                background: isDark ? '#141414' : '#fafafa',
                border: `1px solid ${isDark ? '#303030' : '#e8e8e8'}`,
                padding: 16,
                borderRadius: 8,
                minHeight: 380,
                maxHeight: 520,
                overflowY: 'auto',
                fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {streamedText ? (
                <span>
                  {streamedText}
                  {isGenerating && <span style={{ animation: 'blink 1s infinite', color: '#1677ff', fontWeight: 'bold' }}> ▌</span>}
                </span>
              ) : (
                <div style={{ color: '#8c8c8c', textAlign: 'center', paddingTop: 140 }}>
                  <CodeOutlined style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
                  Press "Send Completion Request" to stream response live via Gateway SSE
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
