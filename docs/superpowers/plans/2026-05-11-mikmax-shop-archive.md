# Mikmax Shop Archive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Shop archive (`/shop` and `/shop/[handle]`) with Vista 1 / Vista 3 toggle, FilterDrawer with Shopify-derived facets, Sanity-led default sort, infinite scroll, and URL-synced state.

**Architecture:**
- Server Components fetch in parallel: Sanity (ordered handles + collection meta) and Shopify (products + filter facets). Intersection happens in JS when `sort=featured`; Shopify-native pagination otherwise.
- One reusable `FilterDrawer` (desktop + mobile via CSS) opened via URL flag `?filters=open`. Optimistic client state with debounced live-count Server Action.
- `InfiniteScrollSentinel` calls a Server Action `fetchShopChunk` that branches on sort: `offset`-based for featured (Sanity-led), `cursor`-based for Shopify-native sorts.

**Tech stack:** Next.js 15 App Router (Server Components + Server Actions), TypeScript strict, SCSS Modules, `next-sanity` GROQ client, Shopify Storefront API. No new dependencies. No automated tests (per spec scope).

**Testing model:** TDD is not in scope. Each task ends with `npm run typecheck`, `npm run lint`, manual verification in the browser (where applicable), and a focused commit.

**Out of scope:**
- Vista 2 (editorial mixed grid with `imagenesDestacadas`).
- `/shop/product/[handle]` PDP.
- Predictive Search, `+Ficha` quick-view, Wishlist.
- ProductCard variants `mini`/`hover`/`set`.
- Webhook `/api/revalidate`.
- Tracking analytics events.
- Cart/`shopContext` changes.

**Spec:** `docs/superpowers/specs/2026-05-11-mikmax-shop-archive-design.md`

---

## File Structure

### Types
- Create: `types/shop.ts`

### Sanity
- Create: `sanity/queries/fragments/collection.ts`
- Create: `sanity/queries/fragments/productHandle.ts`
- Create: `sanity/queries/queries/shop.ts`
- Modify: `sanity/types/objects/index.ts` (export new types if needed)

### Shopify
- Modify: `lib/shopify.js` — add `getCollectionMeta`, `getCollectionProducts`, `getCollectionFilters`, `getAllProductsForFilters`

### Helpers
- Create: `lib/shop/searchParams.ts`

### Server Actions
- Create: `app/(frontend)/shop/actions.ts`

### Page routes
- Create: `app/(frontend)/shop/page.tsx`
- Create: `app/(frontend)/shop/[handle]/page.tsx`
- Create: `app/(frontend)/shop/ShopArchive.tsx`

### Components
- Create: `components/Shop/Breadcrumb/Breadcrumb.tsx` + `.module.scss`
- Create: `components/Shop/PageHeader/PageHeader.tsx` + `.module.scss`
- Create: `components/Shop/PageHeader/ViewToggle.tsx` + `.module.scss`
- Create: `components/Shop/PageHeader/FilterTrigger.tsx` + `.module.scss`
- Create: `components/Shop/PageHeader/ActiveFilterChips.tsx` + `.module.scss`
- Create: `components/Shop/ProductGrid/ProductGrid.tsx` + `.module.scss`
- Create: `components/Shop/InfiniteScrollSentinel/InfiniteScrollSentinel.tsx`
- Create: `components/Shop/FilterDrawer/FilterDrawer.tsx` + `.module.scss`
- Create: `components/Shop/FilterDrawer/FilterAccordion.tsx` + `.module.scss`
- Create: `components/Shop/FilterDrawer/SortRadios.tsx`
- Create: `components/Shop/FilterDrawer/CheckboxList.tsx`
- Create: `components/Shop/FilterDrawer/ColorSwatches.tsx`
- Create: `components/Shop/FilterDrawer/SizeChips.tsx`
- Create: `components/Shop/FilterDrawer/PriceRange.tsx`

---

## Phase L5 — Day 1

### Task 5.1: Types module

**Files:**
- Create: `types/shop.ts`

- [ ] **Step 1: Define all shop-related types in one file**

```ts
// types/shop.ts

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

// Active filter for chips UI
export type ActiveFilter = {
  key: keyof ShopSearchParams
  label: string
  value: string
  displayValue: string
}

export type BreadcrumbCrumb = {
  label: string
  href: string | null  // null = inactive (current page)
}

export type ProductCardData = {
  id: string
  handle: string
  title: string
  imageUrl?: string
  imageAlt?: string
  minPrice?: number
  maxPrice?: number
  compareAtPrice?: number
  tags?: string
}

export type ShopChunkResult = {
  products: ProductCardData[]
  hasMore: boolean
  nextOffset?: number   // for featured
  nextCursor?: string   // for Shopify-native sorts
}

export const CHUNK_SIZE = 24
export const ALL_HANDLE = 'all'  // virtual collection handle for /shop
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add types/shop.ts
git commit -m "Add shop types (search params, sort keys, filters, chunks)"
```

---

### Task 5.2: Sanity GROQ — collection + productHandle fragments

**Files:**
- Create: `sanity/queries/fragments/collection.ts`
- Create: `sanity/queries/fragments/productHandle.ts`

- [ ] **Step 1: Create the collection fragment**

```ts
// sanity/queries/fragments/collection.ts
import {groq} from 'next-sanity'

// Projects collection metadata + parent chain (up to 3 levels) for breadcrumb.
// Deeper jerarquías se ignoran (no se espera más profundidad en MVP).
export const collectionProjection = groq`
  _id,
  "title": store.title,
  "handle": store.slug.current,
  "descriptionHtml": store.descriptionHtml,
  parent->{
    "title": store.title,
    "handle": store.slug.current,
    parent->{
      "title": store.title,
      "handle": store.slug.current
    }
  }
`
```

- [ ] **Step 2: Create the productHandle fragment**

```ts
// sanity/queries/fragments/productHandle.ts
import {groq} from 'next-sanity'

// Lightweight projection used to fetch ordered handle lists.
export const productHandleProjection = groq`
  _id,
  "handle": store.slug.current,
  orderRank
`
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add sanity/queries/fragments/collection.ts sanity/queries/fragments/productHandle.ts
git commit -m "Add Sanity fragments for shop archive (collection + productHandle)"
```

---

### Task 5.3: Sanity GROQ queries — getCollectionByHandle + getOrderedHandles

**Files:**
- Create: `sanity/queries/queries/shop.ts`

- [ ] **Step 1: Create the query module**

```ts
// sanity/queries/queries/shop.ts
import {groq} from 'next-sanity'
import {client} from '..'
import {collectionProjection} from '../fragments/collection'
import {productHandleProjection} from '../fragments/productHandle'
import {ALL_HANDLE} from '@/types/shop'

export type SanityCollection = {
  _id: string
  title: string
  handle: string
  descriptionHtml?: string
  parent?: {
    title: string
    handle: string
    parent?: {title: string; handle: string}
  }
}

export type SanityProductHandle = {
  _id: string
  handle: string
  orderRank?: string
}

/**
 * Returns Sanity metadata for a collection by Shopify slug.
 * Returns null when the handle is the virtual "all" or not found.
 */
export async function getCollectionByHandle(
  handle: string,
): Promise<SanityCollection | null> {
  if (handle === ALL_HANDLE) return null
  return client.fetch<SanityCollection | null>(
    groq`*[_type == "collection" && store.slug.current == $handle && !store.isDeleted][0]{
      ${collectionProjection}
    }`,
    {handle},
    {next: {tags: [`collection:${handle}`], revalidate: 3600}},
  )
}

/**
 * Returns product handles ordered by orderRank for a collection.
 * When handle is `ALL_HANDLE`, returns all products globally.
 */
export async function getOrderedHandles(handle: string): Promise<string[]> {
  const filter =
    handle === ALL_HANDLE
      ? `_type == "product" && !store.isDeleted`
      : `_type == "product" && !store.isDeleted && $handle in store.collections[]->store.slug.current`
  const rows = await client.fetch<SanityProductHandle[]>(
    groq`*[${filter}] | order(orderRank asc) {
      ${productHandleProjection}
    }`,
    {handle},
    {next: {tags: [`collection:${handle}:handles`], revalidate: 3600}},
  )
  return rows.map((r) => r.handle).filter(Boolean)
}
```

