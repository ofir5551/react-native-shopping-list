import { Theme, fonts, spacing, borderRadius } from './theme';

export type ThemeId =
  | 'natural' | 'ocean' | 'sunset' | 'lavender'
  | 'midnight' | 'navy' | 'charcoal' | 'plum';

export type Palette = Theme & { id: ThemeId; isDark: boolean };

export const PALETTES: Record<ThemeId, Palette> = {
  natural: {
    id: 'natural', isDark: false, fonts, spacing, borderRadius,
    colors: {
      background: '#f3ede4', surface: '#fdfaf6', surfaceHighlight: '#e8ddd0',
      primary: '#196b4e', primaryText: '#ffffff',
      text: '#1a1612', textSecondary: '#6e5e50',
      border: '#cfc0ad', danger: '#8a3232', dangerSurface: '#fce8e8',
      inputBackground: '#fdfaf6', backdrop: 'rgba(26, 22, 18, 0.4)', syncActive: '#196b4e',
    },
  },
  ocean: {
    id: 'ocean', isDark: false, fonts, spacing, borderRadius,
    colors: {
      background: '#edf4fc', surface: '#f4f9ff', surfaceHighlight: '#dceeff',
      primary: '#1a6fa8', primaryText: '#ffffff',
      text: '#0e1f2e', textSecondary: '#4a6a84',
      border: '#b8d4ec', danger: '#8a3232', dangerSurface: '#fce8e8',
      inputBackground: '#f4f9ff', backdrop: 'rgba(14, 31, 46, 0.4)', syncActive: '#1a6fa8',
    },
  },
  sunset: {
    id: 'sunset', isDark: false, fonts, spacing, borderRadius,
    colors: {
      background: '#fdf0ea', surface: '#fffaf7', surfaceHighlight: '#ffe8dc',
      primary: '#c4522a', primaryText: '#ffffff',
      text: '#2a1408', textSecondary: '#7a4a34',
      border: '#ddc0b0', danger: '#8a3232', dangerSurface: '#fce8e8',
      inputBackground: '#fffaf7', backdrop: 'rgba(42, 20, 8, 0.4)', syncActive: '#c4522a',
    },
  },
  lavender: {
    id: 'lavender', isDark: false, fonts, spacing, borderRadius,
    colors: {
      background: '#f5f0ff', surface: '#faf7ff', surfaceHighlight: '#ede4ff',
      primary: '#6b3fa0', primaryText: '#ffffff',
      text: '#1a0e2a', textSecondary: '#5a4270',
      border: '#c8b8e0', danger: '#8a3232', dangerSurface: '#fce8e8',
      inputBackground: '#faf7ff', backdrop: 'rgba(26, 14, 42, 0.4)', syncActive: '#6b3fa0',
    },
  },
  midnight: {
    id: 'midnight', isDark: true, fonts, spacing, borderRadius,
    colors: {
      background: '#16130e', surface: '#201d17', surfaceHighlight: '#2b271f',
      primary: '#2a9470', primaryText: '#ffffff',
      text: '#eae4da', textSecondary: '#9e8f7c',
      border: '#3b3529', danger: '#d46f7a', dangerSurface: '#3d2525',
      inputBackground: '#2b271f', backdrop: 'rgba(0, 0, 0, 0.65)', syncActive: '#2a9470',
    },
  },
  navy: {
    id: 'navy', isDark: true, fonts, spacing, borderRadius,
    colors: {
      background: '#0d1520', surface: '#162030', surfaceHighlight: '#1e2d40',
      primary: '#4a9fd4', primaryText: '#ffffff',
      text: '#d0e8f5', textSecondary: '#6a8aa0',
      border: '#253545', danger: '#d46f7a', dangerSurface: '#3d2525',
      inputBackground: '#1e2d40', backdrop: 'rgba(0, 0, 0, 0.65)', syncActive: '#4a9fd4',
    },
  },
  charcoal: {
    id: 'charcoal', isDark: true, fonts, spacing, borderRadius,
    colors: {
      background: '#181818', surface: '#242424', surfaceHighlight: '#2e2e2e',
      primary: '#e07b39', primaryText: '#ffffff',
      text: '#f0ece8', textSecondary: '#8a8078',
      border: '#383838', danger: '#d46f7a', dangerSurface: '#3d2525',
      inputBackground: '#2e2e2e', backdrop: 'rgba(0, 0, 0, 0.65)', syncActive: '#e07b39',
    },
  },
  plum: {
    id: 'plum', isDark: true, fonts, spacing, borderRadius,
    colors: {
      background: '#1a1022', surface: '#261535', surfaceHighlight: '#321a44',
      primary: '#9b6fd4', primaryText: '#ffffff',
      text: '#ede4ff', textSecondary: '#7a5a9a',
      border: '#3d2055', danger: '#d46f7a', dangerSurface: '#3d2525',
      inputBackground: '#321a44', backdrop: 'rgba(0, 0, 0, 0.65)', syncActive: '#9b6fd4',
    },
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'natural';

const VALID_IDS = new Set<string>(Object.keys(PALETTES));

export function resolveThemeId(stored: string | null): ThemeId {
  if (stored === null) return DEFAULT_THEME_ID;
  if (VALID_IDS.has(stored)) return stored as ThemeId;
  if (stored === 'dark') return 'midnight';
  return DEFAULT_THEME_ID; // 'light', 'system', or unknown → natural
}
