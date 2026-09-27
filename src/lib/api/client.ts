import axios from 'axios';
import { PUBLIC_API_BASE_URL } from 'astro:env/client';

/**
 * The one browser API client. Auth is the httpOnly `access_token` cookie, sent via
 * `withCredentials`. Unlike the admin/seller apps there is NO global 401 redirect:
 * logged-out browsing is normal. Actions that need a session call `redirectToLogin()`.
 */
export const apiClient = axios.create({
  baseURL: PUBLIC_API_BASE_URL,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});
