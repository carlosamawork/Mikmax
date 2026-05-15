export type ViewMode = '4col' | '2col'

export type SortKey =
  | 'featured'      // Sanity orderRank (default)
  | 'newest'        // Shopify CREATED desc
  | 'price-asc'     // Shopify PRICE asc
  | 'price-desc'    // Shopify PRICE desc
  | 'best-selling'  // Shopify BEST_SELLING

export const SORT_LABELS: Record<SortKey, string> = {
  featured: 'Latest novelty',
  newest: 'New arrivals',
  'price-asc': 'Price (low to high)',
  'price-desc': 'Price (high to low)',
  'best-selling': 'Best sellers',
}

export type ShopSearchParams = {
  view?: ViewMode
  sort?: SortKey
  filters?: 'open'
  productType?: string  // comma-separated kebab-case values
  color?: string
  size?: string
  pattern?: string
  priceMin?: string
  priceMax?: string
  available?: string    // 'true' to show only in-stock
}

// What Shopify returns inside collection.products.filters
export type FilterValue = {
  id: string
  label: string
  count: number
  input: string  // JSON-serialized productFilter input to send back
}

export type FilterDefinition = {
  id: string
  label: string
  type: 'LIST' | 'PRICE_RANGE' | 'BOOLEAN'
  values: FilterValue[]
}

export type ProductCardData = {
  id: string             // product id, or `${productId}::${variantId}` when split by color
  handle: string
  title: string
  imageUrl?: string
  imageAlt?: string
  minPrice?: number
  maxPrice?: number
  compareAtPrice?: number
  tags?: string
  // Set when the card represents a specific color variant of a product.
  variantId?: string
  colorLabel?: string
  colorSlug?: string
  availableForSale?: boolean
}

export type ShopChunkResult = {
  products: ProductCardData[]
  hasMore: boolean
  nextOffset?: number   // for featured
  nextCursor?: string   // for Shopify-native sorts
}

export const CHUNK_SIZE = 24
export const ALL_HANDLE = 'all'  // virtual collection handle for /shop
