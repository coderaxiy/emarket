import type { AstroCookies } from 'astro';

/** User-selected colour scheme. `system` follows the OS via `color-scheme: light dark`. */
export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = 'theme';
const DEFAULT_THEME: Theme = 'system';

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/** Read the theme cookie server-side so `<html data-theme>` is correct on first paint. */
export function getTheme(cookies: AstroCookies): Theme {
  const value = cookies.get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}
