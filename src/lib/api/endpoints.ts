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
