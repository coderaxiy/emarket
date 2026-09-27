// Every API path lives here, grouped per resource. Paths are relative to
// PUBLIC_API_BASE_URL, which already includes `/api/v1`. Never hardcode a path in a component.

const seg = encodeURIComponent;

export const AUTH_ENDPOINTS = {
  register: '/auth/register',
  login: '/auth/login',
  logout: '/auth/logout',
  me: '/auth/me',
} as const;

/** Public, no auth. docs/storefront-catalog-api.md */
export const CATALOG_ENDPOINTS = {
  /** `ProductCardRead[]`; total in the `X-Total-Count` header. */
  products: '/products',
  facets: '/products/facets',
  product: (productId: number) => `/products/${productId}`,
  productBySlug: (shopSlug: string, productSlug: string) =>
    `/shops/by-slug/${seg(shopSlug)}/products/${seg(productSlug)}`,
  categories: '/categories',
  categoryAttributes: (categoryId: number) => `/categories/${categoryId}/attributes`,
  brands: '/brands',
  shopBySlug: (shopSlug: string) => `/shops/by-slug/${seg(shopSlug)}`,
} as const;

/** Works logged out too (guest cart via the `cart_token` cookie). */
export const CART_ENDPOINTS = {
  cart: '/cart',
  items: '/cart/items',
  item: (cartItemId: number) => `/cart/items/${cartItemId}`,
} as const;

/** Login required, except `nearby`. docs/logistics-and-pickup-points-api.md §3.4 */
export const PICKUP_ENDPOINTS = {
  regions: '/regions',
  /** `?region_id=`; active points only. */
  pickupPoints: '/pickup-points',
  /** `PickupPointRead | null`: the point on the buyer's previous order, if still active. */
  lastUsed: '/pickup-points/last-used',
  /** Public. `?lat=&lng=&radius_km=` */
  nearby: '/pickup-points/nearby',
} as const;

/** docs/orders-and-payments-api.md §2, §3.1 */
export const ORDER_ENDPOINTS = {
  checkout: '/checkout',
  orders: '/orders',
  order: (orderId: number) => `/orders/${orderId}`,
  /** `{ reason }`; only while the group is `pending` or `confirmed`. */
  cancelGroup: (orderId: number, groupId: number) => `/orders/${orderId}/groups/${groupId}/cancel`,
  /** `404` until the group reaches the pickup point: that means "still on the way". */
  pickupStatus: (orderId: number, groupId: number) => `/orders/${orderId}/groups/${groupId}/pickup-status`,
} as const;
