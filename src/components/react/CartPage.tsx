import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangleIcon, ImageIcon, MinusIcon, PlusIcon, ShoppingBagIcon, StoreIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { toast } from '@/components/ui/toast';
import type { Locale } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { CART_QUERY_KEY, fetchCart, removeCartItem, updateCartItem } from '@/lib/api/cart';
import { apiErrorMessage, isNotFound } from '@/lib/api/errors';
import { queryClient } from '@/lib/api/queryClient';
import type { CartItemRead, ShopSummaryRead } from '@/lib/api/types';
import { loginUrl } from '@/lib/auth';
import { formatMoney, toTiyin } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AppProviders } from './AppProviders';

// The cart page, guests included (backend `cart_token` cookie). Client-rendered: it's
// per-visitor and never indexed. Totals come from the server; lines that can't be
// bought any more stay visible with a reason instead of silently disappearing.

interface CartPageProps {
  locale: Locale;
  signedIn: boolean;
}

const MAX_QUANTITY = 99;

const productHref = (item: CartItemRead) =>
  `/shops/${encodeURIComponent(item.shop.slug)}/${encodeURIComponent(item.product.slug)}`;

const priceChanged = (item: CartItemRead) => toTiyin(item.unit_price) !== toTiyin(item.price_snapshot);

/** Lines grouped by shop, in the order shops first appear. */
function groupByShop(items: CartItemRead[]): { shop: ShopSummaryRead; items: CartItemRead[] }[] {
  const groups = new Map<number, { shop: ShopSummaryRead; items: CartItemRead[] }>();
  for (const item of items) {
    const group = groups.get(item.shop.id) ?? { shop: item.shop, items: [] };
    group.items.push(item);
    groups.set(item.shop.id, group);
  }
  return [...groups.values()];
}

function refreshCart() {
  return queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
}

