// lib/shop/buildCards.ts
import {
  getCollectionFilters,
  getAllProductsForFilters,
  getAllShopFilters,
  getAllShopProducts,
} from '@/lib/shopify'
import {getOrderedHandles} from '@/sanity/queries/queries/shop'
import {buildShopifyFilters, extractSelectedColorGids} from '@/lib/shop/searchParams'
import {expandProductsToCards, type ShopifyProductNode as BaseProductNode} from '@/lib/shop/expandToCards'
import {filterProductsByMaterial} from '@/lib/shop/materialFilter'
import {applyCardFilters, sortCards} from '@/lib/shop/filterAndSortCards'
import {ALL_HANDLE} from '@/types/shop'
import type {FilterDefinition, ProductCardData, ShopSearchParams, SortKey} from '@/types/shop'

type MaterialMetaobjectNode = {fields?: {key: string; value: string | null}[]}
type MaterialMetafield = {references?: {nodes: MaterialMetaobjectNode[]} | null} | null

// Reusa la forma base de expandToCards (única fuente de verdad) y le añade los
// metafields de material que consume filterProductsByMaterial. Así ambos archivos
// no divergen.
export type ShopifyProductNode = BaseProductNode & {
  coverMaterial?: MaterialMetafield
  fillerMaterial?: MaterialMetafield
  fabric?: MaterialMetafield
}

const SORT_MAP: Record<
  'newest' | 'price-asc' | 'price-desc' | 'best-selling',
  {sortKey: string; reverse: boolean}
> = {
  newest: {sortKey: 'CREATED', reverse: true},
  'price-asc': {sortKey: 'PRICE', reverse: false},
  'price-desc': {sortKey: 'PRICE', reverse: true},
  'best-selling': {sortKey: 'BEST_SELLING', reverse: false},
}

// El endpoint top-level `search` solo soporta RELEVANCE y PRICE para productos.
const SEARCH_SORT_MAP: Partial<
  Record<'newest' | 'price-asc' | 'price-desc' | 'best-selling', {sortKey: string; reverse: boolean}>
> = {
  'price-asc': {sortKey: 'PRICE', reverse: false},
  'price-desc': {sortKey: 'PRICE', reverse: true},
}

export type BuiltCards = {
  cards: ProductCardData[]
  facets: FilterDefinition[]
}

/**
 * Pipeline compartido por /shop y /search.
 * - handle === 'all' usa el endpoint `search`.
 * - params.q se pasa como texto de búsqueda (vacío => todos los productos).
 * - default de sort: 'relevance' si hay query, 'featured' si no.
 */
export async function buildAllCards(
  handle: string,
  params: ShopSearchParams,
): Promise<BuiltCards> {
  const isAll = handle === ALL_HANDLE
  const query = params.q ?? ''
  const facets = isAll
    ? await getAllShopFilters({filters: [], query})
    : await getCollectionFilters(handle, {filters: []})
  const filters = buildShopifyFilters(params, facets)
  const selectedColorGids = extractSelectedColorGids(params, facets)

  const sort: SortKey = params.sort ?? (query ? 'relevance' : 'featured')
  const isOrderless = sort === 'featured' || sort === 'relevance'
  const shopifySort = isOrderless ? undefined : SORT_MAP[sort as keyof typeof SORT_MAP]
  const searchSort = isOrderless
    ? undefined
    : SEARCH_SORT_MAP[sort as keyof typeof SEARCH_SORT_MAP]

  const [orderedHandles, matching] = await Promise.all([
    sort === 'featured' ? getOrderedHandles() : Promise.resolve<string[]>([]),
    (isAll
      ? getAllShopProducts(filters, searchSort ?? {}, query)
      : getAllProductsForFilters(handle, filters, shopifySort ?? {})) as Promise<
      ShopifyProductNode[]
    >,
  ])

  let orderedProducts: ShopifyProductNode[]
  if (sort === 'featured') {
    const matchByHandle = new Map<string, ShopifyProductNode>(
      matching.map((p) => [p.handle, p]),
    )
    orderedProducts = orderedHandles
      .map((h) => matchByHandle.get(h))
      .filter((p): p is ShopifyProductNode => Boolean(p))
  } else {
    orderedProducts = matching
  }

  const selectedMaterialSlugs = (params.material ?? '').split(',').filter(Boolean)
  const materialFiltered = filterProductsByMaterial(orderedProducts, selectedMaterialSlugs)
  const expanded = expandProductsToCards(materialFiltered, selectedColorGids)
  const filtered = applyCardFilters(expanded, params)
  const cards = sortCards(filtered, sort)
  return {cards, facets}
}
