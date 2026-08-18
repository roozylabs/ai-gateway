import '@ant-design/v5-patch-for-react-19';
import React from 'react';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import AppLayout from '@/components/AppLayout';
import { App as AntdApp } from 'antd';

export const metadata = {
  title: 'AI Gateway Dashboard',
  description: 'Centralized AI API Gateway & Credential Pool Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <ThemeProvider>
          <AntdApp>
            <AppLayout>{children}</AppLayout>
          </AntdApp>
        </ThemeProvider>
      </body>
    </html>
  );
}
