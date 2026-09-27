import { QueryClient } from '@tanstack/react-query';
import { isRetryable } from './errors';

const MAX_RETRIES = 2;

/**
 * One QueryClient for the whole session. Module-level, so it survives ClientRouter
 * navigations and is shared by every island.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => failureCount < MAX_RETRIES && isRetryable(error),
    },
    mutations: {
      retry: false,
    },
  },
});
