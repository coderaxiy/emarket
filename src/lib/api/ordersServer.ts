// Server-side reads of the buyer's orders, for `.astro` frontmatter. Orders need the
// session, so pass the incoming `Cookie` header.
// Guide: sdk-contract/docs/orders-and-payments-api.md §3.1, §4.

import { ORDER_ENDPOINTS } from './endpoints';
import { serverFetch } from './server';
import type { OrderRead, PickupStatusRead } from './types';

const TIMEOUT_MS = 5_000;

export type OrderResult = { status: 'ok'; order: OrderRead } | { status: 'notFound' } | { status: 'unauthorized' } | { status: 'failed' };

export async function fetchOrder(orderId: number, cookie: string | null): Promise<OrderResult> {
  try {
    const response = await serverFetch(ORDER_ENDPOINTS.order(orderId), { cookie, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (response.status === 401) return { status: 'unauthorized' };
    // 403 (someone else's order) looks the same as a missing one to the buyer.
    if (response.status === 404 || response.status === 403) return { status: 'notFound' };
    if (!response.ok) return { status: 'failed' };
    return { status: 'ok', order: (await response.json()) as OrderRead };
  } catch (error) {
    console.error(`[orders] GET /orders/${orderId} failed:`, error);
    return { status: 'failed' };
  }
}

export type OrdersResult = { status: 'ok'; orders: OrderRead[] } | { status: 'unauthorized' } | { status: 'failed' };

/** The buyer's orders, newest first (the API doesn't paginate yet). */
export async function fetchOrders(cookie: string | null): Promise<OrdersResult> {
  try {
    const response = await serverFetch(ORDER_ENDPOINTS.orders, { cookie, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (response.status === 401) return { status: 'unauthorized' };
    if (!response.ok) return { status: 'failed' };
    return { status: 'ok', orders: (await response.json()) as OrderRead[] };
  } catch (error) {
    console.error('[orders] GET /orders failed:', error);
    return { status: 'failed' };
  }
}

/** Pickup status of one group; undefined when it hasn't reached the point yet (404) or on failure. */
export async function fetchPickupStatus(orderId: number, groupId: number, cookie: string | null): Promise<PickupStatusRead | undefined> {
  try {
    const response = await serverFetch(ORDER_ENDPOINTS.pickupStatus(orderId, groupId), {
      cookie,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok ? ((await response.json()) as PickupStatusRead) : undefined;
  } catch (error) {
    console.error(`[orders] pickup-status ${orderId}/${groupId} failed:`, error);
    return undefined;
  }
}
