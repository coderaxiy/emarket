import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangleIcon, BanknoteIcon, ClockIcon, ImageIcon, MapPinIcon, PhoneIcon, ShoppingBagIcon, StoreIcon, UserIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { Textarea } from '@/components/ui/textarea';
import type { Locale, TranslationKey } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { CART_QUERY_KEY, fetchCart, updateCartItem } from '@/lib/api/cart';
import { fetchLastUsedPickupPoint, placeOrder, priceChangedDetail } from '@/lib/api/checkout';
import { apiErrorMessage, isUnauthorized } from '@/lib/api/errors';
import { queryClient } from '@/lib/api/queryClient';
import type { CartItemRead, CartRead, PaymentMethod, PickupPointRead, PriceChangedDetail, ShopSummaryRead } from '@/lib/api/types';
import { redirectToLogin } from '@/lib/auth';
import { formatMoney } from '@/lib/format';
import { addressLandmark, formatAddress, todaysHours } from '@/lib/pickupPoints';
import { cn } from '@/lib/utils';
import { useHydrated } from '@/hooks/useHydrated';
import { AppProviders } from './AppProviders';
import { PickupPointPicker } from './PickupPointPicker';

// Checkout: one pickup point for the whole order, the recipient the point checks, and
// payment. Only cash at the pickup point for now: the online gateways (Payme, Click,
// Uzcard) aren't connected on the backend yet (their redirect URL is a placeholder).
// Guide: sdk-contract/docs/orders-and-payments-api.md §2.

interface CheckoutPageProps {
  locale: Locale;
  /** Prefills the recipient name. */
  userName: string | null;
}

const PAYMENT_METHOD: PaymentMethod = 'cash_on_delivery';
const RECIPIENT_STORAGE_KEY = 'checkout.recipient';
const PHONE_PREFIX = '+998 ';

interface RecipientDraft {
  fullName: string;
  phone: string;
  notes: string;
}

type RecipientErrors = Partial<Record<'fullName' | 'phone', TranslationKey>>;

/** Per-browser convenience: the last recipient used here. Never required to work. */
function loadRecipient(userName: string | null): RecipientDraft {
  const fallback = { fullName: userName ?? '', phone: PHONE_PREFIX, notes: '' };
  try {
    const saved = JSON.parse(window.localStorage.getItem(RECIPIENT_STORAGE_KEY) ?? 'null') as Partial<RecipientDraft> | null;
    return {
      fullName: typeof saved?.fullName === 'string' && saved.fullName ? saved.fullName : fallback.fullName,
      phone: typeof saved?.phone === 'string' && saved.phone ? saved.phone : fallback.phone,
      notes: '',
    };
  } catch {
    return fallback;
  }
}

function saveRecipient(recipient: RecipientDraft) {
  try {
    window.localStorage.setItem(RECIPIENT_STORAGE_KEY, JSON.stringify({ fullName: recipient.fullName, phone: recipient.phone }));
  } catch {
    // Storage blocked: the form just won't be prefilled next time.
  }
}

function validateRecipient(recipient: RecipientDraft): RecipientErrors {
  const errors: RecipientErrors = {};
  if (recipient.fullName.trim().length === 0) errors.fullName = 'checkout.nameRequired';
  const digits = recipient.phone.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) errors.phone = 'checkout.phoneInvalid';
  return errors;
}

function groupByShop(items: CartItemRead[]): { shop: ShopSummaryRead; items: CartItemRead[] }[] {
  const groups = new Map<number, { shop: ShopSummaryRead; items: CartItemRead[] }>();
  for (const item of items) {
    const group = groups.get(item.shop.id) ?? { shop: item.shop, items: [] };
    group.items.push(item);
    groups.set(item.shop.id, group);
  }
  return [...groups.values()];
}

