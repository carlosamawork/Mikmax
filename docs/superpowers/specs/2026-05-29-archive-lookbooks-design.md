# Archive de lookbooks (/looks) — Design

Fecha: 2026-05-29
Estado: aprobado

## Objetivo

Crear una página archive en `/looks` del mismo tipo que el archive de Shop
(toolbar + view toggle 4col/2col + drawer de filtros), listando los looks. Hoy
solo existe el detalle `/looks/[slug]`. Los looks se filtran reutilizando el motor
de filtros de Shop, **derivando los facets de los productos que componen cada look**.

## Decisiones tomadas

1. **Filtros = réplica de Shop** (color, talla, precio, material), todo derivado de
   los productos componentes. Las opciones del drawer salen de `getAllShopFilters()`.
2. **Color**: los **colores fijos** de los componentes (`comp.color`), resueltos a
   color base (GID de taxonomía), unión de los componentes. No todos los colores
   disponibles del producto.
3. **Precio**: **total con descuento** (`applyLookDiscount` sobre `minTotal/maxTotal`).
   La card muestra **precio nuevo + original tachado** (sin badge de %). El filtro de
   precio usa el rango con descuento.
4. **Orden**: añadir **ordenación manual** a `look` (plugin orderable, como
   colecciones/productos). Sort del archive: **Destacados (orderRank) + Precio ↑/↓**.
5. **Fuera de v1**: filtro de disponibilidad, infinite scroll (los looks son pocos →
   se renderizan todos), y enlazar `/looks` en el menú.

## Ruta y componentes

- Nuevo `app/(frontend)/looks/page.tsx` → `LooksArchive` (server component).
- Reutiliza `components/Shop/ShopToolbar/ShopToolbar` (con su `ViewToggle`).
- Reutiliza `components/Shop/FilterDrawer/FilterDrawer` (con generalización, ver abajo).
- Nuevo `components/Looks/LookGrid/LookGrid.tsx` (mismo sistema `--cols` que
  `ProductGrid`) + `components/Looks/LookCard/LookCard.tsx`.

`LookCard`: imagen editorial (`editorialImages[0]`), título, precio con descuento
(nuevo + original tachado si hay descuento), enlaza a `/looks/<slug>`.

## Motor de filtrado (todo client-side; el look hereda facets de sus componentes)

1. `getAllLooks()` — query GROQ nueva (tag `look`): por look → `_id`, `title`,
   `slug`, primera imagen editorial (url+alt), `components[]{color, productHandle}`,
   `discountStrategy`, `discountValue`, `orderRank`.
2. Recolectar los handles únicos de productos componentes de todos los looks.
3. `getProductCardsByHandles(handles)` — función nueva en `lib/shopify.js` que usa
   `PRODUCT_CARD_FRAGMENT` (trae color-pattern, material, variantes/opciones, precio).
   Devuelve mapa `handle → nodo`.
4. Agregar facets por look (`lib/look/buildLooksArchive.ts`):
   - **color**: por componente, resolver `comp.color` → GIDs de color base usando los
     metaobjects color-pattern del producto (reutilizar/exportar el resolver que hoy
     vive en `lib/shop/expandToCards.ts`, `findVariantBaseGids`). Unión.
   - **material**: unión de `productMaterialSlugs()` (de `lib/shop/materialFilter.ts`)
     de los productos componentes.
   - **talla**: unión de las tallas del color fijo de cada componente (slug).
   - **precio**: `rawMin/rawMax` = suma de la talla más barata/cara por componente;
     `discMin/discMax` = `applyLookDiscount(raw…)`. Card usa `discMin–discMax`.
5. Selección (parseada igual que Shop con `parseSearchParams`):
   - **color**: `extractSelectedColorGids(params, facets)` (reutilizado) → el look pasa
     si sus GIDs de color intersecan los seleccionados (OR).
   - **material**: el look pasa si sus material-slugs intersecan los seleccionados (OR).
   - **talla**: el look pasa si sus size-slugs intersecan los seleccionados (OR).
   - **precio**: el rango con descuento del look solapa `[priceMin, priceMax]`.
6. Sort: `featured` → orden de `orderRank` (de `getAllLooks`); `price-asc/desc` → por
   `discMin`.

## Reutilización / generalizaciones mínimas

- `FilterDrawer`: añadir prop `countAction?: (args) => Promise<number>` (default = el
  `getFilterCount` de shop). Looks pasa `getLookFilterCount`. El resto (serialize,
  `usePathname`, accordiones, facets) ya es genérico y funciona en `/looks`.
- `SortRadios`: aceptar una lista de opciones opcional; en looks renderizar solo
  `featured`, `price-asc`, `price-desc`.
- El drawer **no** renderiza disponibilidad (no está en sus accordiones), así que la
  réplica de filtros visible es Sort + Size + Color + Material + Price. ✓

## Schema (orderable)

Mirror del patrón ya existente en `collection`/`product`:
- Añadir campo `orderRank` (hidden) a `sanity/schemas/documents/look.tsx`.
- Registrar `orderable.look` en el desk (`sanity/desk/…`) con vista de arrastrar-
  ordenar y añadirlo a `hiddenDocTypes`.
- Seguir el patrón existente del repo; consultar la skill **sanity-schema-builder**
  si hay dudas de migración.

## Revalidación

- `getAllLooks()` lleva `{next: {tags: ['look'], revalidate: 3600}}` (tag ya activo;
  publicar un `look` ya invalida `look`).
- `getProductCardsByHandles()` consulta Shopify directamente (sin cache de Sanity).

## Fuera de alcance (specs futuras)

- Enlace de `/looks` en el menú (un link aparte; `/looks` no es documento de Sanity).
- Filtro de disponibilidad e infinite scroll en `/looks`.
- Cambios en el detalle `/looks/[slug]`.
