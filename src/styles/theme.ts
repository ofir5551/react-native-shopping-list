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

export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const borderRadius = { sm: 8, md: 12, lg: 16, round: 999 };
