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

  useEffect(() => {
    const saved = localStorage.getItem('theme_mode') as ThemeMode;
    if (saved === 'light' || saved === 'dark') {
      setModeState(saved);
    }
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('theme_mode', newMode);
  };

  const toggleTheme = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
  };

  const currentAlgorithm = mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm;

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setMode }}>
      <AntdRegistry>
        <ConfigProvider
          theme={{
            algorithm: currentAlgorithm,
            token: {
              colorPrimary: '#1677ff',
              borderRadius: 8,
              colorBgContainer: mode === 'dark' ? '#141414' : '#ffffff',
              colorBgLayout: mode === 'dark' ? '#0b0f19' : '#f5f5f5',
            },
            components: {
              Menu: {
                darkItemBg: 'transparent',
                darkSubMenuItemBg: 'transparent',
                darkPopupBg: '#141414',
              },
              Layout: {
                siderBg: mode === 'dark' ? '#141414' : '#ffffff',
              },
            },
          }}
        >
          {children}
        </ConfigProvider>
      </AntdRegistry>
    </ThemeContext.Provider>
  );
}
