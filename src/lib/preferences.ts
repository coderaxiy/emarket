import type { AstroCookies } from 'astro';

/** User-selected colour scheme. `system` follows the OS via `color-scheme: light dark`. */
export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = 'theme';
const DEFAULT_THEME: Theme = 'system';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/** Read the theme cookie server-side so `<html data-theme>` is correct on first paint. */
export function getTheme(cookies: AstroCookies): Theme {
  const value = cookies.get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}

/** Browser only: persist a preference cookie readable by the server on the next request. */
export function setPreferenceCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

/** Browser only: apply a theme immediately — no reload needed, CSS reads `data-theme`. */
export function applyTheme(theme: Theme): void {
  setPreferenceCookie(THEME_COOKIE, theme);
  document.documentElement.dataset.theme = theme;
}
