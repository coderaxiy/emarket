import { defineMiddleware } from 'astro:middleware';
import { fetchSessionUser } from '@/lib/api/server';
import { isProtectedPath, loginUrl } from '@/lib/auth';

/**
 * Public-first: resolve the session on every request, never redirect on public routes.
 * Only PROTECTED_PATHS send a logged-out visitor to `/login?next=…`.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = await fetchSessionUser(context.request.headers.get('cookie'));

  const { pathname, search } = context.url;
  if (!context.locals.user && isProtectedPath(pathname)) {
    return context.redirect(loginUrl(`${pathname}${search}`));
  }

  return next();
});
