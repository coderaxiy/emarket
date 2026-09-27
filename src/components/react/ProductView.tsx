import { useMutation } from '@tanstack/react-query';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  MapPinIcon,
  MinusIcon,
  PlusIcon,
  SearchCheckIcon,
  ShoppingBagIcon,
  StoreIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import type { Locale } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { addCartItem, CART_QUERY_KEY, fetchCart } from '@/lib/api/cart';
import { apiErrorMessage } from '@/lib/api/errors';
import { queryClient } from '@/lib/api/queryClient';
import type { ProductPublicRead, ProductPublicVariantRead } from '@/lib/api/types';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AppProviders } from './AppProviders';

// Top of the product page, marketplace-style: gallery | info with key specs | buy box
// (sticky on desktop), plus a sticky price bar on small screens once the main button
// scrolls away. One island because the chosen variant drives photos, price, stock and
// article. Only real data: no ratings, discounts or delivery dates.

/** A variant-defining attribute, with its values as strings (as shown and compared). */
export interface VariantAxis {
  key: string;
  label: string;
  options: string[];
}

/** A spec row, already localized and formatted by the page. */
export interface SpecRow {
  label: string;
  value: string;
}

export type ProductViewData = Pick<
  ProductPublicRead,
  'id' | 'title' | 'has_variants' | 'price_min' | 'in_stock' | 'platform_sku' | 'variants' | 'shop' | 'brand'
> & { images: { id: number; url: string }[] };

interface ProductViewProps {
  locale: Locale;
  product: ProductViewData;
  axes: VariantAxis[];
  /** The first few specs, shown next to the gallery. */
  keySpecs: SpecRow[];
  /** More specs than `keySpecs` exist further down the page (`#specs`). */
  moreSpecs: boolean;
}

type Selection = Record<string, string>;

const MAX_QUANTITY = 99;

const valueOf = (variant: ProductPublicVariantRead, key: string) => String(variant.attributes[key] ?? '');

function selectionOf(variant: ProductPublicVariantRead | undefined, axes: VariantAxis[]): Selection {
  return variant ? Object.fromEntries(axes.map((axis) => [axis.key, valueOf(variant, axis.key)])) : {};
}

function findVariant(variants: ProductPublicVariantRead[], selection: Selection, axes: VariantAxis[]) {
  return variants.find((variant) => axes.every((axis) => valueOf(variant, axis.key) === selection[axis.key]));
}

// --- Gallery ---------------------------------------------------------------------

