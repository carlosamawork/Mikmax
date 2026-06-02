# Buscador de productos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un buscador de productos con overlay predictivo en el header y página de resultados `/search?q=` que reutiliza el grid, filtros, orden e infinite scroll del shop.

**Architecture:** El listado del shop ya usa Shopify `search(query: "")`. Se parametriza el `query`, se extrae el pipeline de cards a un helper compartido (`lib/shop/buildCards.ts`) y `/search` reutiliza los mismos componentes (`ShopToolbar`, `ProductGrid`, `InfiniteScrollSentinel`, `FilterDrawer`) y server actions (`fetchShopChunk`, `getFilterCount`). El overlay usa una server action ligera `predictiveSearch`.

**Tech Stack:** Next.js 15 App Router (server components + server actions), Shopify Storefront API (GraphQL), TypeScript, SCSS modules.

**Nota sobre tests:** el proyecto no tiene framework de tests. La verificación de cada tarea es `npm run typecheck` + `npm run lint` + comprobación manual en navegador (`npm run dev`).

**Spec:** `docs/superpowers/specs/2026-06-02-buscador-productos-design.md`

---

## File Structure

**Nuevos**
- `lib/shop/buildCards.ts` — `buildAllCards(handle, params)` compartido (cards + facets), honra `params.q`.
- `app/(frontend)/search/page.tsx` — página de resultados.
- `app/(frontend)/search/search.module.scss` — estilos de la página de resultados.
- `app/(frontend)/search/actions.ts` — server action `predictiveSearch(q)`.
- `components/Layout/Header/SearchOverlay.tsx` — overlay predictivo (client).
- `components/Layout/Header/SearchOverlay.module.scss` — estilos del overlay.

**Modificados**
- `lib/shopify.js` — variable `$query` en queries + param en `getAllShopProducts`/`getAllShopFilters`.
- `types/shop.ts` — `'relevance'` en `SortKey`, label, `q?` en `ShopSearchParams`.
- `lib/shop/searchParams.ts` — parse/serialize `q`, `VALID_SORTS` con `'relevance'`.
- `app/(frontend)/shop/actions.ts` — usar `buildAllCards` compartido.
- `app/(frontend)/shop/ShopArchive.tsx` — usar `buildAllCards` compartido.
- `components/Shop/FilterDrawer/FilterDrawer.tsx` — prop `defaultSort` + preservar `q` en `clearAll`.
- `components/Layout/Header/HeaderClient.tsx` — cablear lupa (mobile + desktop) al overlay.

---

## Task 1: Parametrizar la búsqueda de Shopify con `query`

**Files:**
- Modify: `lib/shopify.js:508-579`

- [ ] **Step 1: Añadir la variable `$query` a `SEARCH_PRODUCTS_QUERY`**

En `lib/shopify.js`, reemplazar el bloque `SEARCH_PRODUCTS_QUERY` (líneas 508-536) por:

```js
const SEARCH_PRODUCTS_QUERY = `
  ${PRODUCT_CARD_FRAGMENT}
  query SearchProducts(
    $query: String = ""
    $filters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $first: Int!
    $after: String
  ) {
    search(
      query: $query
      types: PRODUCT
      productFilters: $filters
      sortKey: $sortKey
      reverse: $reverse
      first: $first
      after: $after
    ) {
      pageInfo { hasNextPage endCursor }
      nodes { ... on Product { ...ProductCard } }
      productFilters {
        id
        label
        type
        values { id label count input }
      }
    }
  }
`
```

- [ ] **Step 2: Añadir `$query` a `SEARCH_FILTERS_QUERY`**

Reemplazar el bloque `SEARCH_FILTERS_QUERY` (líneas 538-549) por:

```js
const SEARCH_FILTERS_QUERY = `
  query SearchFilters($query: String = "", $filters: [ProductFilter!]) {
    search(query: $query, types: PRODUCT, productFilters: $filters, first: 1) {
      productFilters {
        id
        label
        type
        values { id label count input }
      }
    }
  }
`

export async function getAllShopFilters({filters = [], query = ''} = {}) {
  const data = await shopifyData(SEARCH_FILTERS_QUERY, {filters, query})
  return data?.search?.productFilters ?? []
}
```

- [ ] **Step 3: Pasar `query` en `getAllShopProducts`**

