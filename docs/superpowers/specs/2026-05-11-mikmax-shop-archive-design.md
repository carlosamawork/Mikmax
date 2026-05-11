# Mikmax — Shop Archive (Vista 1 + Vista 3 + Filters)

**Fecha:** 2026-05-11
**Fase MVP:** L5 (Shop listing)
**Stack:** Next.js 15 (App Router, Server Components, Server Actions) · Sanity CMS v3 · Shopify Storefront API · SCSS Modules · TypeScript estricto
**Figma:**
- Vista 1 (4 col): `node-id=11:5471`
- Vista 3 (2 col): `node-id=11:5303`
- Listing con filtros abiertos: `node-id=11:2832`
- Panel de filtros (5 estados): `node-id=11:3063`

---

## 1. Objetivo

Implementar el archive del Shop con:

- Rutas `/shop` y `/shop/[handle]` (handle = slug Shopify de la colección).
- Dos vistas conmutables en desktop (4 columnas y 2 columnas). Móvil siempre 2 col.
- Filtros derivados automáticamente de Shopify: Sort, Product type, Color, Pattern, Size, Price.
- Sort por defecto = `orderRank` configurado en Sanity (orderable.product).
- Infinite scroll en chunks de 24 productos.
- Filtros, sort y vista sincronizados con query params en la URL.
- Breadcrumb jerárquico siguiendo el campo `parent` del schema collection.

**Vista 2** (grid editorial con `imagenesDestacadas`) queda fuera. El campo existe en el schema pero no se consume.

---

## 2. Mapa de rutas

```
/shop                       → Catálogo global. Mapea a la colección Shopify "all".
/shop/[handle]              → Productos de la colección Shopify cuyo slug es [handle].
```

**Decisión:** `/shop` se trata internamente como `/shop/all`, requiriendo crear (o pedir al cliente que cree) una colección automática `all` en Shopify (sin reglas / con `available_for_sale = true`). Esto unifica el código y aprovecha el endpoint de filters/facets que Shopify expone por collection.

---

## 3. Data flow

Cada request a `/shop/[handle]` ejecuta en el Server Component, en paralelo:

1. **GROQ a Sanity** → handles de productos en la colección ordenados por `orderRank` (sólo strings; ligero incluso con 1000 productos).
2. **Shopify Storefront** → `collection(handle).products(filters: [...], sortKey, first, after)` con los filtros recibidos por searchParams. Devuelve `nodes[]` (productos matching, ya con datos de tarjeta) y `filters[]` (facets disponibles con count actualizado).
3. **GROQ a Sanity** (en paralelo a 1+2) → metadata de la colección: `title`, `description`, `parent` (recursivo) para breadcrumb.

Resolución en JS:

- Si `sort == featured` (default): intersección `sanityHandles ∩ shopifyMatches`, conservando el orden de Sanity. Slice primeros 24.
- Si `sort != featured`: ignorar Sanity, tomar el orden que devuelve Shopify (sortKey nativo). Slice primeros 24.

Render final: `Breadcrumb` + `PageHeader` + `ProductGrid (24)` + `InfiniteScrollSentinel` + `FilterDrawer` (cerrado salvo que `?filters=open`).

### Infinite scroll

Sentinel client component al final del grid invoca la Server Action `fetchShopChunk({handle, filters, sort, view, offset?, cursor?})`. La signature acepta ambos paginadores porque el mecanismo de paginación cambia con el sort:

- **`sort == featured`** → `offset: number` (índice en la lista ordenada por Sanity tras intersección). Server lee la lista entera (cacheada) y devuelve `slice(offset, offset+24)`.
- **`sort != featured`** → `cursor: string` (cursor Shopify nativo). Server llama `collection.products(first:24, after: cursor)` directamente.

Devuelve `{products, hasMore, nextOffset?, nextCursor?}`. El sentinel guarda el siguiente paginador para la próxima llamada. Sigue cargando hasta `hasMore === false`.

### Caso peor (sort=featured + sin filtros + colección de 1000)

Para intersectar necesitamos todos los handles que matchean Shopify. Iteramos `collection.products` en lotes de 250 hasta agotar. Cache server-side por tag `collection:{handle}:featured-handles` con `revalidate: 300` para no pagarlo cada visita.

---

## 4. Filtros: mapeo URL ↔ Shopify

| Query param | Shopify ProductFilter input |
|---|---|
| `?productType=duvet-covers,pillowcases` | `[{productType:"Duvet covers"}, {productType:"Pillowcases"}]` |
| `?color=beige,blue` | `[{variantOption:{name:"Color", value:"Beige"}}, ...]` |
| `?size=m,l` | `[{variantOption:{name:"Size", value:"M"}}, ...]` |
| `?pattern=plain,striped` | `[{variantOption:{name:"Pattern", value:"Plain"}}, ...]` |
| `?priceMin=20&priceMax=80` | `[{price:{min:20, max:80}}]` |
| `?available=true` | `[{available:true}]` (opcional; default no aplicado) |

