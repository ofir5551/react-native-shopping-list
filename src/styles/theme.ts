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

export const lightTheme: Theme = {
  colors: {
    background: '#f7f4f0',
    surface: '#ffffff',
    surfaceHighlight: '#f0e6df',
    primary: '#1f7a5a',
    primaryText: '#ffffff',
    text: '#1f1f1f',
    textSecondary: '#6b6b6b',
    border: '#e6d8ca',
    danger: '#9a3d3d',
    dangerSurface: '#ffebeb',
    inputBackground: '#ffffff',
    backdrop: 'rgba(0, 0, 0, 0.35)',
  },
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
    background: '#121212',
    surface: '#1e1e1e',
    surfaceHighlight: '#2c2c2c',
    primary: '#2d8a6a', // Slightly lighter for dark mode contrast
    primaryText: '#ffffff',
    text: '#e0e0e0',
    textSecondary: '#a0a0a0',
    border: '#333333',
    danger: '#cf6679',
    dangerSurface: '#3e2a2a',
    inputBackground: '#2c2c2c',
    backdrop: 'rgba(0, 0, 0, 0.6)',
  },
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
