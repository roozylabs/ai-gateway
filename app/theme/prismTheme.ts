import { ThemeConfig, theme } from 'antd';

export const prismTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    // 3.1 Core Palette
    colorBgBase: '#08090A',        // prism-black (App base canvas)
    colorBgContainer: '#0F1115',   // prism-surface (Cards, sidebars)
    colorBgElevated: '#151820',    // prism-surface-2 (Modals, table headers)
    colorBorder: '#242832',        // prism-border
    colorBorderSecondary: '#1C202B',
    colorText: '#F5F7FA',          // prism-white
    colorTextSecondary: '#8B93A1', // prism-muted

    // 3.2 Accent & 3.3 Semantics
    colorPrimary: '#8B5CF6',       // prism-violet signature accent
    colorSuccess: '#22C55E',       // prism-green (Healthy, 200 OK)
    colorWarning: '#F59E0B',       // prism-amber (Degraded, Retry)
    colorError: '#EF4444',         // prism-red (Failed, Outage)
    colorInfo: '#3B82F6',          // prism-blue (Active Routing)

    // 4. Typography
    fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
    fontFamilyCode: `'Geist Mono', 'JetBrains Mono', monospace`,

    // 7 & 8. Spacing & Border Radius
    borderRadius: 8,               // md (8px) - Default buttons & inputs
    borderRadiusLG: 12,            // lg (12px) - Cards, Modals
    borderRadiusSM: 4,             // xs/sm (4px) - Badges, Tooltips
  },
  components: {
    Card: {
      colorBgContainer: '#0F1115',
      colorBorderSecondary: '#242832',
      borderRadiusLG: 12,
    },
    Table: {
      colorBgContainer: '#0F1115',
      headerBg: '#151820',
      headerColor: '#8B93A1',
      headerSplitColor: '#242832',
      borderRadius: 8,
    },
    Button: {
      borderRadius: 8,
      colorPrimary: '#8B5CF6',
      colorPrimaryHover: '#7C3AED',
      colorPrimaryActive: '#6D28D9',
      colorBgContainer: '#0F1115',
      colorBorder: '#242832',
    },
    Input: {
      colorBgContainer: '#0F1115',
      colorBorder: '#242832',
      borderRadius: 8,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Menu: {
      colorBgContainer: '#0F1115',
      colorItemBgSelected: 'rgba(139, 92, 246, 0.15)',
      colorItemTextSelected: '#8B5CF6',
    },
  },
};
