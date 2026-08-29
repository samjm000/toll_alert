export const colors = {
  background: '#F5F7FC',
  surface: '#FFFFFF',
  primary: '#2F6FED',
  primaryDeep: '#16214F',
  primarySoftBg: '#E9EFFE',
  accent: '#F5A524',
  accentBg: '#FDF0DA',
  text: '#12142B',
  textMuted: '#5C6178',
  textOnDark: '#F5F7FC',
  textOnDarkMuted: 'rgba(245, 247, 252, 0.72)',
  border: '#E5E8F2',
  success: '#1C9A5B',
  successBg: '#E6F6ED',
  warning: '#B8790B',
  warningBg: '#FDF0DA',
  danger: '#C4342F',
  dangerBg: '#FBEAE9',
};

/** Diagonal brand gradient — matches the app icon / logo mark. */
export const gradient = {
  colors: ['#16214F', '#1D3FBF', '#2F6FED'] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
};

export const shadow = {
  card: {
    shadowColor: '#0B1440',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};
