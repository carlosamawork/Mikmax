// lib/shop/searchParams.ts
import type {
  ActiveFilter,
  FilterDefinition,
  ShopSearchParams,
  SortKey,
  ViewMode,
} from '@/types/shop'

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

export function getActiveFilters(
  params: ShopSearchParams,
  facets: FilterDefinition[],
): ActiveFilter[] {
  const out: ActiveFilter[] = []
  for (const key of FILTER_KEYS) {
    const raw = params[key]
    if (!raw) continue
    const values = raw.split(',').filter(Boolean)
    for (const v of values) {
      out.push({
        key,
        label: titleFromKey(key),
        value: v,
        displayValue: displayValueFor(key, v, facets),
      })
    }
  }
  if (params.priceMin || params.priceMax) {
    out.push({
      key: 'priceMin',
      label: 'Price',
      value: `${params.priceMin ?? ''}-${params.priceMax ?? ''}`,
      displayValue: `${params.priceMin ?? '0'}€ – ${params.priceMax ?? '∞'}€`,
    })
  }
  return out
}

function titleFromKey(key: ListFilterKey): string {
  const map: Record<ListFilterKey, string> = {
    productType: 'Product',
    color: 'Color',
    size: 'Size',
    pattern: 'Pattern',
  }
  return map[key]
}

function displayValueFor(
  key: ListFilterKey,
  kebabValue: string,
  facets: FilterDefinition[],
): string {
  const facet = facets.find((f) => f.id === facetIdFor(key))
  if (!facet) return prettify(kebabValue)
  const match = facet.values.find((v) => slugify(v.label) === kebabValue)
  return match?.label ?? prettify(kebabValue)
}

function facetIdFor(key: ListFilterKey): string {
  // Shopify facet ids — verify in dev when wiring up.
  const map: Record<ListFilterKey, string> = {
    productType: 'filter.p.product_type',
    color: 'filter.v.option.color',
    size: 'filter.v.option.size',
    pattern: 'filter.v.option.pattern',
  }
  return map[key]
}

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function prettify(kebab: string): string {
  return kebab.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Builds the Shopify productFilter[] payload from URL params.
 * Values are matched against `facets` to recover the original label casing.
 */
export function buildShopifyFilters(
  params: ShopSearchParams,
  facets: FilterDefinition[],
): unknown[] {
  const filters: unknown[] = []
  const optionMap: Record<'color' | 'size' | 'pattern', string> = {
    color: 'Color',
    size: 'Size',
    pattern: 'Pattern',
  }
  if (params.productType) {
    for (const v of params.productType.split(',')) {
      const display = facetLabel('filter.p.product_type', v, facets)
      filters.push({productType: display})
    }
  }
  for (const opt of ['color', 'size', 'pattern'] as const) {
    const raw = params[opt]
    if (!raw) continue
    for (const v of raw.split(',')) {
      const display = facetLabel(`filter.v.option.${opt}`, v, facets)
      filters.push({variantOption: {name: optionMap[opt], value: display}})
    }
  }
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

function facetLabel(facetId: string, kebabValue: string, facets: FilterDefinition[]): string {
  const facet = facets.find((f) => f.id === facetId)
  const match = facet?.values.find((v) => slugify(v.label) === kebabValue)
  return match?.label ?? kebabValue
}
