'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { Turnstile } from '@marsidev/react-turnstile';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { api, LoginRequest } from '@/lib/api';
import { Card, Input, Button, Checkbox, Typography, Space, Tag, Tooltip, App } from 'antd';
import { UserOutlined, LockOutlined, ThunderboltFilled, SafetyOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { mode, toggleTheme } = useTheme();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [siteKey, setSiteKey] = useState<string>(process.env.NEXT_PUBLIC_CLOUDFLARE_SITE_KEY || '');

  useEffect(() => {
    if (!siteKey) {
      api.get('/auth/turnstile-config')
        .then(res => {
          if (res.data?.siteKey) {
            setSiteKey(res.data.siteKey);
          }
        })
        .catch(() => {});
    }
  }, [siteKey]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const isDark = mode === 'dark';

  const onSubmit = async (data: LoginRequest) => {
    setLoading(true);
    message.loading({ content: 'Authenticating credentials...', key: 'login' });

    try {
      await login({ ...data, turnstileToken });
      message.success({ content: 'Welcome back!', key: 'login' });
      router.push('/');
    } catch (err: any) {
      message.error({ content: err.message || 'Invalid email or password', key: 'login' });
    } finally {
      setLoading(false);
    }
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
                Prism
              </Title>
              <Tag color="purple" style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
                v1.0
              </Tag>
            </Space>
          </div>

          <div style={{ marginTop: 4 }}>
            <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 13 }}>
              Universal AI Control Plane & Model Router
            </Text>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
          <div style={{ marginBottom: 16 }}>
            <Controller
              name="email"
              control={control}
              rules={{ required: 'Please enter your email address' }}
              render={({ field }) => (
                <Input
                  {...field}
                  size="large"
                  autoComplete="off"
                  disabled={!siteKey ? false : !turnstileToken || loading}
                  prefix={<UserOutlined style={{ color: '#64748b' }} />}
                  placeholder="Email Address"
                  status={errors.email ? 'error' : ''}
                  style={{
                    borderRadius: 10,
                    background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#ffffff',
                    borderColor: errors.email ? '#ff4d4f' : isDark ? 'rgba(255, 255, 255, 0.1)' : '#d9d9d9',
                    color: isDark ? '#f8fafc' : '#0f172a',
                  }}
                />
              )}
            />
            {errors.email && (
              <Text type="danger" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                {errors.email.message}
              </Text>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <Controller
              name="password"
              control={control}
              rules={{ required: 'Please enter your password' }}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  size="large"
                  autoComplete="new-password"
                  disabled={!siteKey ? false : !turnstileToken || loading}
                  prefix={<LockOutlined style={{ color: '#64748b' }} />}
                  placeholder="Password"
                  status={errors.password ? 'error' : ''}
                  style={{
                    borderRadius: 10,
                    background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#ffffff',
                    borderColor: errors.password ? '#ff4d4f' : isDark ? 'rgba(255, 255, 255, 0.1)' : '#d9d9d9',
                    color: isDark ? '#f8fafc' : '#0f172a',
                  }}
                />
              )}
            />
            {errors.password && (
              <Text type="danger" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                {errors.password.message}
              </Text>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Checkbox defaultChecked style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 13 }}>
              Remember this device
            </Checkbox>
          </div>

          {siteKey && (
            <div style={{ display: 'flex', justifyContent: 'start', marginBottom: 16 }}>
              <Turnstile
                siteKey={siteKey}
                options={{ theme: isDark ? 'dark' : 'light' }}
                onSuccess={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken('')}
                onError={() => setTurnstileToken('')}
              />
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              disabled={!siteKey ? false : !turnstileToken || loading}
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
          </div>
        </form>
      </Card>

      <div style={{ position: 'absolute', bottom: 16, textAlign: 'center' }}>
        <Space size={4} style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 12 }}>
          <SafetyOutlined />
          <span>Encrypted Session • RoozyLabs Prism ©{new Date().getFullYear()}</span>
        </Space>
      </div>
    </div>
  );
}
