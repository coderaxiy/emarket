// Browser-side calls for checkout: pickup points, regions, placing the order.
// Guides: sdk-contract/docs/orders-and-payments-api.md §2 and
// logistics-and-pickup-points-api.md §2.6.

import { isAxiosError } from 'axios';
import { apiClient } from './client';
import { ORDER_ENDPOINTS, PICKUP_ENDPOINTS } from './endpoints';
import type {
  CheckoutRequest,
  CheckoutResponse,
  NearbyPickupPointRead,
  PickupPointRead,
  PriceChangedDetail,
  RegionRead,
} from './types';

/** Search radius for "near me". The API default; wide enough for a city and its outskirts. */
const NEARBY_RADIUS_KM = 25;

export async function fetchLastUsedPickupPoint(): Promise<PickupPointRead | null> {
  const { data } = await apiClient.get<PickupPointRead | null>(PICKUP_ENDPOINTS.lastUsed);
  return data;
}

export async function fetchRegions(): Promise<RegionRead[]> {
  const { data } = await apiClient.get<RegionRead[]>(PICKUP_ENDPOINTS.regions);
  return data;
}

export async function fetchPickupPoints(regionId: number): Promise<PickupPointRead[]> {
  const { data } = await apiClient.get<PickupPointRead[]>(PICKUP_ENDPOINTS.pickupPoints, {
    params: { region_id: regionId },
  });
  return data;
}

export async function fetchNearbyPickupPoints(lat: number, lng: number): Promise<NearbyPickupPointRead[]> {
  const { data } = await apiClient.get<NearbyPickupPointRead[]>(PICKUP_ENDPOINTS.nearby, {
    params: { lat, lng, radius_km: NEARBY_RADIUS_KM },
  });
  return data;
}

export async function placeOrder(body: CheckoutRequest): Promise<CheckoutResponse> {
  const { data } = await apiClient.post<CheckoutResponse>(ORDER_ENDPOINTS.checkout, body);
  return data;
}

/** The structured `400` checkout sends when prices moved; undefined for any other error. */
export function priceChangedDetail(error: unknown): PriceChangedDetail | undefined {
  if (!isAxiosError(error) || error.response?.status !== 400) return undefined;
  const detail: unknown = error.response.data?.detail;
  if (typeof detail === 'object' && detail !== null && (detail as { error?: unknown }).error === 'price_changed') {
    return detail as PriceChangedDetail;
  }
  return undefined;
}
