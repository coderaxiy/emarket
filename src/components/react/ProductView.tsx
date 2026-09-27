import { useMutation } from '@tanstack/react-query';
import { ImageIcon, MinusIcon, PlusIcon, ShoppingBagIcon, StoreIcon } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import type { Locale } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { addCartItem, CART_QUERY_KEY } from '@/lib/api/cart';
import { apiErrorMessage } from '@/lib/api/errors';
import { queryClient } from '@/lib/api/queryClient';
import type { ProductPublicRead, ProductPublicVariantRead } from '@/lib/api/types';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AppProviders } from './AppProviders';

// Top of the product page: gallery, variant picker, price, quantity and "Add to cart".
// One island because the chosen variant drives the photos, price, stock and SKU.

/** A variant-defining attribute, with its values as strings (as shown and compared). */
export interface VariantAxis {
  key: string;
  label: string;
  options: string[];
}

export type ProductViewData = Pick<
  ProductPublicRead,
  'id' | 'title' | 'has_variants' | 'price_min' | 'in_stock' | 'platform_sku' | 'variants' | 'shop' | 'brand'
> & { images: { id: number; url: string }[] };

interface ProductViewProps {
  locale: Locale;
  product: ProductViewData;
  axes: VariantAxis[];
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

function Gallery({ images, title }: { images: { id: number; url: string }[]; title: string }) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(images[0]?.id);
  const active = images.find((image) => image.id === activeId) ?? images[0];

  if (!active) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <ImageIcon className="size-12" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square overflow-hidden rounded-xl bg-muted">
        <img src={active.url} alt={title} className="size-full object-contain" fetchPriority="high" />
      </div>
      {images.length > 1 && (
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {images.map((image, index) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveId(image.id)}
                aria-label={t('product.showPhoto', { index: index + 1 })}
                aria-current={image.id === active.id}
                className={cn(
                  'block size-16 cursor-pointer overflow-hidden rounded-md border-2 bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  image.id === active.id ? 'border-accent' : 'border-transparent hover:border-border',
                )}
              >
                <img src={image.url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function View({ product, axes }: Omit<ProductViewProps, 'locale'>) {
  const { t, intlLocale } = useTranslation();
  const { variants } = product;
  const [selection, setSelection] = useState<Selection>(() =>
    selectionOf(variants.find((variant) => variant.in_stock) ?? variants[0], axes),
  );
  const [quantity, setQuantity] = useState(1);

  const variant = product.has_variants ? findVariant(variants, selection, axes) : undefined;
  const price = variant?.price ?? product.price_min;
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
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast({ variant: 'success', title: t('product.addedToCart'), description: product.title });
    },
    onError: (error) => toast({ variant: 'error', title: apiErrorMessage(error, t('product.addFailed')) }),
  });

  const canAdd = inStock && (!product.has_variants || variant !== undefined);

  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-10">
      <Gallery key={variant?.id ?? 'product'} images={images} title={product.title} />

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          {product.brand && <p className="text-sm font-medium text-accent">{product.brand.name}</p>}
          <h1 className="font-display text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
            {product.title}
          </h1>
          {sku && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {t('product.article')}: {sku}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-3xl font-semibold text-primary tabular-nums">{formatMoney(price, intlLocale)}</p>
          <Badge variant={inStock ? 'success' : 'neutral'}>{inStock ? t('product.inStock') : t('catalog.outOfStock')}</Badge>
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
                      'inline-flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-full border px-4 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 items-center rounded-full border border-border bg-card">
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
            <output aria-live="polite" aria-label={t('product.quantity')} className="w-8 text-center font-medium tabular-nums">
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
          <Button
            size="lg"
            className="min-w-48 flex-1 rounded-full"
            disabled={!canAdd || addToCart.isPending}
            onClick={() => addToCart.mutate()}
          >
            <ShoppingBagIcon aria-hidden="true" />
            {inStock ? t('product.addToCart') : t('catalog.outOfStock')}
          </Button>
        </div>

        <a
          href={`/shops/${encodeURIComponent(product.shop.slug)}`}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
            {product.shop.logo_url ? (
              <img src={product.shop.logo_url} alt="" className="size-full object-cover" loading="lazy" />
            ) : (
              <StoreIcon className="size-5" aria-hidden="true" />
            )}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground">{t('product.soldBy')}</span>
            <span className="truncate text-sm font-medium">{product.shop.name}</span>
          </span>
        </a>
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