- [ ] **Step 2: Verify the product schema exposes `store.collections[]._ref`**

Run: `grep -n "collections" sanity/schemas/documents/product.tsx`
Expected: a reference array field exists. If not, the `getOrderedHandles` filter for `/shop/[handle]` will return empty — flag this back to the user.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add sanity/queries/queries/shop.ts
git commit -m "Add Sanity shop queries (getCollectionByHandle, getOrderedHandles)"
```

---

### Task 5.4: Shopify library extensions

**Files:**
- Modify: `lib/shopify.js`

- [ ] **Step 1: Read the existing file to understand the shopifyData helper signature**

Run: `head -50 lib/shopify.js`

- [ ] **Step 2: Append the four new functions at the end of the file**

```js
// --- Collection archive helpers (added 2026-05-11) ---

const COLLECTION_META_QUERY = `
  query CollectionMeta($handle: String!) {
    collection(handle: $handle) {
      id
      title
      handle
      descriptionHtml
      image { url altText }
    }
  }
`

export async function getCollectionMeta(handle) {
  const data = await shopifyData(COLLECTION_META_QUERY, {handle})
  return data?.collection ?? null
}

const PRODUCT_CARD_FRAGMENT = `
  fragment ProductCard on Product {
    id
    handle
    title
    tags
    featuredImage { url altText }
    priceRange {
      minVariantPrice { amount }
      maxVariantPrice { amount }
    }
    compareAtPriceRange {
      maxVariantPrice { amount }
    }
  }
`

const COLLECTION_PRODUCTS_QUERY = `
  ${PRODUCT_CARD_FRAGMENT}
  query CollectionProducts(
    $handle: String!
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $first: Int!
    $after: String
  ) {
    collection(handle: $handle) {
      products(
        filters: $filters
        sortKey: $sortKey
        reverse: $reverse
        first: $first
        after: $after
      ) {
        pageInfo { hasNextPage endCursor }
        nodes { ...ProductCard }
        filters {
          id
          label
          type
          values { id label count input }
        }
      }
    }
  }
`

export async function getCollectionProducts(
  handle,
  {filters = [], sortKey = 'COLLECTION_DEFAULT', reverse = false, first = 24, after = null} = {},
) {
  const data = await shopifyData(COLLECTION_PRODUCTS_QUERY, {
    handle,
    filters,
    sortKey,
    reverse,
    first,
    after,
  })
  const products = data?.collection?.products
  if (!products) return {nodes: [], pageInfo: {hasNextPage: false, endCursor: null}, filters: []}
  return products
}

const COLLECTION_FILTERS_QUERY = `
  query CollectionFilters($handle: String!, $filters: [ProductFilter!]) {
    collection(handle: $handle) {
      products(filters: $filters, first: 1) {
        filters {
          id
          label
          type
          values { id label count input }
        }
      }
    }
  }
`

export async function getCollectionFilters(handle, {filters = []} = {}) {
  const data = await shopifyData(COLLECTION_FILTERS_QUERY, {handle, filters})
  return data?.collection?.products?.filters ?? []
}

/**
 * Iterates the collection in batches of 250 to materialize all matching handles
 * for the given filters. Used when sort=featured to intersect with Sanity order.
 */
export async function getAllProductsForFilters(handle, filters = []) {
  const all = []
  let after = null
  let hasNext = true
  while (hasNext) {
    const page = await getCollectionProducts(handle, {
      filters,
      sortKey: 'COLLECTION_DEFAULT',
      first: 250,
      after,
    })
    all.push(...page.nodes)
    hasNext = page.pageInfo.hasNextPage
    after = page.pageInfo.endCursor
    if (all.length >= 5000) break  // safety cap
  }
  return all
}
```

- [ ] **Step 3: Confirm `shopifyData` exists and accepts (query, variables)**

Run: `grep -n "function shopifyData\|export.*shopifyData" lib/shopify.js`
Expected: a function definition appears. If named differently, adjust the calls in Step 2.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/shopify.js
git commit -m "Add Shopify collection helpers (meta, products, filters, full iteration)"
```

---

### Task 5.5: URL searchParams helper

**Files:**
- Create: `lib/shop/searchParams.ts`

- [ ] **Step 1: Create the helper**

```ts
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

export function parseSearchParams(raw: Record<string, string | string[] | undefined>): ShopSearchParams {
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

function displayValueFor(key: ListFilterKey, kebabValue: string, facets: FilterDefinition[]): string {
  // Match against the facet values returned by Shopify. The kebab value is the slugified label.
  const facetId = facetIdFor(key)
  const facet = facets.find((f) => f.id === facetId)
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
  const optionMap: Record<ListFilterKey, string> = {
    productType: 'Product',     // not a variant option; handled below
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/shop/searchParams.ts
git commit -m "Add shop URL helpers (parse, serialize, active filters, Shopify mapper)"
```

---

### Task 5.6: Server Actions — fetchShopChunk + getFilterCount

**Files:**
- Create: `app/(frontend)/shop/actions.ts`

- [ ] **Step 1: Create the actions file**