function Section({ icon, title, action, children, id }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <span className="text-accent [&_svg]:size-5">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PickupPointSummary({ point }: { point: PickupPointRead }) {
  const { t } = useTranslation();
  const address = formatAddress(point.address);
  const landmark = addressLandmark(point.address);
  const hours = todaysHours(point.operating_hours);
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/60 p-3">
      <p className="font-medium">{point.name}</p>
      {address && <p className="text-sm text-muted-foreground">{address}</p>}
      {landmark && <p className="text-xs text-muted-foreground">{landmark}</p>}
      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {hours && (
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="size-3.5" aria-hidden="true" />
            {t('checkout.todayHours', { hours })}
          </span>
        )}
        {point.contact_phone && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <PhoneIcon className="size-3.5" aria-hidden="true" />
            {point.contact_phone}
          </span>
        )}
      </p>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

function CheckoutForm({ cart, userName }: { cart: CartRead; userName: string | null }) {
  const { t, intlLocale } = useTranslation();
  const money = (amount: string) => formatMoney(amount, intlLocale);

  // Pre-select the point from the buyer's previous order; they can change it.
  const lastUsed = useQuery({ queryKey: ['pickup-points', 'last-used'], queryFn: fetchLastUsedPickupPoint, staleTime: Infinity });
  const [chosenPoint, setChosenPoint] = useState<PickupPointRead | null>(null);
  const point = chosenPoint ?? lastUsed.data ?? null;
  const [pickerOpen, setPickerOpen] = useState(false);

  const [recipient, setRecipient] = useState<RecipientDraft>(() => loadRecipient(userName));
  const [errors, setErrors] = useState<RecipientErrors>({});
  const [pointMissing, setPointMissing] = useState(false);
  const [priceChanges, setPriceChanges] = useState<PriceChangedDetail['items'] | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const summaryRef = useRef<HTMLElement>(null);
  const [summaryVisible, setSummaryVisible] = useState(false);
  useEffect(() => {
    const summary = summaryRef.current;
    if (!summary) return;
    const observer = new IntersectionObserver(([entry]) => setSummaryVisible(entry?.isIntersecting ?? false));
    observer.observe(summary);
    return () => observer.disconnect();
  }, []);

  const blocked = cart.items.some((item) => !item.available || !item.in_stock);
  const total = money(cart.subtotal);

  const submit = useMutation({
    mutationFn: async ({ acceptPrices }: { acceptPrices: boolean }) => {
      if (acceptPrices && priceChanges) {
        // PATCH with the same quantity moves each line's snapshot to the current price.
        const changed = cart.items.filter((item) =>
          priceChanges.some((change) => change.product_id === item.product.id && change.variant_id === (item.variant?.id ?? null)),
        );
        await Promise.all(changed.map((item) => updateCartItem(item.id, item.quantity)));
      }
      return placeOrder({
        recipient: {
          full_name: recipient.fullName.trim(),
          phone: recipient.phone.trim(),
          notes: recipient.notes.trim() || null,
        },
        pickup_point_id: point!.id,
        payment_method: PAYMENT_METHOD,
      });
    },
    onSuccess: (response) => {
      saveRecipient(recipient);
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      // Online methods would go to the gateway; cash on delivery is confirmed already.
      window.location.assign(response.payment_redirect_url ?? `/orders/${response.order_id}?placed=1`);
    },
    onError: (error) => {
      if (isUnauthorized(error)) {
        redirectToLogin();
        return;
      }
      const changes = priceChangedDetail(error);
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      if (changes) {
        setPriceChanges(changes.items);
        setFormError(null);
        return;
      }
      setFormError(apiErrorMessage(error, t('checkout.placeFailed')));
    },
  });

  function onPlaceOrder(acceptPrices = false) {
    const nextErrors = validateRecipient(recipient);
    setErrors(nextErrors);
    setPointMissing(point === null);
    if (point === null) {
      document.getElementById('checkout-point')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById('checkout-recipient')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setFormError(null);
    submit.mutate({ acceptPrices });
  }

  const changedLines = priceChanges
    ? priceChanges.map((change) => ({
        change,
        item: cart.items.find(
          (item) => item.product.id === change.product_id && (item.variant?.id ?? null) === change.variant_id,
        ),
      }))
    : [];

  const placeButton = (compact: boolean) => (
    <Button
      size={compact ? 'md' : 'lg'}
      className={cn('rounded-full', !compact && 'w-full')}
      disabled={blocked || submit.isPending}
      onClick={() => onPlaceOrder()}
    >
      {submit.isPending ? t('checkout.placing') : t('checkout.placeOrder')}
    </Button>
  );

  return (
    <>
      <div className="grid gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:pb-0">
        <div className="flex flex-col gap-4">
          <Section
            id="checkout-point"
            icon={<MapPinIcon aria-hidden="true" />}
            title={t('checkout.pickupPoint')}
            action={
              point && (
                <Button variant="ghost" size="sm" className="text-accent" onClick={() => setPickerOpen(true)}>
                  {t('checkout.change')}
                </Button>
              )
            }
          >
            {lastUsed.isPending && !chosenPoint ? (
              <Skeleton className="h-20 rounded-lg" />
            ) : point ? (
              <>
                <PickupPointSummary point={point} />
                <p className="text-sm text-muted-foreground">{t('checkout.onePointNote')}</p>
              </>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className={cn('text-sm', pointMissing ? 'text-destructive' : 'text-muted-foreground')} role={pointMissing ? 'alert' : undefined}>
                  {pointMissing ? t('checkout.pointRequired') : t('checkout.onePointNote')}
                </p>
                <Button variant="accent" className="rounded-full" onClick={() => setPickerOpen(true)}>
                  <MapPinIcon aria-hidden="true" />
                  {t('checkout.choosePoint')}
                </Button>
              </div>
            )}
          </Section>

          <Section id="checkout-recipient" icon={<UserIcon aria-hidden="true" />} title={t('checkout.recipient')}>
            <p className="-mt-2 text-sm text-muted-foreground">{t('checkout.recipientHint')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('checkout.fullName')} error={errors.fullName && t(errors.fullName)}>
                {(control) => (
                  <Input
                    {...control}
                    autoComplete="name"
                    maxLength={255}
                    value={recipient.fullName}
                    onChange={(event) => {
                      setRecipient({ ...recipient, fullName: event.target.value });
                      setErrors({ ...errors, fullName: undefined });
                    }}
                  />
                )}
              </Field>
              <Field label={t('checkout.phone')} error={errors.phone && t(errors.phone)}>
                {(control) => (
                  <Input
                    {...control}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={30}
                    placeholder="+998 90 123-45-67"
                    className="tabular-nums"
                    value={recipient.phone}
                    onChange={(event) => {
                      setRecipient({ ...recipient, phone: event.target.value });
                      setErrors({ ...errors, phone: undefined });
                    }}
                  />
                )}
              </Field>
            </div>
            <Field label={t('checkout.notes')} hint={t('checkout.notesHint')}>
              {(control) => (
                <Textarea
                  {...control}
                  rows={2}
                  maxLength={500}
                  value={recipient.notes}
                  onChange={(event) => setRecipient({ ...recipient, notes: event.target.value })}
                />
              )}
            </Field>
          </Section>

          <Section
            icon={<ShoppingBagIcon aria-hidden="true" />}
            title={t('checkout.items', { count: cart.item_count })}
            action={
              <a href="/cart" className="text-sm font-medium text-accent hover:underline">
                {t('checkout.editCart')}
              </a>
            }
          >
            {groupByShop(cart.items).map(({ shop, items }) => (
              <div key={shop.id} className="flex flex-col gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <StoreIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                  {shop.name}
                </p>
                <ul className="flex flex-col gap-3">
                  {items.map((item) => (
                    <li key={item.id} className={cn('flex gap-3', !item.available && 'opacity-60')}>
                      <span className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                        {item.product.image_url ? (
                          <img src={item.product.image_url} alt="" loading="lazy" className="size-full object-cover" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-muted-foreground">
                            <ImageIcon className="size-5" aria-hidden="true" />
                          </span>
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                        <span className="line-clamp-2">{item.product.title}</span>
                        {item.variant && (
                          <span className="text-muted-foreground">{Object.values(item.variant.attributes).join(' · ')}</span>
                        )}
                        <span className="text-muted-foreground tabular-nums">
                          {item.quantity} × {money(item.unit_price)}
                        </span>
                        {!item.available && <span className="text-destructive">{t('cart.unavailable')}</span>}
                        {item.available && !item.in_stock && <span>{t('cart.notEnoughStock')}</span>}
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">{money(item.line_total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>
        </div>

        <aside ref={summaryRef} className="flex flex-col gap-4 lg:sticky lg:top-24">
          <Section icon={<BanknoteIcon aria-hidden="true" />} title={t('checkout.payment')}>
            <div role="radiogroup" aria-label={t('checkout.payment')} className="flex flex-col gap-2">
              <div role="radio" aria-checked="true" className="flex gap-3 rounded-lg border border-accent bg-accent/10 p-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-accent">
                  <span className="size-2.5 rounded-full bg-accent" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{t('checkout.cashAtPoint')}</span>
                  <span className="text-sm text-muted-foreground">{t('checkout.cashAtPointHint')}</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{t('checkout.onlineSoon')}</p>
            </div>
          </Section>

          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('cart.itemCount', { count: cart.item_count })}</dt>
                <dd className="tabular-nums">{total}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('checkout.delivery')}</dt>
                <dd className="tabular-nums">{money('0')}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                <dt className="font-semibold">{t('checkout.toPay')}</dt>
                <dd className="text-2xl font-semibold text-primary tabular-nums">{total}</dd>
              </div>
            </dl>

            {blocked && (
              <p className="flex gap-2 rounded-md bg-warning/15 px-3 py-2 text-sm">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                <span>
                  {t('checkout.fixCart')}{' '}
                  <a href="/cart" className="font-medium text-accent hover:underline">
                    {t('checkout.editCart')}
                  </a>
                </span>
              </p>
            )}

            {changedLines.length > 0 && (
              <div role="alert" className="flex flex-col gap-2 rounded-md bg-warning/15 px-3 py-3 text-sm">
                <p className="font-medium">{t('checkout.pricesChanged')}</p>
                <ul className="flex flex-col gap-1">
                  {changedLines.map(({ change, item }) => (
                    <li key={`${change.product_id}-${change.variant_id}`} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{item?.product.title ?? `#${change.product_id}`}</span>
                      <span className="shrink-0 tabular-nums">
                        <s className="text-muted-foreground">{money(change.old_price)}</s> → {money(change.new_price)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button className="rounded-full" disabled={submit.isPending} onClick={() => onPlaceOrder(true)}>
                  {t('checkout.acceptAndPlace')}
                </Button>
              </div>
            )}

            {changedLines.length === 0 && placeButton(false)}
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <p className="text-center text-xs text-muted-foreground">{t('checkout.inspectNote')}</p>
          </div>
        </aside>
      </div>

      {/* Below lg the summary comes last: keep the total and the button in reach until it shows. */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-t border-border bg-popover/95 px-4 py-2.5 shadow-[0_-4px_12px_rgb(0_0_0/0.06)] backdrop-blur transition-transform duration-200 md:bottom-0 lg:hidden',
          summaryVisible ? 'pointer-events-none translate-y-[200%]' : 'translate-y-0',
        )}
        aria-hidden={summaryVisible}
        inert={summaryVisible}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-muted-foreground">{t('checkout.toPay')}</span>
          <span className="truncate text-lg font-semibold text-primary tabular-nums">{total}</span>
        </div>
        {placeButton(true)}
      </div>

      <PickupPointPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selected={point}
        onSelect={(next) => {
          setChosenPoint(next);
          setPointMissing(false);
        }}
      />
    </>
  );
}

function Checkout({ userName }: { userName: string | null }) {
  const { t } = useTranslation();
  const cart = useQuery({ queryKey: CART_QUERY_KEY, queryFn: fetchCart });
  // The header badge may have cached the cart already; match the server's skeleton first.
  const hydrated = useHydrated();

  if (!hydrated || cart.isPending) return <CheckoutSkeleton />;
  if (cart.isError) {
    return <ErrorState title={t('state.loadFailed')} onRetry={() => void cart.refetch()} retryLabel={t('common.retry')} />;
  }
  if (cart.data.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBagIcon aria-hidden="true" />}
        title={t('cart.emptyTitle')}
        description={t('checkout.emptyBody')}
        action={
          <Button asChild variant="accent" className="rounded-full">
            <a href="/catalog">{t('home.heroCta')}</a>
          </Button>
        }
      />
    );
  }
  return <CheckoutForm cart={cart.data} userName={userName} />;
}

export function CheckoutPage({ locale, userName }: CheckoutPageProps) {
  return (
    <AppProviders locale={locale}>
      <Checkout userName={userName} />
    </AppProviders>
  );
}
