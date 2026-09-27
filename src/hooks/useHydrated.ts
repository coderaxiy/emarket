import { useSyncExternalStore } from 'react';

const noSubscribe = () => () => {};

/**
 * False on the server and while hydrating, true after. Islands share one QueryClient, so
 * a later island can find data in the cache (e.g. the cart the header badge loaded) that
 * the server never had. Render the server's version until this is true, or hydration fails.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}
