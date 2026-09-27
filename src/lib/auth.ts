/** Routes that need a session. Everything else is public. Prefix match. */
export const PROTECTED_PATHS = ['/cart', '/checkout', '/orders', '/account'] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Only same-site relative paths are allowed as `?next=` targets, so the login page
 * can't be used as an open redirect (`//evil.com`, `https://…`, `/\evil.com`).
 */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback;
  }
  return next;
}

export function loginUrl(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

/** For user actions that need auth (add to cart, checkout): go to login, then come back. */
export function redirectToLogin(): void {
  const { pathname, search } = window.location;
  window.location.assign(loginUrl(`${pathname}${search}`));
}
