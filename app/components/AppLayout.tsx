'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import {
  Layout,
  Menu,
  Typography,
  Avatar,
  Dropdown,
  Space,
  Badge,
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
} from '@ant-design/icons';

const { Header, Sider, Content, Footer } = Layout;
const { Text, Title } = Typography;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();
  const { mode, toggleTheme } = useTheme();

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
      onClick: () => router.push('/login'),
    },
  ];

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
          }}
        >
          <ThunderboltFilled style={{ fontSize: 24, color: '#1677ff', marginRight: collapsed ? 0 : 12 }} />
          {!collapsed && (
            <Title level={4} style={{ color: mode === 'dark' ? '#fff' : '#0f172a', margin: 0, letterSpacing: '0.5px' }}>
              AI Gateway
            </Title>
          )}
        </div>

        <Menu
          theme={mode}
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ padding: '12px 0', borderRight: 0, background: 'transparent' }}
        />
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
            <Badge status="processing" color="green" text={<Text type="secondary">System Status: Operational</Text>} />
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

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                <Text strong>Admin User</Text>
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
