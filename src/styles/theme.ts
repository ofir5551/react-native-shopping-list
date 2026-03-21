export type Theme = {
  colors: {
    background: string;
    surface: string;
    surfaceHighlight: string;
    primary: string;
    primaryText: string;
    text: string;
    textSecondary: string;
    border: string;
    danger: string;
    dangerSurface: string;
    inputBackground: string;
    backdrop: string;
    syncActive: string;
  };
  fonts: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    round: number;
  };
};

const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
};

export const lightTheme: Theme = {
  colors: {
    background: '#f3ede4',      // richer, deeper cream
    surface: '#fdfaf6',         // warm white (was pure #fff)
    surfaceHighlight: '#e8ddd0', // more pronounced warm highlight
    primary: '#196b4e',         // deeper forest green — more authority
    primaryText: '#ffffff',
    text: '#1a1612',            // warm near-black (was neutral #1f1f1f)
    textSecondary: '#6e5e50',   // warm brown-gray — character over neutral gray
    border: '#cfc0ad',          // visible, warm border (was barely-there #e6d8ca)
    danger: '#8a3232',
    dangerSurface: '#fce8e8',
    inputBackground: '#fdfaf6',
    backdrop: 'rgba(26, 22, 18, 0.4)',
    syncActive: '#196b4e',
  },
  fonts,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    round: 999,
  },
};

export const darkTheme: Theme = {
  colors: {
    background: '#16130e',      // warm dark — brown-black, not tech gray
    surface: '#201d17',         // warm dark surface
    surfaceHighlight: '#2b271f', // warm dark highlight
    primary: '#2a9470',         // brighter green for dark legibility
    primaryText: '#ffffff',
    text: '#eae4da',            // warm near-white (was cold #e0e0e0)
    textSecondary: '#9e8f7c',   // warm mid-tone (was neutral #a0a0a0)
    border: '#3b3529',          // warm dark border
    danger: '#d46f7a',
    dangerSurface: '#3d2525',
    inputBackground: '#2b271f',
    backdrop: 'rgba(0, 0, 0, 0.65)',
    syncActive: '#2a9470',
  },
  fonts,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    round: 999,
  },
};
