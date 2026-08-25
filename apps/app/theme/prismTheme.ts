import type { ThemeConfig } from 'antd';

export const prismTheme: ThemeConfig = {
  token: {
    colorPrimary: '#8B5CF6',
    colorInfo: '#06B6D4',
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    borderRadius: 8,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Button: {
      colorPrimary: '#8B5CF6',
      borderRadius: 8,
    },
    Card: {
      borderRadiusLG: 12,
    },
    Table: {
      borderRadius: 8,
    },
    Menu: {
      itemBorderRadius: 8,
    },
  },
};
