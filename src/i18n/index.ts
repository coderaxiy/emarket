import type { AstroCookies } from 'astro';
import { en } from './locales/en';
import { ru } from './locales/ru';
import { uz } from './locales/uz';
import type { Dictionary, TranslationKey, TranslationParams } from './types';

export type { TranslationKey, TranslationParams } from './types';

export const LOCALES = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Decided by the owner. The admin and seller apps default to `en`; the storefront does not. */
export const DEFAULT_LOCALE: Locale = 'uz';
export const LOCALE_COOKIE = 'locale';

/** Native names for the switcher — never translated. Uzbek is Latin script. */
export const LOCALE_NAMES: Record<Locale, string> = {
  uz: 'Oʻzbekcha',
  ru: 'Русский',
  en: 'English',
};

/** BCP 47 tags for Intl (numbers, currency, dates). */
export const INTL_LOCALES: Record<Locale, string> = {
  uz: 'uz-Latn-UZ',
  ru: 'ru-RU',
  en: 'en-US',
};

const DICTIONARIES: Record<Locale, Dictionary> = { en, uz, ru };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Server-side: the locale from the `locale` cookie, falling back to `uz`. */
export function getLocale(cookies: AstroCookies): Locale {
  const value = cookies.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function translate(locale: Locale, key: TranslationKey, params?: TranslationParams): string {
  const [namespace, name] = key.split('.') as [keyof Dictionary, string];
  const section = DICTIONARIES[locale][namespace] as Record<string, string>;
  const template = section[name] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, param: string) =>
    param in params ? String(params[param]) : match,
  );
}

export type TFunction = (key: TranslationKey, params?: TranslationParams) => string;

/** Bind `translate` to a locale — for `.astro` frontmatter: `const t = createT(locale)`. */
export function createT(locale: Locale): TFunction {
  return (key, params) => translate(locale, key, params);
}

/** Pick a localized name from API `translations: [{ locale, name }]` (current → en → first). */
export function pickTranslation<T extends { locale: string }>(
  translations: readonly T[],
  locale: Locale,
): T | undefined {
  return (
    translations.find((entry) => entry.locale === locale) ??
    translations.find((entry) => entry.locale === 'en') ??
    translations[0]
  );
}
