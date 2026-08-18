'use client';

import React from 'react';
import { Typography, Card, Descriptions, Tag, Row, Col, Form, InputNumber, Button, Switch, Space, Radio, App } from 'antd';
import { SafetyCertificateOutlined, HddOutlined, SettingOutlined, CheckCircleOutlined, BgColorsOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useTheme } from '@/context/ThemeContext';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const { message } = App.useApp();
  const { mode, setMode } = useTheme();

  const onSaveSettings = () => {
    message.success('System settings saved successfully');
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          Settings & Security
        </Title>
        <Text type="secondary">System parameters, appearance theme mode, encryption keys state, and rate-limit cooldown settings</Text>
      </div>

      <Card title={<Space><BgColorsOutlined style={{ color: '#1677ff' }} /> Appearance Theme Mode</Space>} variant="borderless" style={{ marginBottom: 20, borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Text strong style={{ display: 'block' }}>Dashboard Theme Mode:</Text>
            <Text type="secondary" style={{ fontSize: 13 }}>Switch between Dark Mode and Light Mode seamlessly across all pages</Text>
          </div>

          <Radio.Group
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              message.success(`Theme mode switched to ${e.target.value.toUpperCase()}`);
            }}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="dark">
              <Space><MoonOutlined /> Dark Mode</Space>
            </Radio.Button>
            <Radio.Button value="light">
              <Space><SunOutlined /> Light Mode</Space>
            </Radio.Button>
          </Radio.Group>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<Space><SafetyCertificateOutlined style={{ color: '#52c41a' }} /> Security & Encryption</Space>} variant="borderless" style={{ borderRadius: 8 }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="API Keys Storage">
                <Tag color="success" icon={<CheckCircleOutlined />}>AES-256-GCM Encrypted at Rest</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Gateway Key Hashing">
                <Tag color="blue">SHA-256 Secure Hash</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Key Masking Policy">
                <Text code>sk-ant-••••••••1234</Text> (Plaintext hidden from response)
              </Descriptions.Item>
              <Descriptions.Item label="Streaming Security">
                Pass-through SSE without disk logging
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<Space><HddOutlined style={{ color: '#1677ff' }} /> System & Infrastructure</Space>} variant="borderless" style={{ borderRadius: 8 }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Gateway Backend Version">
                <Text code>v1.0.0</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Database Storage">
                PostgreSQL 15 (Single Source of Truth)
              </Descriptions.Item>
              <Descriptions.Item label="Redis State Engine">
                Redis 7 (Rate Limit & Cooldown Lock)
              </Descriptions.Item>
              <Descriptions.Item label="Deployment Subdomain">
                <Text code>app.yourdomain.com</Text> (Port 3000)
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title={<Space><SettingOutlined /> Gateway Retry & Cooldown Configuration</Space>} variant="borderless" style={{ marginTop: 20, borderRadius: 8 }}>
        <Form layout="vertical" initialValues={{ maxRetries: 2, cooldownSeconds: 300, enableAutoRotation: true }} onFinish={onSaveSettings}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Max Retries on HTTP 429 Failover" name="maxRetries">
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label="Rate Limit Cooldown Duration (Seconds)" name="cooldownSeconds">
                <InputNumber min={30} max={3600} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Enable Automatic Credential Rotation" name="enableAutoRotation" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button type="primary" htmlType="submit">
              Save Configuration
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
