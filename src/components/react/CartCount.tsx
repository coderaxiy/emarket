import { useQuery } from '@tanstack/react-query';
import { useState, useSyncExternalStore } from 'react';
import type { Locale } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { CART_QUERY_KEY, fetchCart } from '@/lib/api/cart';
import { cn } from '@/lib/utils';
import { AppProviders } from './AppProviders';

// The item-count bubble on cart icons (header, mobile tab bar). `GET /cart` creates a
// cart on first call, so we only ask when a cart can exist: signed in, or a `cart_token`
// cookie is present (`hasCart`, decided server-side). After "Add to cart" the product
// page fetches the cart into the shared cache, and the bubble shows up without a reload.

interface CartBadgeProps {
  hasCart: boolean;
  className?: string;
}

const noSubscribe = () => () => {};

/**
 * False on the server and while hydrating, true after. The server never knows the count,
 * but the shared cache may already have it when a second island hydrates: rendering it
 * then would not match the server HTML.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}

export function CartBadge({ hasCart, className }: CartBadgeProps) {
  const { t } = useTranslation();
  const hydrated = useHydrated();
  const { data } = useQuery({ queryKey: CART_QUERY_KEY, queryFn: fetchCart, enabled: hasCart });
  const count = data?.item_count ?? 0;

  // Bump when the count goes up (not on first render). State, not a ref: read in render.
  const [seen, setSeen] = useState(count);
  const [bumps, setBumps] = useState(0);
  if (count !== seen) {
    if (count > seen) setBumps(bumps + 1);
    setSeen(count);
  }

  if (!hydrated || count === 0) return null;
  return (
    <span
      key={bumps}
      className={cn(
        'pointer-events-none absolute -top-1 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] leading-none font-semibold text-primary-foreground tabular-nums ring-2 ring-background',
        bumps > 0 && 'animate-bump',
        className,
      )}
    >
      <span aria-hidden="true">{count > 99 ? '99+' : count}</span>
      <span className="sr-only">{t('cart.itemCount', { count })}</span>
    </span>
  );
}

/** Standalone island for `.astro` chrome (the mobile tab bar). Place inside a `relative` box. */
export function CartBadgeIsland({ locale, hasCart }: { locale: Locale; hasCart: boolean }) {
  return (
    <AppProviders locale={locale}>
      <CartBadge hasCart={hasCart} />
    </AppProviders>
  );
}
