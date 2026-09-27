// Mirrors openapi/api.yaml → CartRead, CartItemRead, CartProductRead, CartVariantRead,
// CartStatus, CartItemAddRequest, CartItemUpdateRequest.
// Guide: sdk-contract/docs/orders-and-payments-api.md §3.1 (incl. guest cart) and §4.

import type { Money, ShopSummaryRead } from './catalog';

export type CartStatus = 'active' | 'checked_out' | 'abandoned';

export interface CartProductRead {
  id: number;
  slug: string;
  title: string;
  image_url: string | null;
}

export interface CartVariantRead {
  id: number;
  attributes: Record<string, string | number | boolean>;
}

export interface CartItemRead {
  id: number;
  quantity: number;
  added_at: string;
  product: CartProductRead;
  variant: CartVariantRead | null;
  shop: ShopSummaryRead;
  /** Price when added, or when the quantity was last PATCHed. */
  price_snapshot: Money;
  /** Current price: what checkout will charge. */
  unit_price: Money;
  line_total: Money;
  /** False when the product, its shop or its variant can't be bought any more. */
  available: boolean;
  in_stock: boolean;
}

export interface CartRead {
  id: number;
  status: CartStatus;
  /** Ordered by `added_at`. */
  items: CartItemRead[];
  /** Sum of quantities over all lines, for the header badge. */
  item_count: number;
  /** Sum of `line_total` over available lines only. */
  subtotal: Money;
  created_at: string;
  updated_at: string;
}

export interface CartItemAddRequest {
  product_id: number;
  variant_id?: number | null;
  quantity: number;
}

export interface CartItemUpdateRequest {
  quantity: number;
}
