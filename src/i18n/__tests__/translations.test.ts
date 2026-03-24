import { en, TranslationKey } from '../translations/en';
import { he } from '../translations/he';
import { createT } from '../index';

const enKeys = Object.keys(en) as TranslationKey[];
const heKeys = Object.keys(he) as TranslationKey[];

describe('translations', () => {
  it('en and he have the same keys', () => {
    expect(enKeys.sort()).toEqual(heKeys.sort());
  });

  it('no missing translations in he', () => {
    const missing = enKeys.filter((key) => !he[key]);
    expect(missing).toEqual([]);
  });

  it('no extra keys in he', () => {
    const extra = heKeys.filter((key) => !(key in en));
    expect(extra).toEqual([]);
  });

  it('t() returns the correct english string', () => {
    const t = createT('en');
    expect(t('lists.title')).toBe('Lists');
    expect(t('common.cancel')).toBe('Cancel');
  });

  it('t() returns the correct hebrew string', () => {
    const t = createT('he');
    expect(t('lists.title')).toBe('רשימות');
    expect(t('common.cancel')).toBe('ביטול');
  });

  it('t() interpolates variables', () => {
    const t = createT('en');
    expect(t('settings.greeting', { name: 'John' })).toBe('Hi, John!');
    expect(t('lists.itemCount.other', { count: 5 })).toBe('5 items');
  });

  it('t() interpolates variables in hebrew', () => {
    const t = createT('he');
    expect(t('settings.greeting', { name: 'יוחנן' })).toBe('שלום, יוחנן!');
    expect(t('completed.header', { count: 3 })).toBe('הושלמו (3)');
  });

  it('t() falls back to key if translation is missing', () => {
    const t = createT('en');
    // @ts-expect-error testing unknown key
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });
});
