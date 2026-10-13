export interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  card: string;
  surfaceElevated: string;
  accent: string;
  accentSecondary: string;
  accentGlow: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderFocus: string;
  success: string;
  warning: string;
  error: string;
  mapRoad: string;
  mapBg: string;
  mapRoute: string;
  tabBarBg: string;
  tabBarBorder: string;
}

export const DarkThemeColors: ThemeColors = {
  background: '#080B14',
  backgroundSecondary: '#101522',
  card: '#191D2B',
  surfaceElevated: '#222839',
  accent: '#20E85A',
  accentSecondary: '#8AFFA5',
  accentGlow: 'rgba(32, 232, 90, 0.25)',
  textPrimary: '#FFFFFF',
  textSecondary: '#98A2B3',
  textMuted: '#687386',
  border: '#303747',
  borderFocus: 'rgba(32, 232, 90, 0.6)',
  success: '#20E85A',
  warning: '#F5B942',
  error: '#FF5B65',
  mapRoad: '#171E2D',
  mapBg: '#090D18',
  mapRoute: '#20E85A',
  tabBarBg: 'rgba(16, 21, 34, 0.95)',
  tabBarBorder: '#232A3B',
};

export const LightThemeColors: ThemeColors = {
  background: '#F4F6F9',
  backgroundSecondary: '#FFFFFF',
  card: '#FFFFFF',
  surfaceElevated: '#EAEFF5',
  accent: '#10C84B',
  accentSecondary: '#34D399',
  accentGlow: 'rgba(16, 200, 75, 0.2)',
  textPrimary: '#0A0F1D',
  textSecondary: '#4A5568',
  textMuted: '#8492A6',
  border: '#E2E8F0',
  borderFocus: 'rgba(16, 200, 75, 0.6)',
  success: '#10C84B',
  warning: '#D97706',
  error: '#EF4444',
  mapRoad: '#CBD5E1',
  mapBg: '#E2E8F0',
  mapRoute: '#10C84B',
  tabBarBg: 'rgba(255, 255, 255, 0.96)',
  tabBarBorder: '#E2E8F0',
};

export const Typography = {
  fontFamily: {
    sans: 'System',
    mono: 'Courier',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 28,
    display: 34,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
  full: 9999,
};

export const Shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  glowGreen: {
    shadowColor: '#20E85A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 5,
  },
  button: {
    shadowColor: '#20E85A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
};
