export const colors = {
  background: '#FBF7EE',
  surface: '#FFFFFF',
  ink: '#17140F',
  primary: '#F3B815',
  primaryPressed: '#D9A20A',
  primaryDeep: '#7A4B06',
  primarySoftBg: '#FFF1CC',
  accent: '#F3B815',
  accentBg: '#FFF1CC',
  text: '#1B1912',
  textMuted: '#756B54',
  textOnDark: '#FBF7EE',
  textOnDarkMuted: 'rgba(251, 247, 238, 0.72)',
  border: '#EBE2CB',
  success: '#1E9E6B',
  successBg: '#E4F5EC',
  warning: '#9A6B0A',
  warningBg: '#FFF1CC',
  danger: '#D93025',
  dangerBg: '#FBE7E5',
};

/** "Light at the end of the tunnel" brand gradient — matches the app icon. */
export const gradient = {
  colors: ['#17140F', '#7A4B06', '#F3B815'] as const,
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
};

/** Darker two-stop variant for banners/surfaces that need light text throughout. */
export const gradientDark = {
  colors: ['#17140F', '#4A2E06'] as const,
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
    shadowColor: '#3A2E0A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  gold: {
    shadowColor: '#D9A20A',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
};
