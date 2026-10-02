import { ViewStyle, Platform } from 'react-native';

export const Colors = {
  // Primary — deep lustrous emerald (luxury, professional)
  primary: '#0B4F3A',
  primaryLight: '#2E7D5B',
  primaryDark: '#082E22',

  // Secondary — warm market orange
  secondary: '#FF8F00',
  secondaryLight: '#FFB74D',

  // Accent — Lake Victoria blue
  accent: '#0277BD',
  accentLight: '#4FC3F7',

  // Neutrals
  background: '#EBEBEB',
  surface: '#FFFFFF',
  surfaceElevated: '#F5F5F5',
  border: '#E0E0E0',
  borderLight: '#EEEEEE',

  // Text
  textPrimary: '#212121',
  textSecondary: '#757575',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',
  textMuted: '#9E9E9E',
  textInverse: '#FFFFFF',

  // Semantic
  success: '#18794E',
  warning: '#F9A825',
  error: '#C62828',
  info: '#1565C0',

  // Literacy level colors
  level1: '#4CAF50',
  level2: '#2196F3',
  level3: '#FF9800',
  level4: '#9C27B0',
  level5: '#F44336',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  hero: 36,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

/**
 * Smoky vapour-glass tile — translucent misted white with a hairline vapor rim
 * and a frosted backdrop blur (web). Spread into any tile/card surface.
 */
export const Vapor: ViewStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.55)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.72)',
  ...((Platform.OS === 'web'
    ? {
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
      }
    : {}) as ViewStyle),
};
