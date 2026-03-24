import { en, TranslationKey } from './translations/en';
import { he } from './translations/he';

export type { TranslationKey };
export type Locale = 'en' | 'he';

export const LOCALE_STORAGE_KEY = '@shopping-list/locale';

export const isRTLLocale = (locale: Locale): boolean => locale === 'he';

const translations: Record<Locale, Record<TranslationKey, string>> = { en, he };

export function createT(locale: Locale) {
  return function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    const str = translations[locale][key] ?? translations['en'][key] ?? key;
    if (!vars) return str;
    return str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
  };
}

/** Pluralize item count: uses 'lists.itemCount.one' or 'lists.itemCount.other' */
export function pluralItemCount(t: ReturnType<typeof createT>, count: number): string {
  if (count === 1) {
    return t('lists.itemCount.one');
  }
  return t('lists.itemCount.other', { count });
}
