// Browser-side reads of the public catalog: the category tree for the header menu and
// search suggestions. Server pages use catalogServer.ts instead.
// Guide: sdk-contract/docs/storefront-catalog-api.md.

import { apiClient } from './client';
import { CATALOG_ENDPOINTS } from './endpoints';
import type { CategoryNodeRead, ProductCardRead } from './types';

/** Matches the API's `Cache-Control: public, max-age=300`. */
export const CATEGORY_TREE_STALE_MS = 300_000;
export const CATEGORY_TREE_QUERY_KEY = ['categories', 'tree'] as const;

export async function fetchCategoryTreeClient(): Promise<CategoryNodeRead[]> {
  const { data } = await apiClient.get<CategoryNodeRead[]>(CATALOG_ENDPOINTS.categories);
  return data;
}

/** A few matching products for the search box's suggestions. */
export async function fetchProductSuggestions(q: string, limit: number, signal?: AbortSignal): Promise<ProductCardRead[]> {
  const { data } = await apiClient.get<ProductCardRead[]>(CATALOG_ENDPOINTS.products, {
    params: { q, limit, sort: 'relevance' },
    signal,
  });
  return data;
}