function Gallery({ images, title }: { images: { id: number; url: string }[]; title: string }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const active = images[index] ?? images[0];

  if (!active) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <ImageIcon className="size-12" aria-hidden="true" />
      </div>
    );
  }

  const step = (delta: number) => setIndex((index + delta + images.length) % images.length);
  const arrow =
    'absolute top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-card/90 text-foreground shadow-md transition-opacity hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100';

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <ul className="-mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:max-h-[32rem] sm:flex-col sm:overflow-x-visible sm:overflow-y-auto sm:px-0 sm:pb-0">
          {images.map((image, position) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(position)}
                aria-label={t('product.showPhoto', { index: position + 1 })}
                aria-current={position === index}
                className={cn(
                  'block h-16 w-14 cursor-pointer overflow-hidden rounded-md border-2 bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  position === index ? 'border-accent' : 'border-transparent hover:border-border',
                )}
              >
                <img src={image.url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="group relative aspect-[4/5] min-w-0 flex-1 overflow-hidden rounded-xl bg-muted">
        <img src={active.url} alt={title} className="size-full object-contain" fetchPriority="high" />
        {images.length > 1 && (
          <>
            <button type="button" aria-label={t('product.previousPhoto')} onClick={() => step(-1)} className={cn(arrow, 'left-3')}>
              <ChevronLeftIcon className="size-5" aria-hidden="true" />
            </button>
            <button type="button" aria-label={t('product.nextPhoto')} onClick={() => step(1)} className={cn(arrow, 'right-3')}>
              <ChevronRightIcon className="size-5" aria-hidden="true" />
            </button>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card/90 px-2.5 py-0.5 text-xs font-medium tabular-nums shadow-sm">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// --- Page top --------------------------------------------------------------------

function View({ product, axes, keySpecs, moreSpecs }: Omit<ProductViewProps, 'locale'>) {
  const { t, intlLocale } = useTranslation();
  const { variants } = product;
  const [selection, setSelection] = useState<Selection>(() =>
    selectionOf(variants.find((variant) => variant.in_stock) ?? variants[0], axes),
  );
  const [quantity, setQuantity] = useState(1);
  const buyButtonRef = useRef<HTMLButtonElement>(null);
  const [buyButtonVisible, setBuyButtonVisible] = useState(true);

  useEffect(() => {
    const button = buyButtonRef.current;
    if (!button) return;
    const observer = new IntersectionObserver(([entry]) => setBuyButtonVisible(entry?.isIntersecting ?? true));
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  const variant = product.has_variants ? findVariant(variants, selection, axes) : undefined;
  const price = formatMoney(variant?.price ?? product.price_min, intlLocale);
  const inStock = product.has_variants ? (variant?.in_stock ?? false) : product.in_stock;
  const sku = variant?.platform_sku ?? product.platform_sku;

  // The chosen variant's own photos first, then the rest.
  const variantImageIds = variant?.image_ids ?? [];
  const images = [
    ...product.images.filter((image) => variantImageIds.includes(image.id)),
    ...product.images.filter((image) => !variantImageIds.includes(image.id)),
  ];

  function choose(key: string, value: string) {
    const next = { ...selection, [key]: value };
    if (findVariant(variants, next, axes)) {
      setSelection(next);
      return;
    }
    // No variant has this exact combination: jump to one with the chosen value.
    const candidates = variants.filter((entry) => valueOf(entry, key) === value);
    setSelection(selectionOf(candidates.find((entry) => entry.in_stock) ?? candidates[0], axes));
  }

  /** `other`: exists only with a different choice on another axis. */
  function optionState(key: string, value: string): 'available' | 'soldOut' | 'other' {
    const matches = variants.filter(
      (entry) =>
        valueOf(entry, key) === value &&
        axes.every((axis) => axis.key === key || valueOf(entry, axis.key) === selection[axis.key]),
    );
    if (matches.length === 0) return 'other';
    return matches.some((entry) => entry.in_stock) ? 'available' : 'soldOut';
  }

  const addToCart = useMutation({
    mutationFn: () => addCartItem({ product_id: product.id, variant_id: variant?.id ?? null, quantity }),
    onSuccess: () => {
      // fetchQuery, not invalidate: badges may be disabled (no cart before this add) and
      // still read the cache.
      void queryClient.fetchQuery({ queryKey: CART_QUERY_KEY, queryFn: fetchCart, staleTime: 0 });
      toast({ variant: 'success', title: t('product.addedToCart'), description: product.title });
    },
    onError: (error) => toast({ variant: 'error', title: apiErrorMessage(error, t('product.addFailed')) }),
  });

  const canAdd = inStock && (!product.has_variants || variant !== undefined) && !addToCart.isPending;
  const addLabel = inStock ? t('product.addToCart') : t('catalog.outOfStock');
  const shopHref = `/shops/${encodeURIComponent(product.shop.slug)}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <Gallery key={variant?.id ?? 'product'} images={images} title={product.title} />

        {/* Info column */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            {product.brand && <p className="text-sm font-medium text-accent">{product.brand.name}</p>}
            <h1 className="font-display text-xl leading-tight font-semibold tracking-tight text-balance sm:text-2xl">
              {product.title}
            </h1>
          </div>

          {axes.map((axis) => (
            <div key={axis.key} className="flex flex-col gap-2">
              <p id={`axis-${axis.key}`} className="text-sm">
                <span className="text-muted-foreground">{axis.label}: </span>
                <span className="font-medium">{selection[axis.key]}</span>
              </p>
              <div role="radiogroup" aria-labelledby={`axis-${axis.key}`} className="flex flex-wrap gap-2">
                {axis.options.map((option) => {
                  const state = optionState(axis.key, option);
                  const checked = selection[axis.key] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      onClick={() => choose(axis.key, option)}
                      className={cn(
                        'inline-flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-lg border px-4 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        checked
                          ? 'border-accent bg-accent/10 font-medium text-accent ring-1 ring-accent'
                          : 'border-border bg-card hover:border-accent',
                        state === 'soldOut' && 'text-muted-foreground line-through',
                        state === 'other' && !checked && 'border-dashed text-muted-foreground',
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {(sku || keySpecs.length > 0) && (
            <div className="flex flex-col gap-2">
              <dl className="flex flex-col gap-1.5 text-sm">
                {sku && (
                  <div className="flex items-baseline gap-2">
                    <dt className="shrink-0 text-muted-foreground">{t('product.article')}</dt>
                    <span className="flex-1 border-b border-dotted border-border" aria-hidden="true" />
                    <dd className="text-right tabular-nums">{sku}</dd>
                  </div>
                )}
                {keySpecs.map((spec) => (
                  <div key={spec.label} className="flex items-baseline gap-2">
                    <dt className="shrink-0 text-muted-foreground">{spec.label}</dt>
                    <span className="flex-1 border-b border-dotted border-border" aria-hidden="true" />
                    <dd className="max-w-[60%] text-right tabular-nums">{spec.value}</dd>
                  </div>
                ))}
              </dl>
              {moreSpecs && (
                <a href="#specs" className="w-fit text-sm font-medium text-accent hover:underline">
                  {t('product.allSpecs')}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Buy box */}
      <aside className="flex flex-col gap-3 lg:sticky lg:top-24">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-3xl font-semibold text-primary tabular-nums">{price}</p>
            <Badge variant={inStock ? 'success' : 'neutral'}>{inStock ? t('product.inStock') : t('catalog.outOfStock')}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch">
            <div className="flex h-12 shrink-0 items-center justify-between rounded-full border border-border bg-background">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label={t('product.decrease')}
                disabled={quantity <= 1}
                onClick={() => setQuantity(quantity - 1)}
              >
                <MinusIcon />
              </Button>
              <output aria-live="polite" aria-label={t('product.quantity')} className="w-7 text-center font-medium tabular-nums">
                {quantity}
              </output>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label={t('product.increase')}
                disabled={quantity >= MAX_QUANTITY}
                onClick={() => setQuantity(quantity + 1)}
              >
                <PlusIcon />
              </Button>
            </div>
            <Button ref={buyButtonRef} size="lg" className="min-w-40 flex-1 rounded-full lg:flex-none" disabled={!canAdd} onClick={() => addToCart.mutate()}>
              <ShoppingBagIcon aria-hidden="true" />
              {addLabel}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
              {product.shop.logo_url ? (
                <img src={product.shop.logo_url} alt="" className="size-full object-cover" loading="lazy" />
              ) : (
                <StoreIcon className="size-5" aria-hidden="true" />
              )}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-xs text-muted-foreground">{t('product.soldBy')}</span>
              <span className="truncate font-medium">{product.shop.name}</span>
            </span>
          </div>
          <Button asChild variant="secondary" className="rounded-full">
            <a href={shopHref}>{t('product.goToShop')}</a>
          </Button>
        </div>

        <ul className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-sm">
          <li className="flex gap-3">
            <MapPinIcon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
            <span className="flex flex-col">
              <span className="font-medium">{t('product.pickupTitle')}</span>
              <span className="text-muted-foreground">{t('product.pickupBody')}</span>
            </span>
          </li>
          <li className="flex gap-3">
            <SearchCheckIcon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
            <span className="flex flex-col">
              <span className="font-medium">{t('product.inspectTitle')}</span>
              <span className="text-muted-foreground">{t('product.inspectBody')}</span>
            </span>
          </li>
        </ul>
      </aside>

      {/* Small screens: price + add to cart stay in reach once the main button scrolls away. */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-t border-border bg-popover/95 px-4 py-2.5 shadow-[0_-4px_12px_rgb(0_0_0/0.06)] backdrop-blur transition-transform duration-200 md:bottom-0 lg:hidden',
          buyButtonVisible ? 'pointer-events-none translate-y-[200%]' : 'translate-y-0',
        )}
        aria-hidden={buyButtonVisible}
      >
        <p className="min-w-0 flex-1 truncate text-lg font-semibold text-primary tabular-nums">{price}</p>
        <Button
          className="rounded-full"
          disabled={!canAdd}
          tabIndex={buyButtonVisible ? -1 : undefined}
          onClick={() => addToCart.mutate()}
        >
          <ShoppingBagIcon aria-hidden="true" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

export function ProductView({ locale, ...props }: ProductViewProps) {
  return (
    <AppProviders locale={locale}>
      <View {...props} />
    </AppProviders>
  );
}
