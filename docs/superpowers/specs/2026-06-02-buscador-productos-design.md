# Buscador de productos — Design

**Fecha:** 2026-06-02
**Estado:** Aprobado (pendiente de plan de implementación)

## Objetivo

Añadir un buscador de productos a Mikmax con dos superficies:

1. **Overlay predictivo** en el header: al pulsar la lupa se abre un overlay con input
   que muestra resultados instantáneos (top 6) mientras se escribe, con enlace a la
   página de resultados completa.
2. **Página de resultados `/search?q=`**: reutiliza el grid, los filtros, el orden y el
   infinite scroll del shop, con facets acotados al conjunto de la búsqueda.

## Decisiones (brainstorming)

| Tema | Decisión |
|---|---|
| Experiencia | Overlay predictivo **+** página de resultados |
| Motor | **Shopify Storefront `search(query)`** (mismo origen que el listado del shop) |
| Controles en `/search` | Filtros + orden completos (reutiliza `FilterDrawer`) |
| Contenido del overlay | Top productos (mini-cards) + enlace "Ver los N resultados" + "sin resultados" mínimo |
| Enfoque de código | **A** — parametrizar la capa de datos del shop + archive compartido |

## Insight que abarata todo

`getAllShopProducts` ya usa el endpoint top-level `search(query: "")` de Shopify
(`lib/shopify.js:556-579`, `SEARCH_PRODUCTS_QUERY:508-536`). El listado del shop ya es
"una búsqueda con texto vacío". Buscar de verdad es pasar el `query`. Además los facets
salen de `search.productFilters`, que Shopify calcula sobre el conjunto buscado → los
filtros quedan acotados a los resultados sin trabajo extra.

`query: ""` está **hardcodeado** en `SEARCH_PRODUCTS_QUERY` (línea 518) y
`SEARCH_FILTERS_QUERY` (línea 540). Se parametriza con una variable GraphQL.

## Arquitectura

### 1. Capa de datos (cambios aditivos)

**`lib/shopify.js`**
- Añadir variable GraphQL `$query: String = ""` a `SEARCH_PRODUCTS_QUERY` y
  `SEARCH_FILTERS_QUERY`, reemplazando `query: ""` por `query: $query`.
- `getAllShopProducts(filters = [], {sortKey, reverse} = {}, query = '')` → pasa `query`.
- `getAllShopFilters({filters = [], query = ''} = {})` → pasa `query`.
- **Con `query` por defecto `''`, el `/shop` actual se comporta exactamente igual.**

**`lib/shop/buildCards.ts` (NUEVO) — refactor DRY**
- Hoy el pipeline de cards (facets → `buildShopifyFilters` → `getAllShopProducts` →
  reorden → `filterProductsByMaterial` → `expandProductsToCards` → `applyCardFilters` →
  `sortCards`) está **duplicado** en:
  - `app/(frontend)/shop/ShopArchive.tsx:96-143`
  - `app/(frontend)/shop/actions.ts:73-111` (`buildAllCards`)
- Se extrae a `lib/shop/buildCards.ts` como `buildAllCards(handle, params)`, que además
  lee `params.q` y lo pasa a `getAllShopProducts`/`getAllShopFilters`.
- `ShopArchive.tsx` y `shop/actions.ts` pasan a usar el helper compartido. Una sola
  fuente de verdad para shop y search.

**Orden / sort**
- `types/shop.ts`: añadir `'relevance'` a `SortKey` y `q?: string` a `ShopSearchParams`.
- El endpoint `search` de Shopify solo soporta `RELEVANCE` y `PRICE` para productos
  (ya documentado en `SEARCH_SORT_MAP`). En el pipeline:
  - `sort === 'featured'` → reorden por `getOrderedHandles()` de Sanity (**solo shop**).
  - `sort === 'relevance'` → sin reorden; se conserva el orden de relevancia de Shopify
    (`searchSort = undefined`, default RELEVANCE) (**solo search**).
  - `price-asc` / `price-desc` → `sortCards` reordena en JS (igual que hoy).
- Shop y search no comparten default: shop = `'featured'`, search = `'relevance'`.

### 2. Página `/search`

**`app/(frontend)/search/page.tsx` (NUEVO, server component)**
- Lee `searchParams` (`q` + filtros). `dynamic = 'force-dynamic'`.
- `metadata`: `robots: { index: false, follow: true }` (las páginas de resultados no se
  indexan). `title`: `Buscar "<q>" | Mikmax` (o título genérico sin `q`).
- Si **no hay `q`**: estado vacío con prompt ("Busca productos…"), sin fetch a Shopify.
- Con `q`: calcula el primer chunk con `buildAllCards(ALL_HANDLE, {...params, q})` y
  renderiza encabezado "Resultados para «q»" + los componentes del shop:
  `ShopToolbar` + `ProductGrid` + `InfiniteScrollSentinel` + `FilterDrawer`.

**Reutilización de server actions**
- `fetchShopChunk` y `getFilterCount` (`shop/actions.ts`) se reutilizan **sin cambios**:
  como `q` viaja dentro de `params` y `buildAllCards` lo honra, el infinite scroll y el
  contador de filtros del drawer funcionan en search automáticamente.
