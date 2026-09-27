// Mirrors openapi/api.yaml → ProductCardRead, ProductPublicRead (+ its nested Product*Read),
// CatalogFacetsRead, CategoryNodeRead, CategoryAttributePublicRead, BrandPublicRead,
// ShopPublicRead, ShopSummaryRead, TranslationRead, AttributeTranslationRead, CatalogSort.
// Guide: sdk-contract/docs/storefront-catalog-api.md.
//
// List fields the spec marks optional (they have server defaults) are always sent, so
// they're required here.

/** Money is a decimal string, e.g. "120000.00". Format with `formatMoney`, never float math. */
export type Money = string;

export interface TranslationRead {
  locale: string;
  name: string;
  description: string | null;
}

export interface AttributeTranslationRead {
  locale: string;
  label: string;
}

export type AttributeDataType = 'text' | 'number' | 'boolean' | 'select' | 'multi_select';

export type CatalogSort = 'relevance' | 'newest' | 'price_asc' | 'price_desc';

export interface ShopSummaryRead {
  id: number;
  slug: string;
  name: string;
  logo_url: string | null;
}

export interface BrandPublicRead {
  id: number;
  name: string;
  logo_url: string | null;
  is_verified: boolean;
}

export interface ProductCardRead {
  id: number;
  slug: string;
  title: string;
  price_min: Money;
  price_max: Money;
  in_stock: boolean;
  has_variants: boolean;
  image_url: string | null;
  shop: ShopSummaryRead;
  brand: BrandPublicRead | null;
  category_id: number;
  created_at: string;
}

export interface CategoryAncestorRead {
  id: number;
  slug: string;
  translations: TranslationRead[];
}

export interface ProductCategoryRead {
  id: number;
  slug: string;
  translations: TranslationRead[];
  /** Root → parent. */
  ancestors: CategoryAncestorRead[];
}

export interface ProductPublicImageRead {
  id: number;
  url: string;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductPublicVariantRead {
  id: number;
  platform_sku: string;
  price: Money;
  in_stock: boolean;
  attributes: Record<string, string | number | boolean>;
  /** Ids from the product's `images`. */
  image_ids: number[] | null;
}

export interface ProductPublicAttributeRead {
  key: string;
  label_translations: AttributeTranslationRead[];
  data_type: AttributeDataType;
  unit: string | null;
  value: string | number | boolean | string[];
  is_variant_defining: boolean;
  sort_order: number;
}

export interface ProductPublicRead {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  /** Null on variant products; each variant has its own. */
  platform_sku: string | null;
  has_variants: boolean;
  price_min: Money;
  price_max: Money;
  in_stock: boolean;
  shop: ShopSummaryRead;
  brand: BrandPublicRead | null;
  category: ProductCategoryRead;
  /** Ordered by `sort_order`. */
  images: ProductPublicImageRead[];
  /** Active variants only; `[]` when `has_variants` is false. */
  variants: ProductPublicVariantRead[];
  /** Ordered by `sort_order`, then `key`. */
  attributes: ProductPublicAttributeRead[];
  created_at: string;
}

export interface BrandFacetRead {
  id: number;
  name: string;
  count: number;
}

export interface CatalogFacetsRead {
  /** By count desc, then name. Ignores the `brand_id` filter. */
  brands: BrandFacetRead[];
  /** Range of `price_min`; both null when nothing matches. Ignores the price filters. */
  price: { min: Money | null; max: Money | null };
}

export interface CategoryNodeRead {
  id: number;
  parent_id: number | null;
  /** Globally unique. */
  slug: string;
  icon_url: string | null;
  sort_order: number;
  is_leaf: boolean;
  translations: TranslationRead[];
  /** Visible products, descendants included. */
  product_count: number;
  children: CategoryNodeRead[];
}

export interface CategoryAttributePublicRead {
  id: number;
  key: string;
  data_type: AttributeDataType;
  /** Raw values, not localized. */
  options: string[] | null;
  unit: string | null;
  is_filterable: boolean;
  is_variant_defining: boolean;
  sort_order: number;
  translations: AttributeTranslationRead[];
}

export interface ShopPublicRead {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  /** Decimal string; null = no ratings yet. */
  rating_avg: string | null;
  rating_count: number;
  created_at: string;
}
