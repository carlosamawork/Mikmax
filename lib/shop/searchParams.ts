// lib/shop/searchParams.ts
import type {FilterDefinition, ShopSearchParams, SortKey, ViewMode} from '@/types/shop'

const VALID_SORTS: SortKey[] = ['featured', 'newest', 'price-asc', 'price-desc', 'best-selling']
const VALID_VIEWS: ViewMode[] = ['4col', '2col']

const FILTER_KEYS = ['productType', 'color', 'size', 'pattern'] as const
type ListFilterKey = (typeof FILTER_KEYS)[number]

export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): ShopSearchParams {
  const out: ShopSearchParams = {}
  const view = pickFirst(raw.view)
  if (view && VALID_VIEWS.includes(view as ViewMode)) out.view = view as ViewMode
  const sort = pickFirst(raw.sort)
  if (sort && VALID_SORTS.includes(sort as SortKey)) out.sort = sort as SortKey
  if (pickFirst(raw.filters) === 'open') out.filters = 'open'
  for (const key of FILTER_KEYS) {
    const v = pickFirst(raw[key])
    if (v) out[key] = v
  }
  const priceMin = pickFirst(raw.priceMin)
  if (priceMin && !Number.isNaN(Number(priceMin))) out.priceMin = priceMin
  const priceMax = pickFirst(raw.priceMax)
  if (priceMax && !Number.isNaN(Number(priceMax))) out.priceMax = priceMax
  if (pickFirst(raw.available) === 'true') out.available = 'true'
  return out
}

function pickFirst(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

export function serializeSearchParams(params: ShopSearchParams): string {
  const usp = new URLSearchParams()
  if (params.view && params.view !== '4col') usp.set('view', params.view)
  if (params.sort && params.sort !== 'featured') usp.set('sort', params.sort)
  if (params.filters === 'open') usp.set('filters', 'open')
  for (const key of FILTER_KEYS) {
    const v = params[key]
    if (v) usp.set(key, v)
  }
  if (params.priceMin) usp.set('priceMin', params.priceMin)
  if (params.priceMax) usp.set('priceMax', params.priceMax)
  if (params.available === 'true') usp.set('available', 'true')
  const s = usp.toString()
  return s ? `?${s}` : ''
}

/**
 * Returns the TaxonomyValue GIDs corresponding to the color base values
 * selected in `params.color`, by reading the raw `input` JSON of each matching
 * facet value. The input shape is provided by Shopify and typically looks like
 * `{taxonomyMetafield: {namespace, key, value: "gid://shopify/TaxonomyValue/N"}}`
 * or contains nested arrays of GIDs.
 */
export function extractSelectedColorGids(
  params: ShopSearchParams,
  facets: FilterDefinition[],
): string[] {
  if (!params.color) return []
  const facet = facets.find((f) => f.id === FACET_IDS.color)
  if (!facet) return []
  const gids: string[] = []
  const slugs = params.color.split(',').filter(Boolean)
  for (const slug of slugs) {
    const match = facet.values.find((v) => slugify(v.label) === slug)
    if (!match?.input) continue
    try {
      const parsed = JSON.parse(match.input)
      collectGids(parsed, gids)
    } catch {
      /* skip malformed inputs */
    }
  }
  return gids
}

function collectGids(node: unknown, out: string[]): void {
  if (!node) return
  if (typeof node === 'string') {
    if (node.startsWith('gid://')) out.push(node)
    return
  }
  if (Array.isArray(node)) {
    for (const item of node) collectGids(item, out)
    return
  }
  if (typeof node === 'object') {
    for (const value of Object.values(node as Record<string, unknown>)) {
      collectGids(value, out)
    }
  }
}

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Facet ids in Shopify's collection.products.filters response.
// `color` uses the variant taxonomy_metafield `shopify.color-pattern` so it
// filters by "base color" (taxonomy values like Pink / Beige / White) at
// variant level — each variant points to one taxonomy color.
const FACET_IDS = {
  productType: 'filter.p.product_type',
  color: 'filter.v.t.shopify.color-pattern',
  size: 'filter.v.option.size',
  pattern: 'filter.v.option.pattern',
} as const

/**
 * Builds the Shopify productFilter[] payload from URL params by re-using the
 * raw `input` JSON that Shopify exposes on each facet value. This avoids
 * hand-crafting the productFilter shape for every facet type (variantOption,
 * productMetafield, productType, etc.) and is robust to taxonomy changes.
 *
 * Price and availability are not facet-backed so they're constructed inline.
 */
export function buildShopifyFilters(
  params: ShopSearchParams,
  facets: FilterDefinition[],
): unknown[] {
  const filters: unknown[] = []
  const pushInputs = (facetId: string, csv: string | undefined) => {
    if (!csv) return
    const facet = facets.find((f) => f.id === facetId)
    if (!facet) return
    for (const slug of csv.split(',').filter(Boolean)) {
      const match = facet.values.find(
        (v) => slugify(v.label) === slug || v.id === `base-${slug}`,
      )
      if (!match?.input) continue
      try {
        const parsed = JSON.parse(match.input)
        // Grouped base-color values come as an array of specific Shopify
        // inputs; fan them out so the productFilter list contains each.
        if (Array.isArray(parsed)) filters.push(...parsed)
        else filters.push(parsed)
      } catch {
        // Skip malformed inputs silently — Shopify is the source of truth.
      }
    }
  }
  pushInputs(FACET_IDS.productType, params.productType)
  // Color is intentionally NOT sent to Shopify: the productFilters API ANDs
  // multiple taxonomyMetafield filters, which makes "Beige OR White" return
  // zero products. We filter cards by color GID in JS instead (OR semantics).
  pushInputs(FACET_IDS.size, params.size)
  pushInputs(FACET_IDS.pattern, params.pattern)

  if (params.priceMin || params.priceMax) {
    filters.push({
      price: {
        min: params.priceMin ? Number(params.priceMin) : 0,
        max: params.priceMax ? Number(params.priceMax) : 100000,
      },
    })
  }
  if (params.available === 'true') filters.push({available: true})
  return filters
}