- `InfiniteScrollSentinel` y `FilterDrawer` se montan con `handle = ALL_HANDLE` y los
  `params` (que incluyen `q`).

**Sort options del drawer en search**
- `SortRadios` ya está generalizado para recibir `options`. En `/search` se pasan:
  Relevancia (default), Precio ↑, Precio ↓. Se omiten "newest"/"best-selling" porque el
  endpoint `search` no los soporta.

### 3. Overlay predictivo (header)

**`predictiveSearch(q)` — server action (NUEVO)**
- Reutiliza `buildAllCards(ALL_HANDLE, { q, sort: 'relevance' })`.
- Devuelve `{ cards: cards.slice(0, 6), total: cards.length }`.

**`SearchOverlay` — client component (NUEVO)**
- Se abre desde la lupa del header. Cableo en **mobile y desktop**
  (`HeaderClient.tsx:179-188` mobile sin handler; desktop comentado en `161-163`).
- Input con debounce 250ms (igual patrón que `FilterDrawer:80-90`) → `predictiveSearch`.
- Render:
  - Top 6 mini-cards (imagen miniatura + título + precio), link a `/products/<handle>`.
  - Fila "Ver los N resultados →" a `/search?q=<encoded>`.
  - Estado "sin resultados" mínimo cuando `total === 0`.
- **Enter** en el input → `router.push('/search?q=' + encodeURIComponent(q))` y cierra.
- Cierre con Escape / click fuera / navegación.

### 4. URL / estado

- `lib/shop/searchParams.ts`:
  - `parseSearchParams`: leer `q` (`pickFirst(raw.q)`).
  - `serializeSearchParams`: escribir `q` si existe.
  - `VALID_SORTS`: añadir `'relevance'`.
- Sin librerías nuevas (se mantiene `useRouter` + `useSearchParams`).

## Flujo de datos

```
Usuario escribe en overlay
  → debounce 250ms → predictiveSearch(q) [server action]
     → buildAllCards(ALL, {q, relevance}) → getAllShopProducts(filters, sort, q)
     → { cards: top6, total }
  → overlay renderiza mini-cards + "Ver N resultados"
  → Enter / click → /search?q=...

/search?q=... [server page]
  → buildAllCards(ALL, {q, ...filtros}) → primer chunk + total + facets
  → ShopToolbar + ProductGrid + InfiniteScrollSentinel + FilterDrawer
  → scroll → fetchShopChunk({handle: ALL, params:{q,...}}) [action reutilizada]
  → cambio de filtros → getFilterCount({handle: ALL, params:{q,...}}) [action reutilizada]
```

## Archivos afectados

**Nuevos**
- `lib/shop/buildCards.ts` — `buildAllCards` compartido (extraído).
- `app/(frontend)/search/page.tsx` — página de resultados.
- `components/Layout/Header/SearchOverlay.tsx` (+ `.module.scss`) — overlay predictivo.
- `app/(frontend)/search/actions.ts` — `predictiveSearch(q)`.

**Modificados**
- `lib/shopify.js` — variable `$query` + params en `getAllShopProducts`/`getAllShopFilters`.
- `types/shop.ts` — `q?: string` en `ShopSearchParams`, `'relevance'` en `SortKey`.
- `lib/shop/searchParams.ts` — parse/serialize `q`, `VALID_SORTS` con `'relevance'`.
- `app/(frontend)/shop/ShopArchive.tsx` — usar `buildAllCards` compartido.
- `app/(frontend)/shop/actions.ts` — usar `buildAllCards` compartido.
- `components/Layout/Header/HeaderClient.tsx` — cablear lupa (mobile + desktop) al overlay.
- `components/Shop/FilterDrawer/...` y `SortRadios` — pasar sort options de search (si aún
  no es totalmente parametrizable; verificar en el plan).

## Edge cases

- `/search` sin `q` → estado vacío, sin fetch.
- `q` sin resultados → estado "no products" existente del `ProductGrid` + "sin resultados"
  en el overlay.
- Caracteres especiales en `q` → `encodeURIComponent` en todos los enlaces.
- Orden no soportado por `search` (newest/best-selling) → no se ofrece en `/search`.
- `/search` con `noindex` para no indexar resultados.

## Límite conocido (rendimiento del predictive)

`predictiveSearch` reutiliza `buildAllCards`, que trae **todo** el set que coincide
(pagina 250/pág en Shopify) para poder dar el `total` exacto y aplicar color-expansion
consistente. Para el catálogo actual de Mikmax (cientos de productos → 1 página) es un
único request y rápido. **Si el catálogo creciera mucho**, migrar el overlay a una query
predictive dedicada con `first: 6` y prescindir del `total` exacto (o mostrar "99+").

## No-objetivos (YAGNI)

- Búsquedas recientes / sugerencias (descartado en brainstorming).
- Búsqueda de colecciones, looks o páginas (solo productos).
- Ranking custom vía Sanity (posible extensión futura, fuera de alcance).
- Sort "newest"/"best-selling" en search (no soportado por el endpoint).
