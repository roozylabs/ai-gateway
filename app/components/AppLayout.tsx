'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useSSE } from '@/hooks/useSSE';
import { apiGetActiveStreams } from '@/lib/api';
import {
  Layout,
  Menu,
  Typography,
  Avatar,
  Dropdown,
  Space,
  Badge,
  Tag,
  Button,
  theme,
  Tooltip,
} from 'antd';
import {
  DashboardOutlined,
  ApiOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  ThunderboltFilled,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SunOutlined,
  MoonOutlined,
  CodeOutlined,
  SyncOutlined,
} from '@ant-design/icons';

function SidebarActivityWidget({ collapsed, mode }: { collapsed: boolean; mode: 'light' | 'dark' }) {
  const { data } = useQuery({
    queryKey: ['active-streams'],
    queryFn: apiGetActiveStreams,
  });

  const total = data?.totalActive || 0;
  const activeModels = data?.byModel
    ? Object.entries(data.byModel)
        .map(([slug, count]) => (count > 1 ? `${slug} (${count})` : slug))
        .join(', ')
    : '';

  const activeCreds = data?.byCredential
    ? Object.entries(data.byCredential)
        .map(([cred, count]) => (count > 1 ? `${cred} (${count})` : cred))
        .join(', ')
    : '';

  if (collapsed) {
    return (
      <div
        style={{
          padding: '16px 0',
          display: 'flex',
          justifyContent: 'center',
          borderTop: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f0f0f0'}`,
        }}
      >
        <Tooltip
          title={
            total > 0
              ? `Active: ${total} stream(s) | Model: ${activeModels || '-'} | Credential: ${activeCreds || '-'}`
              : 'Gateway Status: Idle (0 active)'
          }
          placement="right"
        >
          {total > 0 ? (
            <Badge count={total} size="small">
              <SyncOutlined spin style={{ color: '#1677ff', fontSize: 16 }} />
            </Badge>
          ) : (
            <Badge status="default" />
          )}
        </Tooltip>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '12px 14px',
        margin: '8px 12px 14px 12px',
        background: mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
        border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
        borderRadius: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: total > 0 ? 8 : 0,
        }}
      >
        <Text
          type="secondary"
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
          }}
        >
          Activity
        </Text>
        {total > 0 ? (
          <Tag color="processing" style={{ margin: 0, fontSize: 11, fontWeight: 600, borderRadius: 10 }}>
            <SyncOutlined spin style={{ marginRight: 4 }} />
            {total} Active
          </Tag>
        ) : (
          <Tag color="default" style={{ margin: 0, fontSize: 11, borderRadius: 10 }}>
            Idle
          </Tag>
        )}
      </div>

      {total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {activeModels && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Model</Text>
              <Text
                strong
                style={{
                  fontSize: 11,
                  color: '#1677ff',
                }}
              >
                {activeModels}
              </Text>
            </div>
          )}

          {data?.byCredential && Object.keys(data.byCredential).length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                Credentials
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(data.byCredential).map(([cred, count]) => (
                  <div
                    key={cred}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9',
                      padding: '3px 6px',
                      borderRadius: 4,
                      fontSize: 11,
                    }}
                  >
                    <Text code style={{ fontSize: 10, border: 'none', background: 'transparent', padding: 0 }}>
                      {cred}
                    </Text>
                    {count > 1 && (
                      <Tag color="processing" style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '16px', height: 16 }}>
                        ×{count}
                      </Tag>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const { Header, Sider, Content, Footer } = Layout;
const { Text, Title } = Typography;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { isConnected, lastEvent } = useSSE();
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();

  // If on login page, don't show sidebar layout
  if (pathname === '/login') {
    return <>{children}</>;
  }

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/sandbox',
      icon: <CodeOutlined />,
      label: 'AI Sandbox',
    },
    {
      key: '/providers',
      icon: <ApiOutlined />,
      label: 'AI Providers',
    },
    {
      key: '/credentials',
      icon: <SafetyCertificateOutlined />,
      label: 'Credentials Pool',
    },
    {
      key: '/gateway-keys',
      icon: <KeyOutlined />,
      label: 'Gateway API Keys',
    },
    {
      key: '/models',
      icon: <AppstoreOutlined />,
      label: 'Models & Routing',
    },
    {
      key: '/logs',
      icon: <FileTextOutlined />,
      label: 'Request Logs',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Admin Profile',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: 'Logout',
      onClick: () => logout(),
    },
  ];

  // System Status Status & Color logic strictly driven by real-time SSE stream
  let systemStatusText = 'System Status: Operational';
  let badgeStatus: 'processing' | 'warning' | 'error' = 'processing';
  let badgeColor = 'green';

  if (!isConnected) {
    systemStatusText = 'System Status: Connecting...';
    badgeStatus = 'warning';
    badgeColor = 'gold';
  } else if (lastEvent?.payload?.status && lastEvent.payload.status !== 'ok') {
    systemStatusText = 'System Status: Degraded';
    badgeStatus = 'warning';
    badgeColor = 'gold';
  }

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme={mode}
        width={250}
        style={{
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 10,
          boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
          background: mode === 'dark' ? '#141414' : '#ffffff',
          borderRight: mode === 'light' ? `1px solid ${token.colorBorderSecondary}` : 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: '0 20px',
            background: mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#ffffff',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            flexShrink: 0,
          }}
        >
          <ThunderboltFilled style={{ fontSize: 24, color: '#1677ff', marginRight: collapsed ? 0 : 12 }} />
          {!collapsed && (
            <Title level={4} style={{ color: mode === 'dark' ? '#fff' : '#0f172a', margin: 0, letterSpacing: '0.5px' }}>
              AI Gateway
            </Title>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Menu
            theme={mode}
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={({ key }) => router.push(key)}
            style={{ padding: '12px 0', borderRight: 0, background: 'transparent' }}
          />
        </div>

        <div style={{ flexShrink: 0 }}>
          <SidebarActivityWidget collapsed={collapsed} mode={mode} />
        </div>
      </Sider>

      <Layout style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: token.colorBgLayout }}>
        <Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
            flexShrink: 0,
            height: 64,
            position: 'sticky',
            top: 0,
            zIndex: 9,
          }}
        >
          <Space size="middle">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 40, height: 40 }}
            />
            <Badge status={badgeStatus} color={badgeColor} text={<Text type="secondary">{systemStatusText}</Text>} />
          </Space>

          <Space size="large">
            <Text type="secondary" style={{ fontSize: 13 }}>
              v1.0.0
            </Text>

            <Tooltip title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}>
              <Button
                type="text"
                shape="circle"
                icon={mode === 'dark' ? <SunOutlined style={{ color: '#faad14' }} /> : <MoonOutlined style={{ color: '#1677ff' }} />}
                onClick={toggleTheme}
                style={{ fontSize: 18 }}
              />
            </Tooltip>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomLeft" trigger={['click']}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                <Text strong>{user?.name || user?.email || 'Admin User'}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 24px 0',
          }}
        >
          <div
            style={{
              padding: 24,
              minHeight: 'calc(100vh - 160px)',
              background: token.colorBgContainer,
              borderRadius: token.borderRadiusLG,
              marginBottom: 24,
            }}
          >
            {children}
          </div>

          <Footer style={{ textAlign: 'center', color: token.colorTextDescription, padding: '0 0 24px', background: 'transparent' }}>
            AI Gateway ©{new Date().getFullYear()} RoozyLabs. Centralized Model API key Management System.
          </Footer>
        </Content>

      </Layout>
    </Layout>
  );
}