Valores en URL en kebab-case; un mapper normaliza a/desde el formato Shopify (Title Case con espacios). El mapper se construye dinámicamente desde las `filters[].values[]` que devuelve Shopify para cada sesión — no hay listas hardcodeadas.

### Sort

| `?sort` | Mecanismo |
|---|---|
| (vacío / `featured`) | Sanity `orderRank` + intersección con matches Shopify |
| `newest` | Shopify `sortKey: CREATED, reverse: true` |
| `price-asc` | Shopify `sortKey: PRICE, reverse: false` |
| `price-desc` | Shopify `sortKey: PRICE, reverse: true` |
| `best-selling` | Shopify `sortKey: BEST_SELLING` |

---

## 5. Componente: FilterDrawer

**Mismo componente desktop + mobile.** Mobile = full-screen, desktop = panel 480px anclado a la derecha con backdrop semi-oscuro.

**Apertura:** botón "Filter & Sort" en `PageHeader` añade `?filters=open` a la URL. Cerrar lo quita. Esto permite que el estado del drawer sea compartible y navegable con back/forward.

### Estructura

```
<aside role="dialog" aria-label="Filter & Sort">
  <header>
    <h2>Filter & Sort</h2>
    <button aria-label="Close">×</button>
  </header>

  <Accordion title="Sort">      <!-- radios, single select -->
  <Accordion title="Product">   <!-- checkboxes -->
  <Accordion title="Color">     <!-- swatches con count -->
  <Accordion title="Pattern">   <!-- checkboxes -->
  <Accordion title="Size">      <!-- chips/grid -->
  <Accordion title="Price">     <!-- dual range + inputs -->

  <footer>
    <button>Clear all</button>
    <button class="primary">View products ({count})</button>
  </footer>
</aside>
```

### Comportamiento

- **Un único accordion abierto a la vez.** Estado local del componente (no URL).
- **Estado optimista en client:** las selecciones se acumulan localmente sin tocar URL.
- **Contador del CTA "View products ({count})":** se recalcula en client llamando a una Server Action `getFilterCount(handle, pendingFilters)` con debounce 250ms.
- **Click en "View products"** → escribe los searchParams en la URL (`router.push`) y cierra el drawer.
- **Click en "Clear all"** → vacía estado local; no toca URL hasta confirmar.
- **Cerrar con × o ESC sin confirmar** → descarta cambios, vuelve a los filtros actualmente en URL.
- **Scroll lock** del body mientras está abierto.

Es Client Component (`'use client'`) por: estado local, debounce, `router.push`. Recibe del server las facetas + counts y los searchParams actuales como `defaultValue`.

---

## 6. Componente: ProductGrid + ViewToggle

`ProductGrid` único con prop `view: '4col' | '2col'`. SCSS controla columnas vía custom property:

```scss
.grid {
  display: grid;
  gap: px(1);
  grid-template-columns: 1fr 1fr;          /* móvil siempre 2 col */

  @include from(md) {
    grid-template-columns: repeat(var(--cols), 1fr);
  }
}
```

`--cols` inline: `style={{ '--cols': view === '4col' ? 4 : 2 }}`.

**ViewToggle:**
- 2 iconos (4 cuadrados / 2 cuadrados), uno activo.
- Solo visible en desktop.
- Sincroniza con URL: `?view=2col` (default `4col` no se escribe).

**ProductCard:** se reutiliza el actual (`components/PageBuilder/ProductCard/`) sin modificar.

**Empty states:**
- Colección vacía: "No products yet" + link a `/shop`.
- Filtros sin matches: "No products match your filters" + botón Clear filters (limpia URL).

---

## 7. Breadcrumb + PageHeader

### Breadcrumb

```
Home > Shop > {nombre colección}
```

- Resuelve la cadena server-side desde el query GROQ que carga `parent` recursivo en la colección actual.
- Si `/shop` → `Home > Shop` con Shop ya inactivo.
- Si hay jerarquía (`Dormitorio` → `Mantelería`) → inserta crumbs intermedios.
- Server Component puro.

### PageHeader

Layout:

```
Bedlinen                              [4col][2col] [Filter & Sort]
248 products
[Color: Beige ×] [Size: M ×] [Clear all]
(opcional) Descripción colapsada con "Read more"
```

- **Izquierda:** título de la colección + contador postfiltros + chips de filtros activos.
- **Derecha:** ViewToggle (desktop) + FilterTrigger.
- **Descripción:** `collection.store.descriptionHtml` truncado a 2 líneas con "Read more" (Client Component muy ligero).
- **No sticky.** El botón se recupera scrolleando hacia arriba.

Server Component contenedor; `ViewToggle`, `FilterTrigger` y `ActiveFilterChips` son client embebidos.

