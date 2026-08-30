export const colors = {
  background: '#0A0806',
  surface: '#17130E',
  surfaceRaised: '#221B12',
  ink: '#100C07',
  primary: '#F3B815',
  primaryPressed: '#D9A20A',
  primaryDeep: '#7A4B06',
  primarySoftBg: 'rgba(243, 184, 21, 0.14)',
  accent: '#F3B815',
  accentBg: 'rgba(243, 184, 21, 0.14)',
  text: '#F7F1E3',
  textMuted: '#9C9484',
  textOnDark: '#F7F1E3',
  textOnDarkMuted: 'rgba(247, 241, 227, 0.68)',
  border: '#2C2418',
  success: '#3ADB93',
  successBg: 'rgba(58, 219, 147, 0.14)',
  warning: '#FFC94A',
  warningBg: 'rgba(255, 201, 74, 0.14)',
  danger: '#FF6B5B',
  dangerBg: 'rgba(255, 107, 91, 0.16)',
};

/** "Light at the end of the tunnel" brand gradient — matches the app icon. */
export const gradient = {
  colors: ['#0A0806', '#7A4B06', '#F3B815'] as const,
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
};

/** Richer, gold-leaning gradient for "premium" cards (subscription banner, plan card). */
export const gradientDark = {
  colors: ['#1C1207', '#4A2E06'] as const,
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
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  gold: {
    shadowColor: '#F3B815',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
};
