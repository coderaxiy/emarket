// Every API path lives here, grouped per resource. Paths are relative to
// PUBLIC_API_BASE_URL, which already includes `/api/v1`. Never hardcode a path in a component.

export const AUTH_ENDPOINTS = {
  register: '/auth/register',
  login: '/auth/login',
  logout: '/auth/logout',
  me: '/auth/me',
} as const;