---

## 8. Estructura de archivos

```
app/(frontend)/shop/
├── page.tsx                          Server. /shop (collection "all").
├── [handle]/page.tsx                 Server. /shop/[handle].
├── ShopArchive.tsx                   Server. Compartido por ambas rutas.
└── actions.ts                        Server Actions: fetchShopChunk, getFilterCount.

components/Shop/
├── Breadcrumb/
├── PageHeader/
│   ├── PageHeader.tsx                Server.
│   ├── ViewToggle.tsx                'use client'.
│   ├── FilterTrigger.tsx             'use client'.
│   └── ActiveFilterChips.tsx         'use client'.
├── ProductGrid/                      Server.
├── InfiniteScrollSentinel/           'use client'.
└── FilterDrawer/
    ├── FilterDrawer.tsx              'use client'. Wrapper, ESC, backdrop, scroll lock.
    ├── FilterAccordion.tsx           Open-state local.
    ├── SortRadios.tsx
    ├── CheckboxList.tsx              Reutilizable (Product, Pattern).
    ├── ColorSwatches.tsx
    ├── SizeChips.tsx
    └── PriceRange.tsx                Dual range + inputs.

sanity/queries/
├── fragments/
│   ├── collection.ts                 NUEVO. title, slug, parent (recursivo), description.
│   └── productHandle.ts              NUEVO. {_id, "handle": store.slug.current, orderRank}.
└── queries/shop.ts                   NUEVO. getCollectionByHandle, getOrderedHandles.

lib/shopify.js                        EXTENDIDO:
├── getCollectionProducts(handle, {filters, sortKey, reverse, first, after})
├── getCollectionFilters(handle, {filters})
├── getCollectionMeta(handle)
└── getAllProductsForFilters(handle, filters)   ← itera 250×N

types/shop.ts                         NUEVO. ShopSearchParams, FilterDefinition, ActiveFilter, SortKey, ViewMode.
```

**No tocamos:** `ProductCard`, `LazyImage`, `LazyVideo`, schemas de collection/product, `app/(admin)`.

---

## 9. Cache y revalidate

| Datos | Origen | TTL / Tag |
|---|---|---|
| Lista de handles ordenados | GROQ | `revalidate: 3600` + tag `collection:{handle}` |
| Collection metadata | GROQ | `revalidate: 3600` + tag `collection:{handle}` |
| Shopify filter facets + counts | Storefront | `revalidate: 300` |
| Shopify products data | Storefront | `revalidate: 300` |
| `fetchShopChunk` | Hereda | 300s |
| `getFilterCount` | Hereda fetch de filters Shopify | 300s |

**Webhook `/api/revalidate`** (que invalida tags Sanity → Next) sigue pendiente del MVP; en esta tanda confiamos en TTL.

**Streaming:** Breadcrumb + PageHeader se renderizan sin esperar a Shopify. El grid va dentro de `<Suspense fallback={<ProductGridSkeleton />}>`.

**Bundle JS añadido:** ~15 KB gz estimados (FilterDrawer + accordions + sentinel + toggle/chips).

---

## 10. Fuera de scope

- Vista 2 (`imagenesDestacadas`).
- `/shop/product/[handle]` (PDP).
- Predictive Search del header.
- `+Ficha` quick view modal.
- Wishlist.
- Cambios en `shopContext` / `CartDrawer`.
- Webhook `/api/revalidate` y `/api/sync-bundle-to-shopify`.
- ProductCard variants `mini`/`hover`/`set`.
- Account/Login, B2B, multi-currency, multi-idioma, blog, 404 custom.
- Animaciones complejas (más allá de slide-in/out simple).
- Tests automatizados.
- Tracking analytics de filter/sort events.

---

## 11. Decisiones cerradas (acta del brainstorming)

| Punto | Decisión |
|---|---|
| Alcance | Phase L5 completo (rutas + grid + filtros + sort + breadcrumb + URL state). |
| Diseño | Figma "Programación V2" — 4 nodos compartidos por el cliente. |
| Vista 1 vs 3 | 4 col vs 2 col uniforme, toggle desktop. Mobile siempre 2 col. |
| Vista 2 | Fuera. |
| Origen de filtros | Auto desde Shopify (facets + counts dinámicos). |
| Sort default | Sanity orderRank (orderable.product). |
| Catálogo objetivo | 200–1000 productos por colección. |
| Chunk | 24 productos. |
| URL state | Filtros, sort, view, `filters=open` en searchParams. |
| Paginación | Infinite scroll con IntersectionObserver. |
| Routing | Handle Shopify directo. `/shop` → collection "all". |
| Breadcrumb | Home > Shop > Categoría (+ parents si hay jerarquía). |
| FilterDrawer | Único componente desktop+mobile. Estado optimista en client + contador debounced. |
