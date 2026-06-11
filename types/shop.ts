export type ViewMode = '4col' | 'editorial' | '2col'

// Imagen editorial intercalada en el grid de productos (Vista 2). Proviene del
// campo `imagenesDestacadas` (module.image) del documento collection en Sanity.
export type EditorialImage = {
  imageUrl: string
  alt: string
  caption?: string
  href?: string
  blurDataURL?: string
  width?: number
  height?: number
}

export type SortKey =
  | 'featured'      // Sanity orderRank (default en /shop)
  | 'relevance'     // Shopify RELEVANCE (default en /search)
  | 'newest'        // Shopify CREATED desc
  | 'price-asc'     // Shopify PRICE asc
  | 'price-desc'    // Shopify PRICE desc
  | 'best-selling'  // Shopify BEST_SELLING

export const SORT_LABELS: Record<SortKey, string> = {
  featured: 'Latest novelty',
  relevance: 'Relevance',
  newest: 'New arrivals',
  'price-asc': 'Price (low to high)',
  'price-desc': 'Price (high to low)',
  'best-selling': 'Best sellers',
}

export type ShopSearchParams = {
  view?: ViewMode
  sort?: SortKey
  filters?: 'open'
  q?: string            // texto de búsqueda (solo /search)
  productType?: string  // comma-separated kebab-case values
  color?: string
  size?: string
  pattern?: string
  material?: string     // comma-separated slugged material labels (cover/filler/fabric)
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
  // 2ª imagen de la galería de la variante (fallback featured). La usa la tile
  // destacada del grid editorial (Vista 2).
  secondaryImageUrl?: string
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
