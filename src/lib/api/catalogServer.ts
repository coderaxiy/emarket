// Server-side reads of the public catalog, for `.astro` frontmatter. No cookie is
// forwarded: these endpoints are public and ignore the session.
// Guide: sdk-contract/docs/storefront-catalog-api.md.

import { parseTotalCount, toApiParams, type CatalogFilters } from '@/lib/catalog';
import { CATALOG_ENDPOINTS } from './endpoints';
import { serverFetch } from './server';
import type {
  CatalogFacetsRead,
  CategoryAttributePublicRead,
  CategoryNodeRead,
  ProductCardRead,
  ProductPublicRead,
  ShopPublicRead,
} from './types';

const TIMEOUT_MS = 5_000;
/** Matches the API's `Cache-Control: public, max-age=300` on the category tree. */
const TREE_TTL_MS = 300_000;

/** A failed catalog read. `status` 0 = network error or timeout. */
export class CatalogRequestError extends Error {
  constructor(
    readonly status: number,
    /** The API's human-readable `detail`, when it sent a string. */
    readonly detail?: string,
  ) {
    super(detail ?? `Catalog request failed (${status})`);
    this.name = 'CatalogRequestError';
  }
}

async function getJson<T>(path: string, params?: URLSearchParams): Promise<{ data: T; headers: Headers }> {
  const query = params && params.size > 0 ? `?${params.toString()}` : '';
  let response: Response;
  try {
    response = await serverFetch(`${path}${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    console.error(`[catalog] GET ${path} failed:`, error);
    throw new CatalogRequestError(0);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    throw new CatalogRequestError(response.status, typeof body?.detail === 'string' ? body.detail : undefined);
  }
  return { data: (await response.json()) as T, headers: response.headers };
}

export interface ProductPage {
  items: ProductCardRead[];
  /** From `X-Total-Count`; undefined if the header is missing. */
  total?: number;
}

export async function fetchProducts(filters: CatalogFilters): Promise<ProductPage> {
  const { data, headers } = await getJson<ProductCardRead[]>(CATALOG_ENDPOINTS.products, toApiParams(filters));
  return { items: data, total: parseTotalCount(headers.get('X-Total-Count')) };
}

/** Brands (with counts) and price range for the filter sidebar; same filters as the grid. */
export async function fetchFacets(filters: CatalogFilters): Promise<CatalogFacetsRead> {
  const { data } = await getJson<CatalogFacetsRead>(CATALOG_ENDPOINTS.facets, toApiParams(filters, { paged: false }));
  return data;
}

/** A product by its readable URL. Old (renamed) product slugs still resolve; compare slugs to redirect. */
export async function fetchProductBySlug(shopSlug: string, productSlug: string): Promise<ProductPublicRead> {
  const { data } = await getJson<ProductPublicRead>(CATALOG_ENDPOINTS.productBySlug(shopSlug, productSlug));
  return data;
}

/** A shop's public profile; 404 unless the shop is active. Shop slugs never change. */
export async function fetchShopBySlug(shopSlug: string): Promise<ShopPublicRead> {
  const { data } = await getJson<ShopPublicRead>(CATALOG_ENDPOINTS.shopBySlug(shopSlug));
  return data;
}

let treeCache: { tree: CategoryNodeRead[]; expires: number } | undefined;

/** The public category tree, cached in memory for 5 minutes (shared by all requests). */
export async function fetchCategoryTree(): Promise<CategoryNodeRead[]> {
  if (treeCache && treeCache.expires > Date.now()) return treeCache.tree;
  const { data } = await getJson<CategoryNodeRead[]>(CATALOG_ENDPOINTS.categories);
  treeCache = { tree: data, expires: Date.now() + TREE_TTL_MS };
  return data;
}

export async function fetchCategoryAttributes(categoryId: number): Promise<CategoryAttributePublicRead[]> {
  const { data } = await getJson<CategoryAttributePublicRead[]>(CATALOG_ENDPOINTS.categoryAttributes(categoryId));
  return data;
}
