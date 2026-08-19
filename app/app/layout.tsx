import '@ant-design/v5-patch-for-react-19';
import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { QueryProvider } from '@/context/QueryProvider';
import { AuthProvider } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { App as AntdApp } from 'antd';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'AI Gateway Dashboard',
  description: 'Centralized AI API Gateway & Credential Pool Management',
};

import { SSEProvider } from '@/context/SSEContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning style={{ margin: 0, padding: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <AntdRegistry>
          <QueryProvider>
            <SSEProvider>
              <AuthProvider>
                <ThemeProvider>
                  <AntdApp>
                    <AppLayout>{children}</AppLayout>
                  </AntdApp>
                </ThemeProvider>
              </AuthProvider>
            </SSEProvider>
          </QueryProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
