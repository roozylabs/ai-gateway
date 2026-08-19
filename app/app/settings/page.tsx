'use client';

import React, { useEffect } from 'react';
import { Typography, Card, Descriptions, Tag, Row, Col, Form, InputNumber, Button, Switch, Space, App, Spin } from 'antd';
import { SafetyCertificateOutlined, HddOutlined, SettingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetSettings, apiUpdateSettings, ApiSetting } from '@/lib/api';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // Fetch Settings from API
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: apiGetSettings,
  });

  useEffect(() => {
    if (data?.value) {
      const settingsMap: Record<string, any> = {};
      data.value.forEach((item: ApiSetting) => {
        if (item.key === 'max_retries') settingsMap.maxRetries = Number(item.value);
        if (item.key === 'cooldown_seconds') settingsMap.cooldownSeconds = Number(item.value);
        if (item.key === 'auto_rotation') settingsMap.enableAutoRotation = item.value === 'true';
      });
      form.setFieldsValue(settingsMap);
    }
  }, [data, form]);

  const updateMutation = useMutation({
    mutationFn: (settings: Record<string, string>) => apiUpdateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      message.success('System settings saved successfully');
    },
    onError: (err: Error) => message.error(err.message),
  });

  const onSaveSettings = (values: any) => {
    updateMutation.mutate({
      max_retries: String(values.maxRetries || 2),
      cooldown_seconds: String(values.cooldownSeconds || 300),
      auto_rotation: String(!!values.enableAutoRotation),
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          Settings & Security
        </Title>
        <Text type="secondary">System parameters, encryption keys state, and rate-limit cooldown settings</Text>
      </div>

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
        <Spin spinning={isLoading}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{ maxRetries: 2, cooldownSeconds: 300, enableAutoRotation: true }}
            onFinish={onSaveSettings}
          >
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
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                Save Configuration
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </div>
  );
}
