import { isAxiosError } from 'axios';

function status(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

export const isUnauthorized = (error: unknown): boolean => status(error) === 401;
export const isForbidden = (error: unknown): boolean => status(error) === 403;
export const isNotFound = (error: unknown): boolean => status(error) === 404;

/** 4xx never succeeds on retry; network errors and 5xx might. */
export function isRetryable(error: unknown): boolean {
  const code = status(error);
  return code === undefined || code >= 500;
}

/**
 * The only way to show a backend message. FastAPI sends a human-readable *string*
 * `detail` for business errors (400/401/403/404/409) — safe to show as-is. A 422 sends
 * an array of objects (rendering it crashes React) and structured details (e.g.
 * `price_changed`) are objects; both fall back to the caller's localized message.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  const detail: unknown = error.response?.data?.detail;
  return typeof detail === 'string' && detail.trim() !== '' ? detail : fallback;
}
