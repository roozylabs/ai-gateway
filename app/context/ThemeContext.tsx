'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';

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

  // Keep SSR and initial client hydration pass identical ('dark') to avoid React Hydration Error.
  // After hydration completes (mounted = true), sync to active stored mode with smooth fade-in.
  const activeMode = mounted ? mode : 'dark';
  const currentAlgorithm = activeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm;

  return (
    <ThemeContext.Provider value={{ mode: activeMode, toggleTheme, setMode }}>
      <AntdRegistry>
        <ConfigProvider
          theme={{
            algorithm: currentAlgorithm,
            token: {
              colorPrimary: '#1677ff',
              borderRadius: 8,
              colorBgContainer: activeMode === 'dark' ? '#141414' : '#ffffff',
              colorBgLayout: activeMode === 'dark' ? '#0b0f19' : '#f5f5f5',
            },
            components: {
              Menu: {
                darkItemBg: 'transparent',
                darkSubMenuItemBg: 'transparent',
                darkPopupBg: '#141414',
              },
              Layout: {
                siderBg: activeMode === 'dark' ? '#141414' : '#ffffff',
              },
            },
          }}
        >
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transition: 'opacity 0.2s ease-in-out',
              minHeight: '100vh',
            }}
          >
            {children}
          </div>
        </ConfigProvider>
      </AntdRegistry>
    </ThemeContext.Provider>
  );
}