Reemplazar `getAllShopProducts` (líneas 556-579) por:

```js
export async function getAllShopProducts(
  filters = [],
  {sortKey = 'RELEVANCE', reverse = false} = {},
  query = '',
) {
  const all = []
  let after = null
  let hasNext = true
  while (hasNext) {
    const data = await shopifyData(SEARCH_PRODUCTS_QUERY, {
      query,
      filters,
      sortKey,
      reverse,
      first: 250,
      after,
    })
    const search = data?.search
    if (!search) break
    all.push(...search.nodes)
    hasNext = search.pageInfo.hasNextPage
    after = search.pageInfo.endCursor
    if (all.length >= 5000) break
  }
  return all
}
```

- [ ] **Step 4: Verificar lint**

Run: `npm run lint`
Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 5: Verificar que el shop sigue funcionando (regresión)**

Run: `npm run dev`, abrir `http://localhost:3000/shop`.
Expected: el listado de productos carga igual que antes (el `query` por defecto es `""`).

- [ ] **Step 6: Commit**

```bash
git add lib/shopify.js
git commit -m "feat(search): parametrizar query en search de Shopify (getAllShopProducts/getAllShopFilters)"
```

---

## Task 2: Tipos y URL params para búsqueda (`q`, `relevance`)

**Files:**
- Modify: `types/shop.ts:3-30`
- Modify: `lib/shop/searchParams.ts:4,10-50`

- [ ] **Step 1: Añadir `'relevance'` al `SortKey`, su label y `q` a `ShopSearchParams`**

En `types/shop.ts`, reemplazar las líneas 3-30 por:

```ts
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
```

- [ ] **Step 2: Aceptar `relevance` en `VALID_SORTS` y parsear/serializar `q`**

En `lib/shop/searchParams.ts`:

Línea 4, reemplazar:
```ts
const VALID_SORTS: SortKey[] = ['featured', 'newest', 'price-asc', 'price-desc', 'best-selling']
```
por:
```ts
const VALID_SORTS: SortKey[] = [
  'featured',
  'relevance',
  'newest',
  'price-asc',
  'price-desc',
  'best-selling',
]
```

En `parseSearchParams`, justo antes de `return out` (línea 28), añadir:
```ts
  const q = pickFirst(raw.q)
  if (q) out.q = q
```

En `serializeSearchParams`, reemplazar la línea del sort (línea 39):
```ts
  if (params.sort && params.sort !== 'featured') usp.set('sort', params.sort)
```
por (omite ambos defaults: `featured` en shop, `relevance` en search):
```ts
  if (params.sort && params.sort !== 'featured' && params.sort !== 'relevance')
    usp.set('sort', params.sort)
```

Y justo después de esa línea de sort, añadir la serialización de `q`:
```ts
  if (params.q) usp.set('q', params.q)
```

- [ ] **Step 3: Verificar typecheck y lint**

Run: `npm run typecheck && npm run lint`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add types/shop.ts lib/shop/searchParams.ts
git commit -m "feat(search): tipos y URL params para busqueda (q, relevance)"
```

---

## Task 3: Extraer `buildAllCards` compartido (DRY shop + search)

**Files:**
- Create: `lib/shop/buildCards.ts`
- Modify: `app/(frontend)/shop/actions.ts:18-135`
- Modify: `app/(frontend)/shop/ShopArchive.tsx:1-174`

- [ ] **Step 1: Crear `lib/shop/buildCards.ts`**

Crear el archivo con el pipeline extraído (devuelve `cards` y `facets`; honra `params.q`; el default de sort depende de si hay query):

```ts
// lib/shop/buildCards.ts
import {
  getCollectionFilters,
  getAllProductsForFilters,
  getAllShopFilters,
  getAllShopProducts,
} from '@/lib/shopify'
import {getOrderedHandles} from '@/sanity/queries/queries/shop'
import {buildShopifyFilters, extractSelectedColorGids} from '@/lib/shop/searchParams'
import {expandProductsToCards} from '@/lib/shop/expandToCards'
import {filterProductsByMaterial} from '@/lib/shop/materialFilter'
import {applyCardFilters, sortCards} from '@/lib/shop/filterAndSortCards'
import {ALL_HANDLE} from '@/types/shop'
import type {FilterDefinition, ProductCardData, ShopSearchParams, SortKey} from '@/types/shop'

