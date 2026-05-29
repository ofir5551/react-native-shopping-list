import { resolveThemeId, DEFAULT_THEME_ID } from '../styles/palettes';

describe('resolveThemeId', () => {
  it('returns natural for null (fresh install)', () => {
    expect(resolveThemeId(null)).toBe('natural');
  });

  it('returns natural for stored "light" (migration)', () => {
    expect(resolveThemeId('light')).toBe('natural');
  });

  it('returns natural for stored "system" (migration)', () => {
    expect(resolveThemeId('system')).toBe('natural');
  });

  it('returns midnight for stored "dark" (migration)', () => {
    expect(resolveThemeId('dark')).toBe('midnight');
  });

  it('returns the stored ThemeId unchanged when valid', () => {
    expect(resolveThemeId('ocean')).toBe('ocean');
    expect(resolveThemeId('sunset')).toBe('sunset');
    expect(resolveThemeId('lavender')).toBe('lavender');
    expect(resolveThemeId('midnight')).toBe('midnight');
    expect(resolveThemeId('navy')).toBe('navy');
    expect(resolveThemeId('charcoal')).toBe('charcoal');
    expect(resolveThemeId('plum')).toBe('plum');
  });

  it('returns the DEFAULT_THEME_ID for unknown strings', () => {
    expect(resolveThemeId('banana')).toBe(DEFAULT_THEME_ID);
  });
});
