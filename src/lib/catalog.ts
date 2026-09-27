// Catalog filters: one shape, read from the page URL and turned into `GET /products`
// params. The API wants repeated keys (`brand_id=3&brand_id=7`), which axios doesn't
// produce from arrays by default, so pass the URLSearchParams from `toApiParams` as-is.

import { pickTranslation, type Locale } from '@/i18n';
import type { CatalogSort, CategoryNodeRead } from '@/lib/api/types';

export const PAGE_SIZE = 24;

const SORTS: readonly CatalogSort[] = ['relevance', 'newest', 'price_asc', 'price_desc'];
const AMOUNT_RE = /^\d{1,12}$/;

export interface CatalogFilters {
  q: string;
  /** From the route (`/catalog/{slug}`), not the query string. */
  categoryId?: number;
  /** From the route (shop page), not the query string. */
  shopId?: number;
  brandIds: number[];
  /** Whole UZS as typed by the buyer. */
  priceMin?: string;
  priceMax?: string;
  inStock: boolean;
  /** Attribute key → selected raw values. */
  attrs: Record<string, string[]>;
  /** Undefined = the API default (relevance with `q`, else newest). */
  sort?: CatalogSort;
  /** 1-based. */
  page: number;
}

function positiveInt(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return number > 0 ? number : undefined;
}

/** Page URL (`?q=&brand=&min=&max=&in_stock=1&attr=key:value&sort=&page=`) → filters. */
export function filtersFromUrl(params: URLSearchParams): CatalogFilters {
  const attrs: Record<string, string[]> = {};
  for (const raw of params.getAll('attr')) {
    const colon = raw.indexOf(':');
    if (colon <= 0 || colon === raw.length - 1) continue;
    const key = raw.slice(0, colon);
    (attrs[key] ??= []).push(raw.slice(colon + 1));
  }
  const sort = params.get('sort');
  const min = params.get('min');
  const max = params.get('max');
  return {
    q: params.get('q')?.trim() ?? '',
    brandIds: [...new Set(params.getAll('brand').map(positiveInt).filter((id) => id !== undefined))],
    priceMin: min && AMOUNT_RE.test(min) ? min : undefined,
    priceMax: max && AMOUNT_RE.test(max) ? max : undefined,
    inStock: params.get('in_stock') === '1',
    attrs,
    sort: SORTS.includes(sort as CatalogSort) ? (sort as CatalogSort) : undefined,
    page: positiveInt(params.get('page')) ?? 1,
  };
}

/** Filters → page URL query. Route-level filters (category, shop) are left out. */
export function filtersToUrl(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  for (const id of filters.brandIds) params.append('brand', String(id));
  if (filters.priceMin) params.set('min', filters.priceMin);
  if (filters.priceMax) params.set('max', filters.priceMax);
  if (filters.inStock) params.set('in_stock', '1');
  for (const [key, values] of Object.entries(filters.attrs)) {
    for (const value of values) params.append('attr', `${key}:${value}`);
  }
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

/**
 * Filters → `GET /products` params (or `/products/facets` with `paged: false`).
 * `attr` is only sent with a category: the API rejects it otherwise.
 */
export function toApiParams(filters: CatalogFilters, { paged = true } = {}): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.categoryId !== undefined) params.set('category_id', String(filters.categoryId));
  if (filters.shopId !== undefined) params.set('shop_id', String(filters.shopId));
  for (const id of filters.brandIds) params.append('brand_id', String(id));
  if (filters.priceMin) params.set('price_min', filters.priceMin);
  if (filters.priceMax) params.set('price_max', filters.priceMax);
  if (filters.inStock) params.set('in_stock', 'true');
  if (filters.categoryId !== undefined) {
    for (const [key, values] of Object.entries(filters.attrs)) {
      for (const value of values) params.append('attr', `${key}:${value}`);
    }
  }
  if (paged) {
    if (filters.sort) params.set('sort', filters.sort);
    params.set('skip', String((filters.page - 1) * PAGE_SIZE));
    params.set('limit', String(PAGE_SIZE));
  }
  return params;
}

/** `X-Total-Count` from `GET /products`; undefined if missing or malformed. */
export function parseTotalCount(value: string | null | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  return Number(value);
}

// --- Category tree (GET /categories, cached) ---

/** Localized name, falling back to the slug when no translation exists. */
export function categoryName(
  category: { slug: string; translations: readonly { locale: string; name: string }[] },
  locale: Locale,
): string {
  return pickTranslation(category.translations, locale)?.name ?? category.slug;
}

/** Find a category by slug; `path` is root → the category itself. */
export function findCategory(
  tree: readonly CategoryNodeRead[],
  slug: string,
): { category: CategoryNodeRead; path: CategoryNodeRead[] } | undefined {
  for (const node of tree) {
    if (node.slug === slug) return { category: node, path: [node] };
    const found = findCategory(node.children, slug);
    if (found) return { category: found.category, path: [node, ...found.path] };
  }
  return undefined;
}

/** Drop branches with no visible products, for menus. */
export function nonEmptyCategories(tree: readonly CategoryNodeRead[]): CategoryNodeRead[] {
  return tree
    .filter((node) => node.product_count > 0)
    .map((node) => ({ ...node, children: nonEmptyCategories(node.children) }));
}