type ShopifyVariantNode = {
  id: string
  availableForSale: boolean
  image?: {url: string; altText?: string | null} | null
  price: {amount: string}
  compareAtPrice?: {amount: string} | null
  selectedOptions: {name: string; value: string}[]
  colorPattern?: {
    type: string
    value: string | null
    references?: {nodes: Array<{id: string; name?: string; handle?: string}>} | null
  } | null
}

type MaterialMetaobjectNode = {fields?: {key: string; value: string | null}[]}
type MaterialMetafield = {references?: {nodes: MaterialMetaobjectNode[]} | null} | null

export type ShopifyProductNode = {
  id: string
  handle: string
  title: string
  tags?: string[]
  coverMaterial?: MaterialMetafield
  fillerMaterial?: MaterialMetafield
  fabric?: MaterialMetafield
  featuredImage?: {url: string; altText?: string | null} | null
  priceRange: {
    minVariantPrice: {amount: string}
    maxVariantPrice: {amount: string}
  }
  compareAtPriceRange: {maxVariantPrice: {amount: string}}
  options?: {name: string; values: string[]}[]
  variants?: {nodes: ShopifyVariantNode[]}
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
 * - handle === 'all' (o cualquier valor con params.q) usa el endpoint `search`.
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
```

- [ ] **Step 2: Refactorizar `shop/actions.ts` para usar el helper**

Reemplazar **todo** el contenido de `app/(frontend)/shop/actions.ts` por:

```ts
// app/(frontend)/shop/actions.ts
'use server'

import {buildAllCards} from '@/lib/shop/buildCards'
import {CHUNK_SIZE} from '@/types/shop'
import type {ShopChunkResult, ShopSearchParams} from '@/types/shop'

export async function fetchShopChunk(args: {
  handle: string
  params: ShopSearchParams
  offset?: number
  cursor?: string
}): Promise<ShopChunkResult> {
  const offset = args.offset ?? 0
  const {cards} = await buildAllCards(args.handle, args.params)
  const slice = cards.slice(offset, offset + CHUNK_SIZE)
  return {
    products: slice,
    hasMore: offset + CHUNK_SIZE < cards.length,
    nextOffset: offset + CHUNK_SIZE,
  }
}

export async function getFilterCount(args: {
  handle: string
  params: ShopSearchParams
}): Promise<number> {
  const {cards} = await buildAllCards(args.handle, args.params)
  return cards.length
}
```

- [ ] **Step 3: Refactorizar `ShopArchive.tsx` para usar el helper**

Reemplazar **todo** el contenido de `app/(frontend)/shop/ShopArchive.tsx` por:

```tsx
import {Suspense} from 'react'
import ShopToolbar from '@/components/Shop/ShopToolbar/ShopToolbar'
import ProductGrid, {ProductGridSkeleton} from '@/components/Shop/ProductGrid/ProductGrid'
import InfiniteScrollSentinel from '@/components/Shop/InfiniteScrollSentinel/InfiniteScrollSentinel'
import FilterDrawer from '@/components/Shop/FilterDrawer/FilterDrawer'
import {parseSearchParams} from '@/lib/shop/searchParams'
import {buildAllCards} from '@/lib/shop/buildCards'
import {CHUNK_SIZE, type ProductCardData, type ShopSearchParams} from '@/types/shop'

interface Props {
  handle: string
  searchParams: Record<string, string | string[] | undefined>
}

export default async function ShopArchive({handle, searchParams}: Props) {
  const params: ShopSearchParams = parseSearchParams(searchParams)
  const view = params.view ?? '4col'

  const {cards, facets} = await buildAllCards(handle, params)
  const total = cards.length
  const products: ProductCardData[] = cards.slice(0, CHUNK_SIZE)
  const hasMore = total > CHUNK_SIZE
  const isOpen = params.filters === 'open'

  return (
    <>
      <ShopToolbar view={view} />
      <Suspense fallback={<ProductGridSkeleton view={view} />}>
        <ProductGrid products={products} view={view} hasActiveFilters={products.length === 0}>
          <InfiniteScrollSentinel
            handle={handle}
            params={params}
            initialOffset={CHUNK_SIZE}
            hasMore={hasMore}
          />
        </ProductGrid>
      </Suspense>
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
```

- [ ] **Step 4: Verificar typecheck y lint**

Run: `npm run typecheck && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Verificar shop (regresión) en navegador**

Run: `npm run dev`. Comprobar en `http://localhost:3000/shop` y en una colección `http://localhost:3000/shop/<handle>`:
- el grid carga,
- los filtros y el sort funcionan (abrir drawer, aplicar color/precio),
- el infinite scroll trae más productos al hacer scroll.

- [ ] **Step 6: Commit**

```bash
git add lib/shop/buildCards.ts "app/(frontend)/shop/actions.ts" "app/(frontend)/shop/ShopArchive.tsx"
git commit -m "refactor(shop): extraer buildAllCards compartido (cards + facets)"
```

---

## Task 4: Generalizar `FilterDrawer` (default sort + preservar `q`)

**Files:**
- Modify: `components/Shop/FilterDrawer/FilterDrawer.tsx:23-41,96-119,167`

- [ ] **Step 1: Añadir prop `defaultSort` a la interfaz `Props`**

En `components/Shop/FilterDrawer/FilterDrawer.tsx`, reemplazar el bloque `interface Props` + firma de la función (líneas 23-41) por:

```tsx
interface Props {
  handle: string
  open: boolean
  facets: FilterDefinition[]
  defaults: ShopSearchParams
  initialCount: number
  countAction?: (args: {handle: string; params: ShopSearchParams}) => Promise<number>
  sortOptions?: SortKey[]
  defaultSort?: SortKey
}

export default function FilterDrawer({
  handle,
  open,
  facets,
  defaults,
  initialCount,
  countAction = defaultCountAction,
  sortOptions,
  defaultSort = 'featured',
}: Props) {
```

- [ ] **Step 2: Usar `defaultSort` en `setSort` y preservar `q` en `clearAll`**

Reemplazar `setSort` (líneas 96-98) por:

```tsx
  function setSort(sort: SortKey) {
    setState((s) => ({...s, sort: sort === defaultSort ? undefined : sort}))
  }
```

Reemplazar `clearAll` (líneas 117-119) por (mantiene el texto de búsqueda al limpiar filtros):

```tsx
  function clearAll() {
    setState({view: defaults.view, filters: 'open', q: defaults.q})
  }
```

- [ ] **Step 3: Usar `defaultSort` como valor por defecto del `SortRadios`**

Reemplazar la línea 167:

```tsx
            <SortRadios value={state.sort ?? 'featured'} onChange={setSort} options={sortOptions} />
```
por:
```tsx
            <SortRadios value={state.sort ?? defaultSort} onChange={setSort} options={sortOptions} />
```

- [ ] **Step 4: Verificar typecheck y lint**

Run: `npm run typecheck && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Verificar shop (regresión)**

Run: `npm run dev`, en `http://localhost:3000/shop` abrir el drawer: el sort por defecto sigue marcando "Latest novelty" y aplicar filtros funciona igual.

- [ ] **Step 6: Commit**

```bash
git add components/Shop/FilterDrawer/FilterDrawer.tsx
git commit -m "feat(search): FilterDrawer admite defaultSort y preserva q al limpiar"
```

---

## Task 5: Página `/search` + server action `predictiveSearch`

**Files:**
- Create: `app/(frontend)/search/actions.ts`
- Create: `app/(frontend)/search/page.tsx`
- Create: `app/(frontend)/search/search.module.scss`

- [ ] **Step 1: Crear la server action `predictiveSearch`**

Crear `app/(frontend)/search/actions.ts`:

```ts
// app/(frontend)/search/actions.ts
'use server'

import {buildAllCards} from '@/lib/shop/buildCards'
import {ALL_HANDLE} from '@/types/shop'
import type {ProductCardData} from '@/types/shop'

export type PredictiveResult = {
  cards: ProductCardData[]
  total: number
}

const PREVIEW_LIMIT = 6

export async function predictiveSearch(q: string): Promise<PredictiveResult> {
  const query = q.trim()
  if (!query) return {cards: [], total: 0}
  const {cards} = await buildAllCards(ALL_HANDLE, {q: query, sort: 'relevance'})
  return {cards: cards.slice(0, PREVIEW_LIMIT), total: cards.length}
}
```

- [ ] **Step 2: Crear los estilos de la página**

Crear `app/(frontend)/search/search.module.scss`:

```scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.head {
  display: flex;
  flex-direction: column;
  gap: px(4);
  padding: px(20) px(15) px(10);

  .title {
    margin: 0;
    font-family: $MonumentGrotesk;
    font-size: px(16);
    line-height: px(22);
    letter-spacing: 0.5px;
    color: map-get($colors, 'darker');
  }

  .count {
    margin: 0;
    font-family: $MonumentGrotesk;
    font-size: px(11);
    line-height: px(15);
    letter-spacing: 0.5px;
    color: map-get($colors, 'gray');
  }
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: px(8);
  padding: px(80) px(15);
  font-family: $MonumentGrotesk;
  color: map-get($colors, 'gray');

  .emptyTitle {
    margin: 0;
    font-size: px(16);
    color: map-get($colors, 'darker');
  }

  .emptyText {
    margin: 0;
    font-size: px(13);
  }
}
```

- [ ] **Step 3: Crear la página `/search`**

Crear `app/(frontend)/search/page.tsx`:

```tsx
import type {Metadata} from 'next'
import {Suspense} from 'react'
import ShopToolbar from '@/components/Shop/ShopToolbar/ShopToolbar'
import ProductGrid, {ProductGridSkeleton} from '@/components/Shop/ProductGrid/ProductGrid'
import InfiniteScrollSentinel from '@/components/Shop/InfiniteScrollSentinel/InfiniteScrollSentinel'
import FilterDrawer from '@/components/Shop/FilterDrawer/FilterDrawer'
import {parseSearchParams} from '@/lib/shop/searchParams'
import {buildAllCards} from '@/lib/shop/buildCards'
import {ALL_HANDLE, CHUNK_SIZE, type ProductCardData, type SortKey} from '@/types/shop'
import s from './search.module.scss'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Buscar | Mikmax',
  robots: {index: false, follow: true},
}

const SEARCH_SORTS: SortKey[] = ['relevance', 'price-asc', 'price-desc']

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SearchPage({searchParams}: Props) {
  const raw = await searchParams
  const params = parseSearchParams(raw)
  const q = (params.q ?? '').trim()
  const view = params.view ?? '4col'

  if (!q) {
    return (
      <div className={s.empty}>
        <p className={s.emptyTitle}>Busca productos</p>
        <p className={s.emptyText}>Escribe en el buscador para ver resultados.</p>
      </div>
    )
  }

  const {cards, facets} = await buildAllCards(ALL_HANDLE, params)
  const total = cards.length
  const products: ProductCardData[] = cards.slice(0, CHUNK_SIZE)
  const hasMore = total > CHUNK_SIZE
  const isOpen = params.filters === 'open'

  return (
    <>
      <header className={s.head}>
        <h1 className={s.title}>Resultados para «{q}»</h1>
        <p className={s.count}>{total} productos</p>
      </header>
      <ShopToolbar view={view} />
      <Suspense fallback={<ProductGridSkeleton view={view} />}>
        <ProductGrid products={products} view={view} hasActiveFilters={products.length === 0}>
          <InfiniteScrollSentinel
            handle={ALL_HANDLE}
            params={params}
            initialOffset={CHUNK_SIZE}
            hasMore={hasMore}
          />
        </ProductGrid>
      </Suspense>
      <FilterDrawer
        handle={ALL_HANDLE}
        open={isOpen}
        facets={facets}
        defaults={params}
        initialCount={total}
        sortOptions={SEARCH_SORTS}
        defaultSort="relevance"
      />
    </>
  )
}
```

- [ ] **Step 4: Verificar typecheck y lint**

Run: `npm run typecheck && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Verificar la página en navegador**

Run: `npm run dev`. Comprobar:
- `http://localhost:3000/search` (sin `q`) → muestra el estado vacío "Busca productos".
- `http://localhost:3000/search?q=<algo del catálogo>` → muestra encabezado "Resultados para «…»", el conteo, el grid; abrir el drawer y comprobar que el sort muestra solo Relevance / Price asc / Price desc y que aplicar filtros/precio mantiene el `q` en la URL.
- `http://localhost:3000/search?q=zxqwnoexiste` → grid vacío ("No products match your filters.").

- [ ] **Step 6: Commit**

```bash
git add "app/(frontend)/search/actions.ts" "app/(frontend)/search/page.tsx" "app/(frontend)/search/search.module.scss"
git commit -m "feat(search): pagina /search reutilizando grid/filtros/orden del shop + predictiveSearch"
```

---

## Task 6: Overlay predictivo en el header

**Files:**
- Create: `components/Layout/Header/SearchOverlay.tsx`
- Create: `components/Layout/Header/SearchOverlay.module.scss`
- Modify: `components/Layout/Header/HeaderClient.tsx:4,21-30,158-218`

- [ ] **Step 1: Crear los estilos del overlay**

Crear `components/Layout/Header/SearchOverlay.module.scss`:

```scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.2);
}

.panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 201;
  background: map-get($colors, 'white');
  padding: px(15);
  display: flex;
  flex-direction: column;
  gap: px(15);
  max-height: 80vh;
  overflow-y: auto;
}

.form {
  display: flex;
  align-items: center;
  gap: px(10);
  border-bottom: 1px solid map-get($colors, 'darker');
  padding-bottom: px(8);

  .input {
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    font-family: $MonumentGrotesk;
    font-size: px(16);
    color: map-get($colors, 'darker');
  }

  .close {
    border: 0;
    background: transparent;
    cursor: pointer;
    font-size: px(18);
    line-height: 1;
    color: map-get($colors, 'darker');
  }
}

.results {
  display: flex;
  flex-direction: column;
}

.item {
  display: flex;
  align-items: center;
  gap: px(10);
  padding: px(8) 0;
  text-decoration: none;
  color: inherit;

  .thumb {
    width: px(48);
    height: px(60);
    object-fit: cover;
    flex-shrink: 0;
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: px(2);

    .itemTitle {
      font-family: $MonumentGrotesk;
      font-size: px(13);
      line-height: px(17);
      color: map-get($colors, 'darker');
    }

    .itemPrice {
      font-family: $MonumentGrotesk;
      font-size: px(11);
      color: map-get($colors, 'gray');
    }
  }
}

.viewAll {
  font-family: $MonumentGrotesk;
  font-size: px(13);
  letter-spacing: 0.5px;
  color: map-get($colors, 'darker');
  text-decoration: underline;
  padding: px(8) 0;
}

.message {
  font-family: $MonumentGrotesk;
  font-size: px(13);
  color: map-get($colors, 'gray');
  padding: px(8) 0;
}
```

- [ ] **Step 2: Crear el componente `SearchOverlay`**

Crear `components/Layout/Header/SearchOverlay.tsx`:

```tsx
'use client'

import {useEffect, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {predictiveSearch, type PredictiveResult} from '@/app/(frontend)/search/actions'
import s from './SearchOverlay.module.scss'

interface Props {
  open: boolean
  onClose: () => void
}

const EMPTY: PredictiveResult = {cards: [], total: 0}

function formatPrice(min?: number): string {
  if (typeof min !== 'number') return ''
  return `${min.toFixed(2)} €`
}

export default function SearchOverlay({open, onClose}: Props) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [result, setResult] = useState<PredictiveResult>(EMPTY)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const lastFetch = useRef(0)

  // Foco + reset al abrir; lock de scroll + ESC.
  useEffect(() => {
    if (!open) return
    setValue('')
    setResult(EMPTY)
    inputRef.current?.focus()
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  // Búsqueda predictiva con debounce 250ms.
  useEffect(() => {
    if (!open) return
    const q = value.trim()
    if (!q) {
      setResult(EMPTY)
      return
    }
    const id = ++lastFetch.current
    setLoading(true)
    const t = setTimeout(() => {
      predictiveSearch(q).then((r) => {
        if (id === lastFetch.current) {
          setResult(r)
          setLoading(false)
        }
      })
    }, 250)
    return () => clearTimeout(t)
  }, [value, open])

  function goToResults() {
    const q = value.trim()
    if (!q) return
    onClose()
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    goToResults()
  }

  if (!open) return null

  const q = value.trim()
  const showNoResults = q.length > 0 && !loading && result.total === 0

  return (
    <>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={s.panel} role="dialog" aria-modal="true" aria-label="Buscar productos">
        <form className={s.form} onSubmit={onSubmit}>
          <input
            ref={inputRef}
            type="search"
            className={s.input}
            placeholder="Buscar productos…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="button" className={s.close} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </form>

        {result.cards.length > 0 && (
          <div className={s.results}>
            {result.cards.map((p) => (
              <Link
                key={p.id}
                href={p.colorSlug ? `/products/${p.handle}?color=${p.colorSlug}` : `/products/${p.handle}`}
                className={s.item}
                onClick={onClose}
              >
                {p.imageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.imageUrl} alt={p.title} className={s.thumb} />
                )}
                <span className={s.info}>
                  <span className={s.itemTitle}>{p.title}</span>
                  <span className={s.itemPrice}>{formatPrice(p.minPrice)}</span>
                </span>
              </Link>
            ))}
            <button type="button" className={s.viewAll} onClick={goToResults}>
              Ver los {result.total} resultados →
            </button>
          </div>
        )}

        {showNoResults && <p className={s.message}>Sin resultados para «{q}».</p>}
      </div>
    </>
  )
}
```

> **Nota:** el overlay usa `<img>` para los thumbnails (no `LazyImage`) porque son imágenes pequeñas dentro de un panel ya visible y el lazy-loading no aporta aquí. El comentario `eslint-disable-next-line` evita el error de la regla `@next/next/no-img-element`. Si prefieres respetar la convención de `LazyImage` del proyecto, sustitúyelo en este step por `LazyImage` con `width={48} height={60}`.

- [ ] **Step 3: Cablear el overlay en `HeaderClient`**

En `components/Layout/Header/HeaderClient.tsx`:

(a) Línea 4, añadir `SearchOverlay` al set de imports tras los existentes (debajo de la línea de `getInternalHref`, línea 13):
```tsx
import SearchOverlay from './SearchOverlay'
```

(b) Tras la línea 24 (`const [mobileOpen, setMobileOpen] = useState(false)`), añadir:
```tsx
  const [searchOpen, setSearchOpen] = useState(false)
```

(c) Reemplazar el bloque de search desktop comentado (líneas 161-166) por un botón funcional:
```tsx
            <button
              type="button"
              className={s.actionBtn}
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              Search
            </button>
```

(d) Reemplazar el botón de search mobile (líneas 179-188) añadiéndole el `onClick`:
```tsx
            <button
              type="button"
              className={s.iconBtn}
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <LazyImage
                src="/icons/search.svg"
                alt=""
                width={35}
                height={35}
                className={s.iconImg}
                priority
              />
            </button>
```

(e) Justo antes del `<MobileMenu ... />` (línea 231), añadir el overlay:
```tsx
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
```

- [ ] **Step 4: Verificar typecheck y lint**

Run: `npm run typecheck && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Verificar el overlay en navegador**

Run: `npm run dev`. En cualquier página:
- Pulsar la lupa (desktop "Search" y mobile icono) → abre el overlay con foco en el input.
- Escribir un término del catálogo → tras ~250ms aparecen hasta 6 mini-cards con imagen/título/precio y la fila "Ver los N resultados →".
- Click en una mini-card → navega a la PDP y cierra el overlay.
- Click en "Ver los N resultados" o Enter → navega a `/search?q=…`.
- Escribir algo inexistente → "Sin resultados para «…»".
- Escape / click en backdrop → cierra.

- [ ] **Step 6: Commit**

```bash
git add components/Layout/Header/SearchOverlay.tsx components/Layout/Header/SearchOverlay.module.scss components/Layout/Header/HeaderClient.tsx
git commit -m "feat(search): overlay predictivo en el header (desktop + mobile)"
```

---

## Self-review (cubierto por el plan)

- **Capa de datos `query`** → Task 1.
- **`q` + `relevance` en tipos/URL** → Task 2.
- **`buildAllCards` compartido (DRY) + reuso de actions** → Task 3.
- **`/search` con filtros+orden completos + facets del resultado** → Task 5 (reusa drawer de Task 4).
- **Sort honesto en search (relevance/price)** → Task 5 (`SEARCH_SORTS`) + Task 2 (label).
- **Overlay predictivo: top productos + "ver N" + sin-resultados** → Task 6.
- **Header desktop + mobile** → Task 6.
- **Edge cases:** `/search` sin `q` (Task 5 estado vacío), sin resultados (Task 5 grid vacío + Task 6 mensaje), `noindex`/`dynamic` (Task 5), preservar `q` al limpiar filtros (Task 4).
- **Límite conocido del predictive** documentado en el spec; `predictiveSearch` reutiliza `buildAllCards` (Task 5 Step 1).
```
