// Browser-side cart calls. The cart works logged out too: without `access_token` the
// backend uses a guest cart identified by the httpOnly `cart_token` cookie, and merges
// it into the user's cart on login/register. Both cookies ride on `withCredentials`.
// Guide: sdk-contract/docs/orders-and-payments-api.md §3.1.

import { apiClient } from './client';
import { CART_ENDPOINTS } from './endpoints';
import type { CartItemAddRequest, CartItemRead, CartItemUpdateRequest, CartRead } from './types';

/** Every cart query and mutation uses this key, so one invalidation refreshes badge and page. */
export const CART_QUERY_KEY = ['cart'] as const;

export async function fetchCart(): Promise<CartRead> {
  const { data } = await apiClient.get<CartRead>(CART_ENDPOINTS.cart);
  return data;
}

/** Adding a line already in the cart adds to its quantity (server-side). */
export async function addCartItem(body: CartItemAddRequest): Promise<CartItemRead> {
  const { data } = await apiClient.post<CartItemRead>(CART_ENDPOINTS.items, body);
  return data;
}

/** Sets the quantity. Also moves `price_snapshot` to the current price: that's how a buyer accepts a changed price. */
export async function updateCartItem(cartItemId: number, quantity: number): Promise<CartItemRead> {
  const { data } = await apiClient.patch<CartItemRead>(CART_ENDPOINTS.item(cartItemId), { quantity } satisfies CartItemUpdateRequest);
  return data;
}

export async function removeCartItem(cartItemId: number): Promise<void> {
  await apiClient.delete(CART_ENDPOINTS.item(cartItemId));
}
