// Mirrors openapi/api.yaml → CheckoutRequest, Recipient, PaymentMethod, CheckoutResponse,
// PickupPointRead, NearbyPickupPointRead, PickupPointStatus, PickupPointType, RegionRead,
// OrderRead, OrderPickupPointRead, OrderShopGroupRead, OrderLineRead, OrderStatus.
// Guides: sdk-contract/docs/orders-and-payments-api.md §2, §4 and
// logistics-and-pickup-points-api.md §2.6, §3.4, §4.

import type { Money } from './catalog';

export type PaymentMethod = 'payme' | 'click' | 'uzcard' | 'cash_on_delivery';

export interface Recipient {
  /** 1–255 chars. */
  full_name: string;
  /** 5–30 chars. The pickup point checks it when the buyer collects. */
  phone: string;
  notes?: string | null;
}

export interface CheckoutRequest {
  recipient: Recipient;
  pickup_point_id: number;
  payment_method: PaymentMethod;
}

export interface CheckoutResponse {
  order_id: number;
  order_number: string;
  /** Null for cash on delivery. Online gateways aren't connected yet (placeholder URL). */
  payment_redirect_url?: string | null;
}

/** `400` body of `POST /checkout` when a price moved since the item was added. */
export interface PriceChangedDetail {
  error: 'price_changed';
  items: { product_id: number; variant_id: number | null; old_price: Money; new_price: Money }[];
}

/** Free-form JSON on the backend; these keys are the documented ones. */
export interface PickupPointAddress {
  region?: string;
  district?: string;
  street?: string;
  landmark?: string;
  [key: string]: unknown;
}

export type PickupPointStatus = 'pending_setup' | 'active' | 'temporarily_closed' | 'closed';
export type PickupPointType = 'platform_operated' | 'partner_operated';

export interface PickupPointRead {
  id: number;
  name: string;
  address: PickupPointAddress;
  /** Decimal string. */
  latitude: string;
  longitude: string;
  type: PickupPointType;
  capacity_units: number | null;
  status: PickupPointStatus;
  /** Free-form JSON, e.g. `{ "mon": "9-18" }`. */
  operating_hours: Record<string, unknown>;
  contact_phone: string;
  region_id: number;
  created_at: string;
  updated_at: string;
}

export interface NearbyPickupPointRead extends PickupPointRead {
  distance_km: number;
}

export interface RegionRead {
  id: number;
  name: string;
  code: string | null;
}

export type OrderStatus = 'pending_payment' | 'paid' | 'partially_fulfilled' | 'completed' | 'cancelled' | 'payment_failed';

export interface OrderPickupPointRead {
  id: number;
  name: string;
  address: PickupPointAddress;
  latitude: string;
  longitude: string;
  operating_hours: Record<string, unknown>;
  contact_phone: string;
}

export interface OrderLineRead {
  id: number;
  product_id: number;
  variant_id: number | null;
  product_title_snapshot: string;
  platform_sku_snapshot: string;
  unit_price: Money;
  quantity: number;
  line_total: Money;
  /** New values may appear; render unknown ones gracefully. */
  status: string;
  physical_return_received_at: string | null;
  created_at: string;
}

export interface OrderShopGroupRead {
  id: number;
  order_id: number;
  shop_id: number;
  /** New values may appear; render unknown ones gracefully. */
  status: string;
  subtotal: Money;
  shipping_fee: Money;
  cancellation_reason: string | null;
  warehouse_received_at: string | null;
  delivered_at: string | null;
  lines: OrderLineRead[];
  created_at: string;
  updated_at: string;
}

export interface OrderRead {
  id: number;
  buyer_id: number;
  order_number: string;
  status: OrderStatus;
  total_amount: Money;
  recipient: Recipient;
  /** Null only on orders placed before pickup points were required. */
  pickup_point: OrderPickupPointRead | null;
  payment_method: PaymentMethod;
  payment_reference: string | null;
  placed_at: string | null;
  groups: OrderShopGroupRead[];
  created_at: string;
  updated_at: string;
}
