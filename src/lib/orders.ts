// Buyer-facing wording and rules for orders and their per-shop groups, shared by the
// orders list and the order page. docs/orders-and-payments-api.md §1.

import type { TranslationKey } from '@/i18n';
import type { OrderRead, OrderShopGroupRead, OrderStatus } from '@/lib/api/types';

export type Tone = 'accent' | 'success' | 'warning' | 'destructive' | 'neutral';

export const ORDER_STATUS: Record<OrderStatus, { label: TranslationKey; tone: Tone }> = {
  pending_payment: { label: 'order.statusPendingPayment', tone: 'warning' },
  // Cash on delivery orders are `paid` right after checkout: "confirmed" is what's true for the buyer.
  paid: { label: 'order.statusConfirmed', tone: 'accent' },
  partially_fulfilled: { label: 'order.statusPartlyCollected', tone: 'accent' },
  completed: { label: 'order.statusCompleted', tone: 'success' },
  cancelled: { label: 'order.statusCancelled', tone: 'neutral' },
  payment_failed: { label: 'order.statusPaymentFailed', tone: 'destructive' },
};

export type OrderTab = 'all' | 'active' | 'completed' | 'cancelled';
export const ORDER_TABS: OrderTab[] = ['all', 'active', 'completed', 'cancelled'];

export function orderTab(status: OrderStatus): Exclude<OrderTab, 'all'> {
  if (status === 'completed') return 'completed';
  if (status === 'cancelled' || status === 'payment_failed') return 'cancelled';
  return 'active';
}

/** The tracker's steps, in order. A group has completed `groupProgress(group)` of them. */
export const GROUP_STEPS: TranslationKey[] = [
  'order.stepConfirmed',
  'order.stepPreparing',
  'order.stepAtWarehouse',
  'order.stepOnTheWay',
  'order.stepAtPoint',
  'order.stepCollected',
];

const GROUP: Record<string, { label: TranslationKey; tone: Tone; progress?: number }> = {
  pending: { label: 'order.groupPending', tone: 'warning', progress: 0 },
  confirmed: { label: 'order.groupConfirmed', tone: 'accent', progress: 1 },
  preparing: { label: 'order.groupPreparing', tone: 'accent', progress: 2 },
  at_warehouse: { label: 'order.groupAtWarehouse', tone: 'accent', progress: 3 },
  shipped: { label: 'order.groupShipped', tone: 'accent', progress: 4 },
  arrived_at_point: { label: 'order.groupReady', tone: 'success', progress: 5 },
  partially_collected: { label: 'order.groupPartlyCollected', tone: 'success', progress: 5 },
  delivered: { label: 'order.groupCollected', tone: 'success', progress: 6 },
  return_requested: { label: 'order.groupReturnRequested', tone: 'warning', progress: 6 },
  partially_refunded: { label: 'order.groupPartlyRefunded', tone: 'neutral', progress: 6 },
  refunded: { label: 'order.groupRefunded', tone: 'neutral', progress: 6 },
  // Off the happy path: no tracker.
  cancelled: { label: 'order.groupCancelled', tone: 'neutral' },
  rejected_by_buyer: { label: 'order.groupRejected', tone: 'neutral' },
  return_to_seller: { label: 'order.groupReturnedToShop', tone: 'neutral' },
};

/** Label and tone for a group status; unknown values fall back to a neutral label. */
export function groupStatus(status: string): { label: TranslationKey; tone: Tone } {
  return GROUP[status] ?? { label: 'order.groupUnknown', tone: 'neutral' };
}

/** Completed tracker steps (0–6), or undefined when the group left the happy path. */
export function groupProgress(group: Pick<OrderShopGroupRead, 'status'>): number | undefined {
  return GROUP[group.status]?.progress;
}

/** Free cancellation only before the shop starts preparing (the API 400s otherwise). */
export function canCancelGroup(group: Pick<OrderShopGroupRead, 'status'>): boolean {
  return group.status === 'pending' || group.status === 'confirmed';
}

/** The pickup point holds this group's items: show "ready" and the deadline. */
export function isAtPickupPoint(group: Pick<OrderShopGroupRead, 'status'>): boolean {
  return group.status === 'arrived_at_point' || group.status === 'partially_collected';
}

export function orderItemCount(order: Pick<OrderRead, 'groups'>): number {
  return order.groups.reduce((sum, group) => sum + group.lines.reduce((count, line) => count + line.quantity, 0), 0);
}
