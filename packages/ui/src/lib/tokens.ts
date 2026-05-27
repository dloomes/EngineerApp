export const colors = {
  primary: '#1F5C9E',
  primaryLight: '#D6E4F3',
  success: '#2D7D3A',
  successLight: '#E8F5EA',
  warning: '#C45C00',
  warningLight: '#FFF3E0',
  error: '#B91C1C',
  errorLight: '#FEE2E2',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  surface: '#F9FAFB',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  fontFamily: 'Arial, sans-serif',
} as const;

export const touchTarget = {
  min: 44,
} as const;
