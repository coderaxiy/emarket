// Browser-side order actions. Guide: sdk-contract/docs/orders-and-payments-api.md §1, §3.1.

import { apiClient } from './client';
import { ORDER_ENDPOINTS } from './endpoints';
import type { CancelGroupRequest } from './types';

/** Cancel one shop's part of an order. Only while it's `pending` or `confirmed`; `400` after. */
export async function cancelOrderGroup(orderId: number, groupId: number, reason: string): Promise<void> {
  // The response carries seller-only fields (task storefront-order-details); we reload instead.
  await apiClient.post(ORDER_ENDPOINTS.cancelGroup(orderId, groupId), { reason } satisfies CancelGroupRequest);
}
