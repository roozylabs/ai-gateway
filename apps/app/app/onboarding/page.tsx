'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Steps, Button, Form, Input, Radio, Typography, Space, Tag, message, Result } from 'antd';
import {
  RocketOutlined,
  UserOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { apiCompleteOnboarding } from '@/lib/api';

const { Title, Paragraph, Text } = Typography;

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [form] = Form.useForm();

  const handleFinishStep1 = async () => {
    try {
      await form.validateFields(['workspaceName']);
      setCurrentStep(1);
    } catch (e) {
      // Form validation error
    }
  };

  const handleFinishStep2 = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const res = await apiCompleteOnboarding({
        workspaceName: values.workspaceName,
        primaryRole: values.primaryRole || 'developer',
      });
      setGeneratedKey(res.apiKey || 'gw_sk_live_demo123456789');
      setCurrentStep(2);
      message.success('Workspace initialized successfully!');
    } catch (err: any) {
      message.error(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#08090A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 680,
          background: '#0F1115',
          borderColor: '#1f242d',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            Welcome to RoozyLabs Prism
          </Title>
          <Paragraph type="secondary">
            Set up your AI Engineering workspace and default governance rules in 60 seconds.
          </Paragraph>
        </div>

        <Steps
          current={currentStep}
          items={[
            { title: 'Workspace', icon: <RocketOutlined /> },
            { title: 'Your Role', icon: <UserOutlined /> },
            { title: 'API Key', icon: <KeyOutlined /> },
          ]}
          style={{ marginBottom: 32 }}
        />

        <Form form={form} layout="vertical" initialValues={{ primaryRole: 'developer' }}>
          {currentStep === 0 && (
            <div>
              <Form.Item
                name="workspaceName"
                label={<Text strong style={{ color: '#fff' }}>Organization / Workspace Name</Text>}
                rules={[{ required: true, message: 'Please enter your workspace name' }]}
              >
                <Input size="large" placeholder="e.g. Acme AI Lab, Core ML Team" />
              </Form.Item>

              <Button type="primary" size="large" block onClick={handleFinishStep1} icon={<ArrowRightOutlined />}>
                Continue to Role Selection
              </Button>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <Form.Item name="primaryRole" label={<Text strong style={{ color: '#fff' }}>Select Your Primary Role</Text>}>
                <Radio.Group style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Card size="small" style={{ background: '#14171f', borderColor: '#262b36' }}>
                      <Radio value="developer">
                        <Text strong style={{ color: '#fff' }}>Developer / AI Engineer</Text>
                        <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                          Create API Keys, run Playground simulations, test prompts, view logs & traces.
                        </Paragraph>
                      </Radio>
                    </Card>

                    <Card size="small" style={{ background: '#14171f', borderColor: '#262b36' }}>
                      <Radio value="agent_manager">
                        <Text strong style={{ color: '#fff' }}>Agent Administrator</Text>
                        <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                          Manage AI Agent identities (`X-Prism-Agent-ID`), model & tool boundaries, budget caps.
                        </Paragraph>
                      </Radio>
                    </Card>

                    <Card size="small" style={{ background: '#14171f', borderColor: '#262b36' }}>
                      <Radio value="finops_manager">
                        <Text strong style={{ color: '#fff' }}>FinOps / Budget Manager</Text>
                        <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                          Track spend limits, set velocity alert thresholds, analyze model cost efficiency.
                        </Paragraph>
                      </Radio>
                    </Card>
                  </Space>
                </Radio.Group>
              </Form.Item>

              <Button type="primary" size="large" block loading={loading} onClick={handleFinishStep2} icon={<ArrowRightOutlined />}>
                Complete Setup & Generate Key
              </Button>
            </div>
          )}

          {currentStep === 2 && (
            <Result
              status="success"
              title={<span style={{ color: '#fff' }}>Workspace Ready!</span>}
              subTitle={<span style={{ color: '#a0a0a0' }}>Here is your initial Gateway API Key. Save it securely.</span>}
              extra={[
                <div key="key" style={{ background: '#14171f', padding: 16, borderRadius: 8, marginBottom: 20, textAlign: 'left' }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    GATEWAY API KEY
                  </Text>
                  <Text code style={{ fontSize: 14, color: '#52c41a' }}>
                    {generatedKey}
                  </Text>
                </div>,
                <Button key="dashboard" type="primary" size="large" block onClick={handleGoToDashboard}>
                  Go to Prism Dashboard
                </Button>,
              ]}
            />
          )}
        </Form>
      </Card>
    </div>
  );
}
