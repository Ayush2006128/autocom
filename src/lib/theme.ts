export const Colors = {
  // Brand (from icon gradient)
  teal: '#4BBEB0',
  cyan: '#5BBDD6',
  mint: '#7DCDB5',

  // Backgrounds
  background: '#F0FAF8',
  surface: '#FFFFFF',
  surfacePressed: '#E6F5F2',

  // Text
  textPrimary: '#1A3C3A',
  textSecondary: '#5E8A87',
  textOnPrimary: '#FFFFFF',

  // Alert severity
  green: '#34C759',
  greenLight: '#D4F5DC',
  yellow: '#FFB800',
  yellowLight: '#FFF3D0',
  red: '#FF3B30',
  redLight: '#FFD6D4',

  // Utility
  border: '#D1E8E4',
  disabled: '#B0CCC8',
  error: '#FF3B30',
} as const;

export type ColorName = keyof typeof Colors;