```ts
// app/(frontend)/shop/actions.ts
'use server'

import {
  getCollectionFilters,
  getCollectionProducts,
  getAllProductsForFilters,
} from '@/lib/shopify'
import {getOrderedHandles} from '@/sanity/queries/queries/shop'
import {buildShopifyFilters} from '@/lib/shop/searchParams'
import {CHUNK_SIZE} from '@/types/shop'
import type {
  ProductCardData,
  ShopChunkResult,
  ShopSearchParams,
  SortKey,
} from '@/types/shop'

type ShopifyProductNode = {
  id: string
  handle: string
  title: string
  tags?: string[]
  featuredImage?: {url: string; altText?: string | null} | null
  priceRange: {
    minVariantPrice: {amount: string}
    maxVariantPrice: {amount: string}
  }
  compareAtPriceRange: {maxVariantPrice: {amount: string}}
}

function shopifyToCard(p: ShopifyProductNode): ProductCardData {
  const min = Number(p.priceRange.minVariantPrice.amount)
  const max = Number(p.priceRange.maxVariantPrice.amount)
  const compare = Number(p.compareAtPriceRange.maxVariantPrice.amount)
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    imageUrl: p.featuredImage?.url,
    imageAlt: p.featuredImage?.altText ?? undefined,
    minPrice: Number.isFinite(min) ? min : undefined,
    maxPrice: Number.isFinite(max) && max !== min ? max : undefined,
    compareAtPrice: Number.isFinite(compare) && compare > 0 ? compare : undefined,
    tags: Array.isArray(p.tags) ? p.tags.join(',') : undefined,
  }
}

const SORT_TO_SHOPIFY: Record<Exclude<SortKey, 'featured'>, {sortKey: string; reverse: boolean}> = {
  newest: {sortKey: 'CREATED', reverse: true},
  'price-asc': {sortKey: 'PRICE', reverse: false},
  'price-desc': {sortKey: 'PRICE', reverse: true},
  'best-selling': {sortKey: 'BEST_SELLING', reverse: false},
}

export async function fetchShopChunk(args: {
  handle: string
  params: ShopSearchParams
  offset?: number
  cursor?: string
}): Promise<ShopChunkResult> {
  const {handle, params} = args
  const sort: SortKey = params.sort ?? 'featured'

  // Facets needed to translate kebab params to Shopify labels
  const facets = await getCollectionFilters(handle, {filters: []})
  const filters = buildShopifyFilters(params, facets)

  if (sort === 'featured') {
    const offset = args.offset ?? 0
    const [orderedHandles, matching] = await Promise.all([
      getOrderedHandles(handle),
      getAllProductsForFilters(handle, filters),
    ])
    const matchByHandle = new Map<string, ShopifyProductNode>(
      matching.map((p) => [p.handle, p as ShopifyProductNode]),
    )
    const ordered = orderedHandles
      .map((h) => matchByHandle.get(h))
      .filter((p): p is ShopifyProductNode => Boolean(p))
    const slice = ordered.slice(offset, offset + CHUNK_SIZE)
    return {
      products: slice.map(shopifyToCard),
      hasMore: offset + CHUNK_SIZE < ordered.length,
      nextOffset: offset + CHUNK_SIZE,
    }
  }

  const ship = SORT_TO_SHOPIFY[sort]
  const page = await getCollectionProducts(handle, {
    filters,
    sortKey: ship.sortKey as never,
    reverse: ship.reverse,
    first: CHUNK_SIZE,
    after: args.cursor ?? null,
  })
  return {
    products: page.nodes.map((p: ShopifyProductNode) => shopifyToCard(p)),
    hasMore: page.pageInfo.hasNextPage,
    nextCursor: page.pageInfo.endCursor ?? undefined,
  }
}

export async function getFilterCount(args: {
  handle: string
  params: ShopSearchParams
}): Promise<number> {
  const facets = await getCollectionFilters(args.handle, {filters: []})
  const filters = buildShopifyFilters(args.params, facets)
  if ((args.params.sort ?? 'featured') === 'featured') {
    const [orderedHandles, matching] = await Promise.all([
      getOrderedHandles(args.handle),
      getAllProductsForFilters(args.handle, filters),
    ])
    const set = new Set(matching.map((p: ShopifyProductNode) => p.handle))
    return orderedHandles.filter((h) => set.has(h)).length
  }
  const all = await getAllProductsForFilters(args.handle, filters)
  return all.length
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(frontend\)/shop/actions.ts
git commit -m "Add shop server actions (fetchShopChunk, getFilterCount)"
```

---

### Task 5.7: Breadcrumb component

**Files:**
- Create: `components/Shop/Breadcrumb/Breadcrumb.tsx`
- Create: `components/Shop/Breadcrumb/Breadcrumb.module.scss`

- [ ] **Step 1: SCSS module**

```scss
// components/Shop/Breadcrumb/Breadcrumb.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: px(6);
  padding: px(20) px(15);
  font-family: $MonumentGrotesk;
  font-size: px(11);
  line-height: px(15);
  letter-spacing: 0.5px;
  color: map-get($colors, 'gray');

  @include from(md) {
    padding: px(30) px(40);
  }
}

.link {
  color: inherit;
  text-decoration: none;

  &:hover { color: map-get($colors, 'darker'); }
}

.sep { color: map-get($colors, 'gray'); }
.current { color: map-get($colors, 'darker'); }
```

- [ ] **Step 2: Component**

```tsx
// components/Shop/Breadcrumb/Breadcrumb.tsx
import Link from 'next/link'
import type {BreadcrumbCrumb} from '@/types/shop'
import s from './Breadcrumb.module.scss'

interface Props {
  crumbs: BreadcrumbCrumb[]
}

export default function Breadcrumb({crumbs}: Props) {
  if (crumbs.length === 0) return null
  return (
    <nav aria-label="Breadcrumb" className={s.breadcrumb}>
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`} className={c.href ? s.link : s.current}>
          {c.href ? (
            <Link href={c.href} className={s.link}>
              {c.label}
            </Link>
          ) : (
            c.label
          )}
          {i < crumbs.length - 1 && <span className={s.sep}> &gt; </span>}
        </span>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/Shop/Breadcrumb/
git commit -m "Add Breadcrumb component for shop archive"
```

---

### Task 5.8: ProductGrid + skeleton

**Files:**
- Create: `components/Shop/ProductGrid/ProductGrid.tsx`
- Create: `components/Shop/ProductGrid/ProductGrid.module.scss`

- [ ] **Step 1: SCSS**

```scss
// components/Shop/ProductGrid/ProductGrid.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: px(1);

  @include from(md) {
    grid-template-columns: repeat(var(--cols), 1fr);
  }
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: px(16);
  padding: px(80) px(15);
  font-family: $MonumentGrotesk;
  font-size: px(13);
  line-height: px(20);
  color: map-get($colors, 'gray');

  a {
    color: map-get($colors, 'darker');
    text-decoration: underline;
  }
}

.skeleton {
  width: 100%;
  aspect-ratio: 357 / 476;
  background: map-get($colors, 'lightgray-bg');
}
```

- [ ] **Step 2: Component (server)**

```tsx
// components/Shop/ProductGrid/ProductGrid.tsx
import Link from 'next/link'
import ProductCard from '@/components/PageBuilder/ProductCard/ProductCard'
import type {ProductCardData, ViewMode} from '@/types/shop'
import s from './ProductGrid.module.scss'

interface Props {
  products: ProductCardData[]
  view: ViewMode
  hasActiveFilters?: boolean
}

export default function ProductGrid({products, view, hasActiveFilters}: Props) {
  if (products.length === 0) {
    return (
      <div className={s.empty}>
        {hasActiveFilters ? (
          <>
            <p>No products match your filters.</p>
            <Link href="?">Clear filters</Link>
          </>
        ) : (
          <>
            <p>No products yet.</p>
            <Link href="/shop">Back to Shop</Link>
          </>
        )}
      </div>
    )
  }

  return (
    <div
      className={s.grid}
      style={{['--cols' as string]: view === '4col' ? 4 : 2}}
    >
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={{
            _id: p.id,
            title: p.title,
            handle: p.handle,
            imageUrl: p.imageUrl,
            minPrice: p.minPrice,
            maxPrice: p.maxPrice,
            compareAtPrice: p.compareAtPrice,
            tags: p.tags,
          }}
        />
      ))}
    </div>
  )
}

