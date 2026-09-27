// Server-side reads of the buyer's orders, for `.astro` frontmatter. Orders need the
// session, so pass the incoming `Cookie` header.
// Guide: sdk-contract/docs/orders-and-payments-api.md §3.1, §4.

import { ORDER_ENDPOINTS } from './endpoints';
import { serverFetch } from './server';
import type { OrderRead } from './types';

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
