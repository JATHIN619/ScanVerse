export const theme = {
  colors: {
    light: {
      primary: '#1E8E5A',
      primaryDark: '#146B44',
      secondary: '#2563EB',
      background: '#FAFAFA',
      surface: '#FFFFFF',
      textPrimary: '#111827',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      error: '#DC2626',
      warning: '#D97706',
      success: '#16A34A',
    },
    dark: {
      primary: '#2FAE73',
      primaryDark: '#1E8E5A',
      secondary: '#5B8DEF',
      background: '#0F1512',
      surface: '#1A2420',
      textPrimary: '#F3F4F1',
      textSecondary: '#9CA39C',
      border: '#2A342F',
      error: '#F87171',
      warning: '#FBBF24',
      success: '#4ADE80',
    },
  },
  spacing: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32
  }
};

export type ThemeMode = 'light' | 'dark';