function CartLine({ item }: { item: CartItemRead }) {
  const { t, intlLocale } = useTranslation();
  const money = (amount: string) => formatMoney(amount, intlLocale);

  const onError = (error: unknown) => {
    // Already gone (another tab, or the cart merged on login): just show the current cart.
    if (isNotFound(error)) void refreshCart();
    toast({ variant: 'error', title: apiErrorMessage(error, t('cart.updateFailed')) });
  };
  const update = useMutation({
    mutationFn: (quantity: number) => updateCartItem(item.id, quantity),
    onSuccess: () => refreshCart(),
    onError,
  });
  const remove = useMutation({
    mutationFn: () => removeCartItem(item.id),
    onSuccess: () => refreshCart(),
    onError,
  });
  const busy = update.isPending || remove.isPending;
  const variantText = item.variant ? Object.values(item.variant.attributes).join(' · ') : '';

  return (
    <li className={cn('flex gap-3 py-4 sm:gap-4', busy && 'opacity-60')}>
      <a
        href={productHref(item)}
        className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-24"
        tabIndex={-1}
        aria-hidden="true"
      >
        {item.product.image_url ? (
          <img
            src={item.product.image_url}
            alt=""
            loading="lazy"
            className={cn('size-full object-cover', !item.available && 'grayscale')}
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-6" />
          </span>
        )}
      </a>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <a href={productHref(item)} className="line-clamp-2 text-sm font-medium hover:text-accent sm:text-base">
              {item.product.title}
            </a>
            {variantText && <p className="text-sm text-muted-foreground">{variantText}</p>}
          </div>
          <div className="flex shrink-0 flex-col sm:items-end">
            <p className="font-semibold tabular-nums sm:text-lg">{money(item.line_total)}</p>
            {item.quantity > 1 && (
              <p className="text-xs text-muted-foreground tabular-nums">{t('cart.perItem', { price: money(item.unit_price) })}</p>
            )}
          </div>
        </div>

        {!item.available ? (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertTriangleIcon className="size-4 shrink-0" aria-hidden="true" />
            {t('cart.unavailable')}
          </p>
        ) : (
          <>
            {!item.in_stock && (
              <p className="flex items-center gap-1.5 text-sm">
                <AlertTriangleIcon className="size-4 shrink-0 text-warning" aria-hidden="true" />
                {t('cart.notEnoughStock')}
              </p>
            )}
            {priceChanged(item) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-warning/15 px-3 py-2 text-sm">
                <span>
                  {t('cart.priceChanged', { old: money(item.price_snapshot), price: money(item.unit_price) })}
                </span>
                <Button variant="link" size="sm" disabled={busy} onClick={() => update.mutate(item.quantity)}>
                  {t('cart.acceptPrice')}
                </Button>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between gap-3">
          {item.available ? (
            <div className="flex h-9 items-center rounded-full border border-border bg-background">
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                aria-label={t('product.decrease')}
                disabled={busy || item.quantity <= 1}
                onClick={() => update.mutate(item.quantity - 1)}
              >
                <MinusIcon />
              </Button>
              <output aria-label={t('product.quantity')} className="w-8 text-center text-sm font-medium tabular-nums">
                {item.quantity}
              </output>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                aria-label={t('product.increase')}
                disabled={busy || item.quantity >= MAX_QUANTITY}
                onClick={() => update.mutate(item.quantity + 1)}
              >
                <PlusIcon />
              </Button>
            </div>
          ) : (
            <span />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            disabled={busy}
            onClick={() => remove.mutate()}
          >
            <Trash2Icon aria-hidden="true" />
            {t('cart.remove')}
          </Button>
        </div>
      </div>
    </li>
  );
}

function CartSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex gap-4">
            <Skeleton className="size-24 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-auto h-9 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

function CheckoutAction({ signedIn, compact = false }: { signedIn: boolean; compact?: boolean }) {
  const { t } = useTranslation();
  if (signedIn) {
    return (
      <Button size={compact ? 'md' : 'lg'} className="rounded-full" disabled title={t('cart.checkoutSoon')}>
        {t('cart.checkout')}
      </Button>
    );
  }
  return (
    <Button asChild size={compact ? 'md' : 'lg'} className="rounded-full">
      <a href={loginUrl('/cart')}>{t('cart.signInToCheckout')}</a>
    </Button>
  );
}

function Cart({ signedIn }: { signedIn: boolean }) {
  const { t, intlLocale } = useTranslation();
  const cart = useQuery({ queryKey: CART_QUERY_KEY, queryFn: fetchCart });
  const summaryRef = useRef<HTMLElement>(null);
  // Below lg the summary sits after the lines; a bottom bar keeps total + button in reach
  // until the summary itself scrolls into view.
  const [summaryVisible, setSummaryVisible] = useState(false);
  const hasSummary = cart.data !== undefined && cart.data.items.length > 0;

  useEffect(() => {
    const summary = summaryRef.current;
    if (!summary) return;
    const observer = new IntersectionObserver(([entry]) => setSummaryVisible(entry?.isIntersecting ?? false));
    observer.observe(summary);
    return () => observer.disconnect();
  }, [hasSummary]);

  const heading = (
    <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
      {t('nav.cart')}
      {cart.data && cart.data.item_count > 0 && (
        <span className="ml-2 text-lg font-medium text-muted-foreground tabular-nums sm:text-xl">
          {t('cart.itemCount', { count: cart.data.item_count })}
        </span>
      )}
    </h1>
  );

  if (cart.isPending) {
    return (
      <>
        {heading}
        <CartSkeleton />
      </>
    );
  }
  if (cart.isError) {
    return (
      <>
        {heading}
        <ErrorState title={t('state.loadFailed')} onRetry={() => void cart.refetch()} retryLabel={t('common.retry')} />
      </>
    );
  }

  const { items, item_count: itemCount, subtotal } = cart.data;
  if (items.length === 0) {
    return (
      <>
        {heading}
        <EmptyState
          icon={<ShoppingBagIcon aria-hidden="true" />}
          title={t('cart.emptyTitle')}
          description={t('cart.emptyBody')}
          action={
            <Button asChild variant="accent" className="rounded-full">
              <a href="/catalog">{t('home.heroCta')}</a>
            </Button>
          }
        />
      </>
    );
  }

  const hasUnavailable = items.some((item) => !item.available);
  const hasShortStock = items.some((item) => item.available && !item.in_stock);
  const total = formatMoney(subtotal, intlLocale);

  return (
    <>
      {heading}
      {/* pb-24: room for the bottom bar below lg, so it never covers the last line. */}
      <div className="grid gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:pb-0">
        <div className="flex flex-col gap-4">
          {groupByShop(items).map(({ shop, items: lines }) => (
            <section key={shop.id} className="rounded-xl border border-border bg-card px-4 pt-3">
              <h2 className="border-b border-border pb-3">
                <a
                  href={`/shops/${encodeURIComponent(shop.slug)}`}
                  className="inline-flex items-center gap-2 font-semibold hover:text-accent"
                >
                  <span className="flex size-7 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                    {shop.logo_url ? (
                      <img src={shop.logo_url} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <StoreIcon className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  {shop.name}
                </a>
              </h2>
              <ul className="divide-y divide-border">
                {lines.map((item) => (
                  <CartLine key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside
          ref={summaryRef}
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-24"
        >
          <h2 className="text-lg font-semibold">{t('cart.summary')}</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t('cart.itemCount', { count: itemCount })}</dt>
              <dd className="tabular-nums">{total}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
              <dt className="font-semibold">{t('cart.total')}</dt>
              <dd className="text-2xl font-semibold text-primary tabular-nums">{total}</dd>
            </div>
          </dl>
          {(hasUnavailable || hasShortStock) && (
            <p className="flex gap-2 rounded-md bg-warning/15 px-3 py-2 text-sm">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              {hasUnavailable ? t('cart.removeUnavailable') : t('cart.fixStock')}
            </p>
          )}
          <CheckoutAction signedIn={signedIn} />
          <p className="text-center text-xs text-muted-foreground">
            {signedIn ? t('cart.checkoutSoon') : t('cart.guestNote')}
          </p>
        </aside>
      </div>

      <div
        className={cn(
          'fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-t border-border bg-popover/95 px-4 py-2.5 shadow-[0_-4px_12px_rgb(0_0_0/0.06)] backdrop-blur transition-transform duration-200 md:bottom-0 lg:hidden',
          summaryVisible ? 'pointer-events-none translate-y-[200%]' : 'translate-y-0',
        )}
        aria-hidden={summaryVisible}
        inert={summaryVisible}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-muted-foreground tabular-nums">{t('cart.itemCount', { count: itemCount })}</span>
          <span className="truncate text-lg font-semibold text-primary tabular-nums">{total}</span>
        </div>
        <CheckoutAction signedIn={signedIn} compact />
      </div>
    </>
  );
}

export function CartPage({ locale, signedIn }: CartPageProps) {
  return (
    <AppProviders locale={locale}>
      <Cart signedIn={signedIn} />
    </AppProviders>
  );
}
