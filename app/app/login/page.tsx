'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { Card, Form, Input, Button, Checkbox, Typography, Space, Tag, Tooltip, App } from 'antd';
import { UserOutlined, LockOutlined, ThunderboltFilled, SafetyOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { mode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);

  const isDark = mode === 'dark';

  const onFinish = (values: any) => {
    setLoading(true);
    message.loading({ content: 'Authenticating credentials...', key: 'login' });

    setTimeout(() => {
      setLoading(false);
      message.success({ content: 'Welcome back, Admin!', key: 'login' });
      router.push('/');
    }, 800);
  };

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
          ? 'radial-gradient(ellipse at 50% 20%, rgba(22, 119, 255, 0.18) 0%, rgba(15, 23, 42, 0.95) 70%), #090d16'
          : 'radial-gradient(ellipse at 50% 20%, rgba(22, 119, 255, 0.10) 0%, rgba(241, 245, 249, 0.95) 70%), #f8fafc',
        position: 'relative',
        boxSizing: 'border-box',
        margin: 0,
        padding: 16,
        transition: 'background 0.3s ease',
      }}
    >
      {/* Top Right Theme Switcher */}
      <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 10 }}>
        <Tooltip title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}>
          <Button
            type="text"
            shape="circle"
            icon={isDark ? <SunOutlined style={{ color: '#faad14', fontSize: 20 }} /> : <MoonOutlined style={{ color: '#1677ff', fontSize: 20 }} />}
            onClick={toggleTheme}
            style={{ width: 44, height: 44 }}
          />
        </Tooltip>
      </div>

      {/* Background Decorative Ambient Glows */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(22, 119, 255, 0.12) 0%, rgba(0,0,0,0) 70%)'
            : 'radial-gradient(circle, rgba(22, 119, 255, 0.08) 0%, rgba(0,0,0,0) 70%)',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }}
      />

      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 20,
          background: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(22, 119, 255, 0.15)'
            : '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 0 20px rgba(22, 119, 255, 0.08)',
          padding: '8px 12px',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: '0 8px 20px rgba(22, 119, 255, 0.4)',
            }}
          >
            <ThunderboltFilled style={{ fontSize: 30, color: '#ffffff' }} />
          </div>

          <div>
            <Space align="center" size="small">
              <Title level={3} style={{ color: isDark ? '#f8fafc' : '#0f172a', margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>
                AI Gateway
              </Title>
              <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
                v1.0
              </Tag>
            </Space>
          </div>

          <div style={{ marginTop: 4 }}>
            <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 13 }}>
              Centralized API & Credential Management Pool
            </Text>
          </div>
        </div>

        <Form
          name="login_form"
          initialValues={{ remember: true, email: 'admin@roozylabs.com', password: 'password123' }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Please enter your email address' }]}
            style={{ marginBottom: 16 }}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#64748b' }} />}
              placeholder="Email Address"
              style={{
                borderRadius: 10,
                background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#ffffff',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#d9d9d9',
                color: isDark ? '#f8fafc' : '#0f172a',
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
            style={{ marginBottom: 16 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#64748b' }} />}
              placeholder="Password"
              style={{
                borderRadius: 10,
                background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#ffffff',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#d9d9d9',
                color: isDark ? '#f8fafc' : '#0f172a',
              }}
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 13 }}>Remember this device</Checkbox>
            </Form.Item>
          </div>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 46,
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 15,
                background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                boxShadow: '0 4px 14px rgba(22, 119, 255, 0.35)',
              }}
            >
              Sign In to Dashboard
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <div style={{ position: 'absolute', bottom: 16, textAlign: 'center' }}>
        <Space size={4} style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 12 }}>
          <SafetyOutlined />
          <span>Encrypted Session • AI Gateway ©{new Date().getFullYear()} RoozyLabs</span>
        </Space>
      </div>
    </div>
  );
}
