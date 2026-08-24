'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { prismTheme } from '@/theme/prismTheme';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  toggleTheme: () => {},
  setMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme_mode') as ThemeMode;
    if (saved === 'light' || saved === 'dark') {
      setModeState(saved);
    }
    setMounted(true);
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('theme_mode', newMode);
  };

  const toggleTheme = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
  };

  const activeMode = mounted ? mode : 'dark';
  const currentAlgorithm = activeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm;

  return (
    <ThemeContext.Provider value={{ mode: activeMode, toggleTheme, setMode }}>
      <AntdRegistry>
        <ConfigProvider
          theme={{
            ...prismTheme,
            algorithm: currentAlgorithm,
            token: {
              ...prismTheme.token,
              colorBgBase: activeMode === 'dark' ? '#08090A' : '#ffffff',
              colorBgContainer: activeMode === 'dark' ? '#0F1115' : '#ffffff',
              colorBgLayout: activeMode === 'dark' ? '#08090A' : '#f8fafc',
            },
            components: {
              ...prismTheme.components,
              Menu: {
                ...prismTheme.components?.Menu,
                darkItemBg: 'transparent',
                darkSubMenuItemBg: 'transparent',
                darkPopupBg: '#0F1115',
              },
              Layout: {
                siderBg: activeMode === 'dark' ? '#0F1115' : '#ffffff',
                headerBg: activeMode === 'dark' ? '#08090A' : '#ffffff',
                bodyBg: activeMode === 'dark' ? '#08090A' : '#f8fafc',
              },
            },
          }}
        >
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transition: 'opacity 0.2s ease-in-out',
              minHeight: '100vh',
              backgroundColor: activeMode === 'dark' ? '#08090A' : '#f8fafc',
            }}
          >
            {children}
          </div>
        </ConfigProvider>
      </AntdRegistry>
    </ThemeContext.Provider>
  );
}