export function ProductGridSkeleton({view}: {view: ViewMode}) {
  const count = view === '4col' ? 8 : 6
  return (
    <div className={s.grid} style={{['--cols' as string]: view === '4col' ? 4 : 2}}>
      {Array.from({length: count}).map((_, i) => (
        <div key={i} className={s.skeleton} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors. If `ProductCard` props differ from the shape above, adjust the mapping.

- [ ] **Step 4: Commit**

```bash
git add components/Shop/ProductGrid/
git commit -m "Add ProductGrid + skeleton for shop archive"
```

---

### Task 5.9: PageHeader (server) + client subcomponents

**Files:**
- Create: `components/Shop/PageHeader/PageHeader.tsx` + `.module.scss`
- Create: `components/Shop/PageHeader/ViewToggle.tsx` + `.module.scss`
- Create: `components/Shop/PageHeader/FilterTrigger.tsx` + `.module.scss`
- Create: `components/Shop/PageHeader/ActiveFilterChips.tsx` + `.module.scss`

- [ ] **Step 1: ViewToggle (client)**

```tsx
// components/Shop/PageHeader/ViewToggle.tsx
'use client'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'
import type {ViewMode} from '@/types/shop'
import s from './ViewToggle.module.scss'

export default function ViewToggle({value}: {value: ViewMode}) {
  const router = useRouter()
  const path = usePathname()
  const params = useSearchParams()

  function setView(view: ViewMode) {
    const next = new URLSearchParams(params.toString())
    if (view === '4col') next.delete('view')
    else next.set('view', view)
    const q = next.toString()
    router.push(q ? `${path}?${q}` : path, {scroll: false})
  }

  return (
    <div className={s.toggle} role="group" aria-label="View">
      <button
        type="button"
        aria-pressed={value === '4col'}
        onClick={() => setView('4col')}
        className={value === '4col' ? s.active : ''}
        aria-label="4 columns"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="0" y="0" width="3" height="3" />
          <rect x="4.3" y="0" width="3" height="3" />
          <rect x="8.6" y="0" width="3" height="3" />
          <rect x="12.9" y="0" width="3" height="3" />
          <rect x="0" y="4.3" width="3" height="3" />
          <rect x="4.3" y="4.3" width="3" height="3" />
          <rect x="8.6" y="4.3" width="3" height="3" />
          <rect x="12.9" y="4.3" width="3" height="3" />
        </svg>
      </button>
      <button
        type="button"
        aria-pressed={value === '2col'}
        onClick={() => setView('2col')}
        className={value === '2col' ? s.active : ''}
        aria-label="2 columns"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="0" y="0" width="7" height="7" />
          <rect x="9" y="0" width="7" height="7" />
          <rect x="0" y="9" width="7" height="7" />
          <rect x="9" y="9" width="7" height="7" />
        </svg>
      </button>
    </div>
  )
}
```

```scss
// components/Shop/PageHeader/ViewToggle.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.toggle {
  display: none;

  @include from(md) {
    display: inline-flex;
    gap: px(8);
  }

  button {
    background: none;
    border: 1px solid map-get($colors, 'gray');
    padding: px(6) px(8);
    cursor: pointer;
    color: map-get($colors, 'gray');

    &.active {
      border-color: map-get($colors, 'darker');
      color: map-get($colors, 'darker');
    }
  }
}
```

- [ ] **Step 2: FilterTrigger (client)**

```tsx
// components/Shop/PageHeader/FilterTrigger.tsx
'use client'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'
import s from './FilterTrigger.module.scss'

export default function FilterTrigger({count}: {count: number}) {
  const router = useRouter()
  const path = usePathname()
  const params = useSearchParams()

  function open() {
    const next = new URLSearchParams(params.toString())
    next.set('filters', 'open')
    router.push(`${path}?${next.toString()}`, {scroll: false})
  }

  return (
    <button type="button" onClick={open} className={s.trigger}>
      Filter &amp; Sort {count > 0 && <span className={s.count}>({count})</span>}
    </button>
  )
}
```

```scss
// components/Shop/PageHeader/FilterTrigger.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.trigger {
  background: none;
  border: 1px solid map-get($colors, 'darker');
  padding: px(8) px(14);
  font-family: $MonumentGrotesk;
  font-size: px(11);
  letter-spacing: 0.5px;
  color: map-get($colors, 'darker');
  cursor: pointer;
}

.count {
  margin-left: px(4);
  color: map-get($colors, 'gray');
}
```

- [ ] **Step 3: ActiveFilterChips (client)**

```tsx
// components/Shop/PageHeader/ActiveFilterChips.tsx
'use client'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'
import type {ActiveFilter} from '@/types/shop'
import s from './ActiveFilterChips.module.scss'

interface Props {
  active: ActiveFilter[]
}

export default function ActiveFilterChips({active}: Props) {
  const router = useRouter()
  const path = usePathname()
  const params = useSearchParams()
  if (active.length === 0) return null

  function remove(filter: ActiveFilter) {
    const next = new URLSearchParams(params.toString())
    if (filter.key === 'priceMin') {
      next.delete('priceMin')
      next.delete('priceMax')
    } else {
      const current = next.get(filter.key) ?? ''
      const remaining = current
        .split(',')
        .filter((v) => v && v !== filter.value)
        .join(',')
      if (remaining) next.set(filter.key, remaining)
      else next.delete(filter.key)
    }
    const q = next.toString()
    router.push(q ? `${path}?${q}` : path, {scroll: false})
  }

  function clearAll() {
    const next = new URLSearchParams(params.toString())
    for (const f of active) {
      if (f.key === 'priceMin') {
        next.delete('priceMin')
        next.delete('priceMax')
      } else {
        next.delete(f.key)
      }
    }
    const q = next.toString()
    router.push(q ? `${path}?${q}` : path, {scroll: false})
  }

  return (
    <div className={s.chips}>
      {active.map((f) => (
        <button
          key={`${f.key}-${f.value}`}
          type="button"
          onClick={() => remove(f)}
          className={s.chip}
        >
          {f.label}: {f.displayValue} <span aria-hidden="true">×</span>
        </button>
      ))}
      <button type="button" onClick={clearAll} className={s.clear}>
        Clear all
      </button>
    </div>
  )
}
```

```scss
// components/Shop/PageHeader/ActiveFilterChips.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: px(8);
  margin-top: px(12);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: px(6);
  background: map-get($colors, 'lightgray-bg');
  border: 1px solid map-get($colors, 'gray');
  border-radius: px(20);
  padding: px(4) px(10);
  font-family: $MonumentGrotesk;
  font-size: px(11);
  cursor: pointer;
}

.clear {
  background: none;
  border: none;
  text-decoration: underline;
  cursor: pointer;
  font-family: $MonumentGrotesk;
  font-size: px(11);
  color: map-get($colors, 'darker');
}
```

- [ ] **Step 4: PageHeader (server)**

```tsx
// components/Shop/PageHeader/PageHeader.tsx
import type {ActiveFilter, ViewMode} from '@/types/shop'
import ViewToggle from './ViewToggle'
import FilterTrigger from './FilterTrigger'
import ActiveFilterChips from './ActiveFilterChips'
import s from './PageHeader.module.scss'

interface Props {
  title: string
  count: number
  view: ViewMode
  active: ActiveFilter[]
  description?: string
}

export default function PageHeader({title, count, view, active, description}: Props) {
  return (
    <header className={s.header}>
      <div className={s.row}>
        <div className={s.titleBlock}>
          <h1 className={s.title}>{title}</h1>
          <p className={s.count}>{count} products</p>
        </div>
        <div className={s.actions}>
          <ViewToggle value={view} />
          <FilterTrigger count={active.length} />
        </div>
      </div>
      <ActiveFilterChips active={active} />
      {description && <p className={s.description}>{description}</p>}
    </header>
  )
}
```

```scss
// components/Shop/PageHeader/PageHeader.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.header {
  padding: px(10) px(15) px(20);

  @include from(md) {
    padding: px(20) px(40);
  }
}

.row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: px(16);
}

.title {
  font-family: $MonumentGrotesk;
  font-size: px(22);
  line-height: px(28);
  margin: 0;
  color: map-get($colors, 'darker');

  @include from(md) {
    font-size: px(28);
    line-height: px(36);
  }
}

.count {
  margin: px(4) 0 0;
  font-family: $MonumentGrotesk;
  font-size: px(11);
  letter-spacing: 0.5px;
  color: map-get($colors, 'gray');
}

.actions {
  display: flex;
  gap: px(8);
  align-items: center;
}

.description {
  margin-top: px(16);
  font-family: $MonumentGrotesk;
  font-size: px(12);
  line-height: px(18);
  color: map-get($colors, 'darker');
  max-width: 60ch;
}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/Shop/PageHeader/
git commit -m "Add PageHeader with ViewToggle, FilterTrigger, ActiveFilterChips"
```

---

### Task 5.10: FilterDrawer atoms (Accordion, SortRadios, CheckboxList, ColorSwatches, SizeChips, PriceRange)

**Files:**
- Create: `components/Shop/FilterDrawer/FilterAccordion.tsx` + `.module.scss`
- Create: `components/Shop/FilterDrawer/SortRadios.tsx`
- Create: `components/Shop/FilterDrawer/CheckboxList.tsx`
- Create: `components/Shop/FilterDrawer/ColorSwatches.tsx`
- Create: `components/Shop/FilterDrawer/SizeChips.tsx`
- Create: `components/Shop/FilterDrawer/PriceRange.tsx`

- [ ] **Step 1: FilterAccordion (controlled by parent)**

```tsx
// components/Shop/FilterDrawer/FilterAccordion.tsx
'use client'
import type {ReactNode} from 'react'
import s from './FilterAccordion.module.scss'

interface Props {
  id: string
  title: string
  open: boolean
  onToggle: (id: string) => void
  children: ReactNode
}

export default function FilterAccordion({id, title, open, onToggle, children}: Props) {
  return (
    <div className={s.accordion}>
      <button
        type="button"
        className={s.header}
        aria-expanded={open}
        aria-controls={`acc-${id}`}
        onClick={() => onToggle(id)}
      >
        <span>{title}</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <div id={`acc-${id}`} hidden={!open} className={s.body}>
        {children}
      </div>
    </div>
  )
}
```

```scss
// components/Shop/FilterDrawer/FilterAccordion.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.accordion {
  border-bottom: 1px solid map-get($colors, 'lightgray-bg');
}

.header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: none;
  border: 0;
  padding: px(16) px(20);
  font-family: $MonumentGrotesk;
  font-size: px(13);
  letter-spacing: 0.5px;
  color: map-get($colors, 'darker');
  cursor: pointer;
}

.body {
  padding: 0 px(20) px(16);
}
```

- [ ] **Step 2: SortRadios**

```tsx
// components/Shop/FilterDrawer/SortRadios.tsx
'use client'
import type {SortKey} from '@/types/shop'
import {SORT_LABELS} from '@/types/shop'

interface Props {
  value: SortKey
  onChange: (next: SortKey) => void
}

const ORDER: SortKey[] = ['featured', 'newest', 'best-selling', 'price-asc', 'price-desc']

export default function SortRadios({value, onChange}: Props) {
  return (
    <ul style={{display: 'flex', flexDirection: 'column', gap: 8, padding: 0, margin: 0, listStyle: 'none'}}>
      {ORDER.map((sk) => (
        <li key={sk}>
          <label style={{display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer'}}>
            <input
              type="radio"
              name="sort"
              value={sk}
              checked={value === sk}
              onChange={() => onChange(sk)}
            />
            {SORT_LABELS[sk]}
          </label>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 3: CheckboxList**

```tsx
// components/Shop/FilterDrawer/CheckboxList.tsx
'use client'
import type {FilterValue} from '@/types/shop'
import {slugify} from '@/lib/shop/searchParams'

interface Props {
  values: FilterValue[]
  selected: string[]    // kebab-case values currently in state
  onToggle: (kebabValue: string) => void
}

export default function CheckboxList({values, selected, onToggle}: Props) {
  return (
    <ul style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 0, margin: 0, listStyle: 'none'}}>
      {values.map((v) => {
        const key = slugify(v.label)
        const checked = selected.includes(key)
        return (
          <li key={v.id}>
            <label style={{display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(key)}
                disabled={v.count === 0 && !checked}
              />
              <span>{v.label}</span>
              <span style={{color: '#9ca3af', marginLeft: 'auto', fontSize: 11}}>{v.count}</span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 4: ColorSwatches**

```tsx
// components/Shop/FilterDrawer/ColorSwatches.tsx
'use client'
import type {FilterValue} from '@/types/shop'
import {slugify} from '@/lib/shop/searchParams'

// Very small CSS color mapping. Unknown colors fall back to a circle outline.
const COLOR_MAP: Record<string, string> = {
  beige: '#e6d5b8',
  blue: '#7aa1c4',
  green: '#9ab68e',
  pink: '#e2bcb7',
  black: '#111',
  white: '#fff',
  grey: '#aaa',
  gray: '#aaa',
  brown: '#8b6b53',
}

interface Props {
  values: FilterValue[]
  selected: string[]
  onToggle: (kebabValue: string) => void
}

export default function ColorSwatches({values, selected, onToggle}: Props) {
  return (
    <ul style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 0, margin: 0, listStyle: 'none'}}>
      {values.map((v) => {
        const key = slugify(v.label)
        const checked = selected.includes(key)
        const bg = COLOR_MAP[key] ?? 'transparent'
        return (
          <li key={v.id}>
            <label style={{display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(key)}
                style={{display: 'none'}}
                disabled={v.count === 0 && !checked}
              />
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: bg,
                  border: '1px solid #c4c4c4',
                  outline: checked ? '2px solid #111' : 'none',
                  outlineOffset: 2,
                  display: 'inline-block',
                }}
              />
              <span>{v.label}</span>
              <span style={{color: '#9ca3af', marginLeft: 'auto', fontSize: 11}}>{v.count}</span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 5: SizeChips**

```tsx
// components/Shop/FilterDrawer/SizeChips.tsx
'use client'
import type {FilterValue} from '@/types/shop'
import {slugify} from '@/lib/shop/searchParams'

interface Props {
  values: FilterValue[]
  selected: string[]
  onToggle: (kebabValue: string) => void
}

export default function SizeChips({values, selected, onToggle}: Props) {
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
      {values.map((v) => {
        const key = slugify(v.label)
        const checked = selected.includes(key)
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onToggle(key)}
            disabled={v.count === 0 && !checked}
            style={{
              padding: '6px 10px',
              border: '1px solid #c4c4c4',
              background: checked ? '#111' : '#fff',
              color: checked ? '#fff' : '#111',
              cursor: v.count === 0 && !checked ? 'not-allowed' : 'pointer',
              fontSize: 11,
              letterSpacing: 0.5,
            }}
          >
            {v.label} <span style={{opacity: 0.6}}>({v.count})</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 6: PriceRange**

```tsx
// components/Shop/FilterDrawer/PriceRange.tsx
'use client'
import {useState, useEffect} from 'react'

interface Props {
  min?: string
  max?: string
  onChange: (next: {min?: string; max?: string}) => void
}

export default function PriceRange({min, max, onChange}: Props) {
  const [localMin, setLocalMin] = useState(min ?? '')
  const [localMax, setLocalMax] = useState(max ?? '')

  useEffect(() => {
    setLocalMin(min ?? '')
    setLocalMax(max ?? '')
  }, [min, max])

  function commit() {
    onChange({
      min: localMin || undefined,
      max: localMax || undefined,
    })
  }

  return (
    <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
      <label style={{display: 'flex', flexDirection: 'column', fontSize: 11}}>
        Min €
        <input
          type="number"
          value={localMin}
          onChange={(e) => setLocalMin(e.target.value)}
          onBlur={commit}
          style={{width: 80, padding: 6, border: '1px solid #c4c4c4'}}
        />
      </label>
      <label style={{display: 'flex', flexDirection: 'column', fontSize: 11}}>
        Max €
        <input
          type="number"
          value={localMax}
          onChange={(e) => setLocalMax(e.target.value)}
          onBlur={commit}
          style={{width: 80, padding: 6, border: '1px solid #c4c4c4'}}
        />
      </label>
    </div>
  )
}
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/Shop/FilterDrawer/
git commit -m "Add FilterDrawer atoms (Accordion, Sort, Checkbox, Color, Size, Price)"
```

---

### Task 5.11: FilterDrawer composition

**Files:**
- Create: `components/Shop/FilterDrawer/FilterDrawer.tsx`
- Create: `components/Shop/FilterDrawer/FilterDrawer.module.scss`

- [ ] **Step 1: SCSS**

```scss
// components/Shop/FilterDrawer/FilterDrawer.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 90;
}

.aside {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  background: #fff;
  z-index: 100;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  @include from(md) {
    width: px(480);
  }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: px(16) px(20);
  border-bottom: 1px solid map-get($colors, 'lightgray-bg');

  h2 {
    margin: 0;
    font-family: $MonumentGrotesk;
    font-size: px(13);
    letter-spacing: 0.5px;
  }

  button {
    background: none;
    border: 0;
    font-size: px(20);
    cursor: pointer;
    line-height: 1;
  }
}

.body {
  flex: 1;
  overflow-y: auto;
}

.footer {
  display: flex;
  gap: px(12);
  padding: px(16) px(20);
  border-top: 1px solid map-get($colors, 'lightgray-bg');
  background: #fff;
  position: sticky;
  bottom: 0;

  .clear {
    background: none;
    border: 0;
    text-decoration: underline;
    color: map-get($colors, 'darker');
    font-family: $MonumentGrotesk;
    font-size: px(11);
    letter-spacing: 0.5px;
    cursor: pointer;
  }

  .primary {
    flex: 1;
    background: map-get($colors, 'darker');
    color: #fff;
    border: 0;
    padding: px(14);
    font-family: $MonumentGrotesk;
    font-size: px(12);
    letter-spacing: 0.5px;
    cursor: pointer;
  }
}
```

- [ ] **Step 2: Composition component**

```tsx
// components/Shop/FilterDrawer/FilterDrawer.tsx
'use client'
import {useEffect, useMemo, useRef, useState} from 'react'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'
import type {FilterDefinition, ShopSearchParams, SortKey} from '@/types/shop'
import {serializeSearchParams, slugify} from '@/lib/shop/searchParams'
import {getFilterCount} from '@/app/(frontend)/shop/actions'
import FilterAccordion from './FilterAccordion'
import SortRadios from './SortRadios'
import CheckboxList from './CheckboxList'
import ColorSwatches from './ColorSwatches'
import SizeChips from './SizeChips'
import PriceRange from './PriceRange'
import s from './FilterDrawer.module.scss'

const FACET_ID = {
  productType: 'filter.p.product_type',
  color: 'filter.v.option.color',
  size: 'filter.v.option.size',
  pattern: 'filter.v.option.pattern',
}

interface Props {
  handle: string
  open: boolean
  facets: FilterDefinition[]
  defaults: ShopSearchParams
  initialCount: number
}

export default function FilterDrawer({handle, open, facets, defaults, initialCount}: Props) {
  const router = useRouter()
  const path = usePathname()
  const params = useSearchParams()

  const [state, setState] = useState<ShopSearchParams>(defaults)
  const [accordion, setAccordion] = useState<string | null>(null)
  const [count, setCount] = useState(initialCount)
  const lastFetch = useRef(0)

  // Reset local state when drawer opens
  useEffect(() => {
    if (open) {
      setState(defaults)
      setCount(initialCount)
    }
  }, [open, defaults, initialCount])

  // Scroll lock + ESC
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Debounced count refresh
  useEffect(() => {
    if (!open) return
    const id = ++lastFetch.current
    const t = setTimeout(() => {
      getFilterCount({handle, params: state}).then((n) => {
        if (id === lastFetch.current) setCount(n)
      })
    }, 250)
    return () => clearTimeout(t)
  }, [state, open, handle])

  function toggleAccordion(id: string) {
    setAccordion((cur) => (cur === id ? null : id))
  }

  function setSort(sort: SortKey) {
    setState((s) => ({...s, sort: sort === 'featured' ? undefined : sort}))
  }

  function toggleListValue(key: 'productType' | 'color' | 'size' | 'pattern', kebab: string) {
    setState((s) => {
      const current = (s[key] ?? '').split(',').filter(Boolean)
      const idx = current.indexOf(kebab)
      if (idx >= 0) current.splice(idx, 1)
      else current.push(kebab)
      return {...s, [key]: current.length ? current.join(',') : undefined}
    })
  }

  function setPrice(next: {min?: string; max?: string}) {
    setState((s) => ({...s, priceMin: next.min, priceMax: next.max}))
  }

  function clearAll() {
    setState({view: defaults.view, filters: 'open'})
  }

  function close() {
    const next = new URLSearchParams(params.toString())
    next.delete('filters')
    const q = next.toString()
    router.push(q ? `${path}?${q}` : path, {scroll: false})
  }

  function apply() {
    const stripped: ShopSearchParams = {...state}
    delete stripped.filters
    router.push(`${path}${serializeSearchParams(stripped)}`, {scroll: false})
  }

  const selected = useMemo(
    () => ({
      productType: (state.productType ?? '').split(',').filter(Boolean),
      color: (state.color ?? '').split(',').filter(Boolean),
      size: (state.size ?? '').split(',').filter(Boolean),
      pattern: (state.pattern ?? '').split(',').filter(Boolean),
    }),
    [state],
  )

  const facet = (id: string) => facets.find((f) => f.id === id)

  if (!open) return null

  return (
    <>
      <div className={s.backdrop} onClick={close} aria-hidden="true" />
      <aside className={s.aside} role="dialog" aria-modal="true" aria-label="Filter & Sort">
        <div className={s.header}>
          <h2>Filter &amp; Sort</h2>
          <button type="button" onClick={close} aria-label="Close">×</button>
        </div>
        <div className={s.body}>
          <FilterAccordion
            id="sort"
            title="Sort"
            open={accordion === 'sort'}
            onToggle={toggleAccordion}
          >
            <SortRadios value={state.sort ?? 'featured'} onChange={setSort} />
          </FilterAccordion>

          {facet(FACET_ID.productType) && (
            <FilterAccordion
              id="productType"
              title="Product"
              open={accordion === 'productType'}
              onToggle={toggleAccordion}
            >
              <CheckboxList
                values={facet(FACET_ID.productType)!.values}
                selected={selected.productType}
                onToggle={(v) => toggleListValue('productType', v)}
              />
            </FilterAccordion>
          )}

          {facet(FACET_ID.color) && (
            <FilterAccordion
              id="color"
              title="Color"
              open={accordion === 'color'}
              onToggle={toggleAccordion}
            >
              <ColorSwatches
                values={facet(FACET_ID.color)!.values}
                selected={selected.color}
                onToggle={(v) => toggleListValue('color', v)}
              />
            </FilterAccordion>
          )}

          {facet(FACET_ID.pattern) && (
            <FilterAccordion
              id="pattern"
              title="Pattern"
              open={accordion === 'pattern'}
              onToggle={toggleAccordion}
            >
              <CheckboxList
                values={facet(FACET_ID.pattern)!.values}
                selected={selected.pattern}
                onToggle={(v) => toggleListValue('pattern', v)}
              />
            </FilterAccordion>
          )}

          {facet(FACET_ID.size) && (
            <FilterAccordion
              id="size"
              title="Size"
              open={accordion === 'size'}
              onToggle={toggleAccordion}
            >
              <SizeChips
                values={facet(FACET_ID.size)!.values}
                selected={selected.size}
                onToggle={(v) => toggleListValue('size', v)}
              />
            </FilterAccordion>
          )}

          <FilterAccordion
            id="price"
            title="Price"
            open={accordion === 'price'}
            onToggle={toggleAccordion}
          >
            <PriceRange min={state.priceMin} max={state.priceMax} onChange={setPrice} />
          </FilterAccordion>
        </div>
        <div className={s.footer}>
          <button type="button" onClick={clearAll} className={s.clear}>
            Clear all
          </button>
          <button type="button" onClick={apply} className={s.primary}>
            View products ({count})
          </button>
        </div>
      </aside>
    </>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/Shop/FilterDrawer/FilterDrawer.tsx components/Shop/FilterDrawer/FilterDrawer.module.scss
git commit -m "Add FilterDrawer composition (state, debounced count, apply/clear)"
```

---

### Task 5.12: InfiniteScrollSentinel

**Files:**
- Create: `components/Shop/InfiniteScrollSentinel/InfiniteScrollSentinel.tsx`

- [ ] **Step 1: Component**

```tsx
// components/Shop/InfiniteScrollSentinel/InfiniteScrollSentinel.tsx
'use client'
import {useEffect, useRef, useState} from 'react'
import ProductCard from '@/components/PageBuilder/ProductCard/ProductCard'
import {fetchShopChunk} from '@/app/(frontend)/shop/actions'
import type {ProductCardData, ShopSearchParams} from '@/types/shop'

interface Props {
  handle: string
  params: ShopSearchParams
  initialOffset?: number
  initialCursor?: string
  hasMore: boolean
}

export default function InfiniteScrollSentinel({
  handle,
  params,
  initialOffset,
  initialCursor,
  hasMore: initialHasMore,
}: Props) {
  const [items, setItems] = useState<ProductCardData[]>([])
  const [offset, setOffset] = useState(initialOffset)
  const [cursor, setCursor] = useState(initialCursor)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setItems([])
    setOffset(initialOffset)
    setCursor(initialCursor)
    setHasMore(initialHasMore)
  }, [initialOffset, initialCursor, initialHasMore, handle, JSON.stringify(params)])

  useEffect(() => {
    if (!ref.current || !hasMore) return
    const target = ref.current
    const obs = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || loading || !hasMore) return
        setLoading(true)
        const res = await fetchShopChunk({handle, params, offset, cursor})
        setItems((prev) => [...prev, ...res.products])
        setOffset(res.nextOffset)
        setCursor(res.nextCursor)
        setHasMore(res.hasMore)
        setLoading(false)
      },
      {rootMargin: '600px'},
    )
    obs.observe(target)
    return () => obs.disconnect()
  }, [handle, params, offset, cursor, hasMore, loading])

  return (
    <>
      {items.map((p) => (
        <ProductCard
          key={p.id}
          product={{
            _id: p.id,
            title: p.title,
            handle: p.handle,
            imageUrl: p.imageUrl,
            minPrice: p.minPrice,
            maxPrice: p.maxPrice,
            compareAtPrice: p.compareAtPrice,
            tags: p.tags,
          }}
        />
      ))}
      {hasMore && <div ref={ref} style={{height: 1}} aria-hidden="true" />}
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/Shop/InfiniteScrollSentinel/
git commit -m "Add InfiniteScrollSentinel for shop archive pagination"
```

---

### Task 5.13: ShopArchive composition (server)

**Files:**
- Create: `app/(frontend)/shop/ShopArchive.tsx`

- [ ] **Step 1: Component**

```tsx
// app/(frontend)/shop/ShopArchive.tsx
import {Suspense} from 'react'
import Breadcrumb from '@/components/Shop/Breadcrumb/Breadcrumb'
import PageHeader from '@/components/Shop/PageHeader/PageHeader'
import ProductGrid, {ProductGridSkeleton} from '@/components/Shop/ProductGrid/ProductGrid'
import InfiniteScrollSentinel from '@/components/Shop/InfiniteScrollSentinel/InfiniteScrollSentinel'
import FilterDrawer from '@/components/Shop/FilterDrawer/FilterDrawer'
import {getCollectionByHandle, getOrderedHandles} from '@/sanity/queries/queries/shop'
import {
  getCollectionFilters,
  getCollectionMeta,
  getCollectionProducts,
  getAllProductsForFilters,
} from '@/lib/shopify'
import {buildShopifyFilters, getActiveFilters, parseSearchParams} from '@/lib/shop/searchParams'
import {ALL_HANDLE, CHUNK_SIZE, type BreadcrumbCrumb, type ShopSearchParams} from '@/types/shop'

interface Props {
  handle: string
  searchParams: Record<string, string | string[] | undefined>
}

export default async function ShopArchive({handle, searchParams}: Props) {
  const params: ShopSearchParams = parseSearchParams(searchParams)
  const sort = params.sort ?? 'featured'
  const view = params.view ?? '4col'

  const [sanityCol, shopifyMeta, facetsRaw, orderedHandles] = await Promise.all([
    getCollectionByHandle(handle),
    getCollectionMeta(handle),
    getCollectionFilters(handle, {filters: []}),
    sort === 'featured' ? getOrderedHandles(handle) : Promise.resolve<string[]>([]),
  ])

  const title = sanityCol?.title ?? shopifyMeta?.title ?? (handle === ALL_HANDLE ? 'Shop' : handle)
  const description = sanityCol?.descriptionHtml ?? shopifyMeta?.descriptionHtml ?? undefined
  const crumbs = buildCrumbs(handle, sanityCol)
  const facets = facetsRaw
  const filters = buildShopifyFilters(params, facets)
  const active = getActiveFilters(params, facets)

  // Initial chunk + total count
  let products: ReturnType<typeof toCard>[] = []
  let total = 0
  let hasMore = false
  let nextOffset: number | undefined
  let nextCursor: string | undefined

  if (sort === 'featured') {
    const matching = await getAllProductsForFilters(handle, filters)
    const matchByHandle = new Map(matching.map((p) => [p.handle, p]))
    const ordered = orderedHandles.map((h) => matchByHandle.get(h)).filter(Boolean)
    total = ordered.length
    const slice = ordered.slice(0, CHUNK_SIZE)
    products = slice.map(toCard)
    hasMore = total > CHUNK_SIZE
    nextOffset = CHUNK_SIZE
  } else {
    const SORT_MAP: Record<string, {sortKey: string; reverse: boolean}> = {
      newest: {sortKey: 'CREATED', reverse: true},
      'price-asc': {sortKey: 'PRICE', reverse: false},
      'price-desc': {sortKey: 'PRICE', reverse: true},
      'best-selling': {sortKey: 'BEST_SELLING', reverse: false},
    }
    const map = SORT_MAP[sort]
    const page = await getCollectionProducts(handle, {
      filters,
      sortKey: map.sortKey as never,
      reverse: map.reverse,
      first: CHUNK_SIZE,
    })
    products = page.nodes.map(toCard)
    hasMore = page.pageInfo.hasNextPage
    nextCursor = page.pageInfo.endCursor ?? undefined
    // Total: count via getAllProductsForFilters for accurate header
    const all = await getAllProductsForFilters(handle, filters)
    total = all.length
  }

  const isOpen = params.filters === 'open'

  return (
    <>
      <Breadcrumb crumbs={crumbs} />
      <PageHeader
        title={title}
        count={total}
        view={view}
        active={active}
        description={description}
      />
      <Suspense fallback={<ProductGridSkeleton view={view} />}>
        <ProductGrid products={products} view={view} hasActiveFilters={active.length > 0} />
      </Suspense>
      <InfiniteScrollSentinel
        handle={handle}
        params={params}
        initialOffset={nextOffset}
        initialCursor={nextCursor}
        hasMore={hasMore}
      />
      <FilterDrawer
        handle={handle}
        open={isOpen}
        facets={facets}
        defaults={params}
        initialCount={total}
      />
    </>
  )
}

function buildCrumbs(
  handle: string,
  col: Awaited<ReturnType<typeof getCollectionByHandle>>,
): BreadcrumbCrumb[] {
  const out: BreadcrumbCrumb[] = [{label: 'Home', href: '/'}]
  if (handle === ALL_HANDLE) {
    out.push({label: 'Shop', href: null})
    return out
  }
  out.push({label: 'Shop', href: '/shop'})
  if (col?.parent?.parent) {
    out.push({label: col.parent.parent.title, href: `/shop/${col.parent.parent.handle}`})
  }
  if (col?.parent) {
    out.push({label: col.parent.title, href: `/shop/${col.parent.handle}`})
  }
  out.push({label: col?.title ?? handle, href: null})
  return out
}

type ShopifyProduct = Awaited<ReturnType<typeof getCollectionProducts>>['nodes'][number]

function toCard(p: ShopifyProduct) {
  const min = Number(p.priceRange.minVariantPrice.amount)
  const max = Number(p.priceRange.maxVariantPrice.amount)
  const compare = Number(p.compareAtPriceRange.maxVariantPrice.amount)
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    imageUrl: p.featuredImage?.url,
    imageAlt: p.featuredImage?.altText ?? undefined,
    minPrice: Number.isFinite(min) ? min : undefined,
    maxPrice: Number.isFinite(max) && max !== min ? max : undefined,
    compareAtPrice: Number.isFinite(compare) && compare > 0 ? compare : undefined,
    tags: Array.isArray(p.tags) ? p.tags.join(',') : undefined,
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(frontend\)/shop/ShopArchive.tsx
git commit -m "Add ShopArchive server composition for shop pages"
```

---

### Task 5.14: Route pages /shop and /shop/[handle]

**Files:**
- Create: `app/(frontend)/shop/page.tsx`
- Create: `app/(frontend)/shop/[handle]/page.tsx`

- [ ] **Step 1: /shop**

```tsx
// app/(frontend)/shop/page.tsx
import ShopArchive from './ShopArchive'
import {ALL_HANDLE} from '@/types/shop'

export const revalidate = 300

export default function ShopIndexPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  return <ShopArchive handle={ALL_HANDLE} searchParams={searchParams} />
}
```

- [ ] **Step 2: /shop/[handle]**

```tsx
// app/(frontend)/shop/[handle]/page.tsx
import {notFound} from 'next/navigation'
import ShopArchive from '../ShopArchive'
import {getCollectionMeta} from '@/lib/shopify'

export const revalidate = 300

export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: {handle: string}
  searchParams: Record<string, string | string[] | undefined>
}) {
  const meta = await getCollectionMeta(params.handle)
  if (!meta) notFound()
  return <ShopArchive handle={params.handle} searchParams={searchParams} />
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(frontend\)/shop/page.tsx app/\(frontend\)/shop/\[handle\]/page.tsx
git commit -m "Add /shop and /shop/[handle] route pages"
```

---

### Task 5.15: Smoke test + manual QA

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: server listens on `:3000` without runtime errors.

- [ ] **Step 2: Visit `/shop`**

Open `http://localhost:3000/shop` in a browser. Expected:
- Breadcrumb `Home > Shop`.
- Header `Shop` + `{N} products`.
- 4 columns of ProductCards (24 visible).
- Scroll to bottom → next chunk loads.

If the `all` collection doesn't exist in Shopify, the page renders with empty grid + "No products yet" empty state. Stop and ask the user to create it (smart collection with `available_for_sale = true`).

- [ ] **Step 3: Visit `/shop/[an-existing-handle]`**

Pick a known Shopify collection handle (e.g. from Shopify admin). Open `http://localhost:3000/shop/{handle}`. Expected:
- Breadcrumb shows category name.
- ProductCard count matches collection size.

- [ ] **Step 4: Toggle view**

Click 2-column toggle. Expected: URL gains `?view=2col`, grid switches.

- [ ] **Step 5: Open FilterDrawer**

Click "Filter & Sort". Expected: URL adds `?filters=open`, drawer slides in with backdrop. Open each accordion — they collapse the previous.

- [ ] **Step 6: Apply filter**

Pick a color. Counter at bottom updates after ~300ms. Click "View products (N)". Expected: URL gains `?color=...`, drawer closes, grid re-renders with the filtered set.

- [ ] **Step 7: Remove via chip**

Click the `×` in an active filter chip. Expected: URL param removed, grid re-renders.

- [ ] **Step 8: Change sort**

Open drawer → Sort → "Price low to high" → View products. Expected: URL gains `?sort=price-asc`, grid re-renders in price order.

- [ ] **Step 9: Mobile (devtools 375px)**

Expected: 2-column grid (regardless of view param), ViewToggle hidden, FilterDrawer full-screen.

- [ ] **Step 10: Final commit if any tweaks**

```bash
git status
# only commit if there are pending fixes from manual QA
```

---

## Self-Review (executed at plan-write time)

**Spec coverage:**
- §2 routes → Task 5.14 ✓
- §3 data flow → Tasks 5.4 + 5.6 + 5.13 ✓
- §4 filter mapping → Task 5.5 ✓
- §5 FilterDrawer → Tasks 5.10 + 5.11 ✓
- §6 ProductGrid + toggle → Tasks 5.8 + 5.9 ✓
- §7 Breadcrumb + PageHeader → Tasks 5.7 + 5.9 ✓
- §8 file structure → all tasks map ✓
- §9 cache → revalidate set on routes + Sanity `revalidate: 3600` + Shopify cache inherited; live counter via getFilterCount ✓
- §10 out of scope → respected ✓

**Placeholders:** Inline styles in FilterDrawer atoms (SortRadios, CheckboxList, ColorSwatches, SizeChips, PriceRange) — intentional to keep MVP fast; tagged as visual-polish-later. No "TBD" or "implement later" left.

**Type consistency:** `ShopSearchParams`, `SortKey`, `ViewMode`, `ProductCardData`, `ShopChunkResult` types defined once in Task 5.1 and referenced everywhere else. `fetchShopChunk` arg shape matches `InfiniteScrollSentinel` call site.

**Risks flagged:**
- Task 5.3 Step 2: product schema may not expose `store.collections[]._ref` in the form expected by GROQ. If empty result, fall back to a Shopify-only handle list (use `getCollectionProducts(handle, {sortKey: 'COLLECTION_DEFAULT'})` instead of orderRank).
- Task 5.15 Step 2: requires a Shopify smart collection named `all`. Document in the smoke test step.
