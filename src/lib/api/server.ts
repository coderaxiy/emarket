import { PUBLIC_API_BASE_URL } from 'astro:env/client';
import { AUTH_ENDPOINTS } from './endpoints';
import type { UserRead } from './types';

const SESSION_TIMEOUT_MS = 3_000;

/**
 * Server-side fetch for middleware and `.astro` frontmatter. Server code has no browser
 * session, so pass the incoming `Cookie` header when the call needs the user.
 */
export function serverFetch(path: string, init: RequestInit & { cookie?: string | null } = {}) {
  const { cookie, headers, ...rest } = init;
  return fetch(`${PUBLIC_API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
  });
}

/** Resolve the current user, or `null` when logged out or the backend is unreachable. */
export async function fetchSessionUser(cookie: string | null): Promise<UserRead | null> {
  if (!cookie?.includes('access_token=')) return null;
  try {
    const response = await serverFetch(AUTH_ENDPOINTS.me, {
      cookie,
      signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as UserRead;
  } catch (error) {
    console.error('[session] GET /auth/me failed:', error);
    return null;
  }
}
