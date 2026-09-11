// ShowProd Design System — Minimalismo Premium
export const colors = {
  // Light mode (telas de gestão)
  background: '#F8F7F4',    // creme
  card: '#FFFFFF',           // branco puro
  foreground: '#111111',     // preto
  muted: '#F0EDE6',          // creme escuro
  mutedForeground: '#A3A3A3',
  border: '#E5E4E0',
  primary: '#111111',
  primaryForeground: '#F8F7F4',
  destructive: '#EF4444',
  white: '#FFFFFF',

  // Dark mode (Performance)
  darkBg: '#0C0B09',
  darkCard: '#131109',
  darkBorder: '#1E1B14',
  darkText: '#E8E0D0',
  darkMuted: '#4A4540',
  amber: '#F5A623',          // acento âmbar no Performance
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
};

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 20,
};

export const font = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};
