// Display helpers for pickup points. `address` and `operating_hours` are free-form JSON on
// the backend, so read only the documented keys and skip anything unexpected.

import type { PickupPointAddress } from '@/lib/api/types';

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/** "Street 7, Yunusobod, Toshkent" — most specific first. */
export function formatAddress(address: PickupPointAddress): string {
  return [address.street, address.district, address.region].map(text).filter(Boolean).join(', ');
}

export function addressLandmark(address: PickupPointAddress): string | undefined {
  return text(address.landmark);
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/**
 * Today's hours, e.g. "9–18", from `{ "mon": "9-18", ... }`; undefined when unknown.
 * Uses the viewer's clock: call it in the browser only, not in server-rendered markup.
 */
export function todaysHours(hours: Record<string, unknown>, now = new Date()): string | undefined {
  return text(hours[DAY_KEYS[now.getDay()]])?.replace('-', '–');
}
