# Lookbooks — Página de detalle del look (`/looks/[slug]`)

**Fecha:** 2026-05-28
**Estado:** Diseño aprobado, pendiente de plan de implementación

## Contexto

El sitio ya tiene el modelo de datos y los módulos de home de lookbooks:

- Schemas Sanity: `look` ("Look Book") y `set`, ambos con `bundleComponent[]` (cada componente referencia una `productVariant` de Shopify) + pricing.
- Bloques de PageBuilder `block.lookModule` / `block.setModule` que renderizan `SetCard` en la home.
- `SetCard` enlaza a `/looks/[slug]` y `/sets/[slug]`.

**El hueco:** las rutas de detalle no existen (el catch-all `[...slug]` redirige a `/`), no hay query de detalle ni funcionalidad de carrito para el bundle.

Este spec cubre **solo la página de detalle del look** (`/looks/[slug]`). `/sets/[slug]` queda fuera de alcance (estructura análoga, futura fase).

## Decisiones tomadas (brainstorming)

| Tema | Decisión |
|---|---|
| Modelo de precio | El total **no** es un precio cerrado: es la **suma de las piezas** (precio en vivo de cada variante de Shopify), menos un descuento opcional. |
| Estrategia de descuento | `none` / `sumMinusFixed` / `sumMinusPercent`. Se elimina `overrideTotal`. |
| Descuento en checkout | **Código de descuento de Shopify**: el look referencia un código; al añadir el look se aplica con `cartDiscountCodesUpdate`. |
| Display del precio | Suma original **tachada** + total con descuento, calculado en front desde `discountStrategy`/`discountValue` de Sanity. |
| Selección de talla | **Selector de talla por pieza**. El color queda fijo por la variante referenciada; la talla elegida resuelve la GID concreta de Shopify. |
| Origen de tallas/precio/stock | **En vivo desde Shopify Storefront** (como el PDP), por producto, en paralelo. |
| Related Products | **Curados a mano**: nuevo campo `relatedProducts` (refs a `product`) en el look. |
| Representación en carrito | **Líneas individuales** (modelo nativo de Shopify; encaja con el drawer actual). |
| Maquetación | Desde Figma (4 frames: desktop/mobile × sin/con selector). Pixel-perfect en implementación con skill `figma-maquetador`. |

### Frames de Figma de referencia
- Desktop sin selector: `node-id=11-4591`
- Desktop con selector: `node-id=31-13533`
- Mobile sin selector: `node-id=11-4411`
- Mobile con selector: `node-id=11-4179`
- File: `u92pryF41Lr42YVpq1Qxsn`

## Layout (según Figma)

- **Desktop sin selector:** header + nav; dos imágenes editoriales grandes a pantalla; **barra inferior fija** con título, rango de precio, enlace "Product information" y CTA "Select products and sizes".
- **Desktop con selector:** la barra se expande en un **panel** que lista cada componente (nº, miniatura, título) con filas de talla (talla · precio · botón "Select").
- **Mobile sin selector:** header; **carrusel** editorial (flechas + dots + botón "+" lightbox); título; rango de precio; copy de envío; **acordeón "Select Product and Sizes"**; acordeón "Product Information"; sección "Related Products" (grid 2×2); newsletter + footer.
- **Mobile con selector:** el acordeón se expande mostrando cada componente con sus tallas + botón "Select".

Interacción central: el cliente elige **una talla por componente** (botón "Select"); cuando todas las piezas tienen talla, el CTA pasa a "añadir al carrito".

## Arquitectura

### Ruta
`app/(frontend)/looks/[slug]/page.tsx` (+ `loading.tsx`, `error.tsx`), espejando el PDP (`products/[handle]`).
- `generateStaticParams()` desde los slugs de `look`.
- `generateMetadata()` desde `look.seo` (patrón PDP/legal: title, description, canonical, OG).
- `export const revalidate = 300` (precios live desde Shopify, igual que PDP).

### Data flow

```
getLook(slug)  [GROQ, Sanity]
  ↓ look + components[{variantGid, productGid, productHandle, color, availableSizes, label, image}]
  ↓
Por cada componente: getProductDetail(productHandle)  [Shopify, en paralelo]
  ↓ variantes hermanas (mismo producto + color bloqueado) filtradas por availableSizes
  ↓
buildLookView(lookDoc, productDetails, relatedCards)  [lib/look/]
  ↓ LookView (componentes con sizeOptions resueltas + rango de precio + config descuento)
  ↓
<LookDetail view={view} />  [client component]
```

### Resolución talla → variante (clave)

1. De `getLook`, cada componente trae `productHandle` (join GROQ: `*[_type=="product" && store.gid == ^.productVariant->store.productGid][0].store.slug.current`) y la GID de la variante referenciada.
2. `getProductDetail(productHandle)` devuelve `variants[]` con `{id, availableForSale, price, compareAtPrice, selectedOptions:[{name,value}]}` y `options[]` (nombres).
3. El **color bloqueado** = el valor de la opción de color de la variante referenciada (se localiza la variante por su GID en la lista y se lee su `selectedOptions`).
4. La **opción de talla** = la opción cuyos valores incluyen los `availableSizes` (la otra opción distinta del color).
5. Se enumeran las variantes con el mismo color, una por talla de `availableSizes`, produciendo `sizeOptions = [{size, gid, price, compareAt, availableForSale}]`.

### Cálculo de precio (display)

- `rango = [Σ min(price por pieza), Σ max(price por pieza)]` antes de seleccionar.
- Al completar la selección: `sumaOriginal = Σ price(talla elegida)`.
- `totalConDescuento`:
  - `none` → `sumaOriginal`
  - `sumMinusFixed` → `max(0, sumaOriginal - discountValue)`
  - `sumMinusPercent` → `sumaOriginal * (1 - discountValue/100)`
- Si hay descuento: mostrar `sumaOriginal` tachado + `totalConDescuento`.

> El `discountValue` de Sanity es solo para **display**. El descuento real en checkout lo impone el **código de Shopify**. El editor es responsable de mantenerlos alineados (documentar en el campo).

## Componentes (reutilizando el PDP)

| Componente | Origen | Rol en el look |
|---|---|---|
| `LookDetail` (nuevo, client) | — | Orquesta el estado: talla seleccionada por componente. |
| `GalleryHorizontal` | PDP (reutilizar/adaptar) | Galería editorial desktop (2-up). |
| `GallerySwiper` | PDP | Carrusel editorial mobile. |
| `ImageLightbox` | PDP | Botón "+" / zoom. |
| `LookSelector` (nuevo) | basado en `SizeSelector`/`StickyCTA` | Barra+panel (desktop) / acordeón (mobile); filas de talla con "Select" por pieza. |
| `PriceLabel` (adaptar) | PDP | Rango → total; suma tachada + descuento. |
| `ProductInfoPanel` | PDP | Acordeón "Product Information" (description/body del look). |
| `RelatedGrid` + `RelatedMiniCard` | PDP | Sección Related Products. |

## Funcionamiento — carrito + descuento

### `lib/shopify.js` (nuevas funciones)
- `cartLinesAddMultiple(cartId, lines[])` — añade varias líneas (`lines = [{merchandiseId, quantity}]`).
- Variante multi-línea de `cartCreate` (aceptar array de líneas) o reutilizar con array.
- `cartDiscountCodesUpdate(cartId, codes[])` — aplica el/los código(s) de descuento al carrito.

### `context/shopContext.js` (nueva acción)
- `addLookToCart(lines, discountCode)`:
  1. Si el carrito está vacío → `cartCreate` con todas las líneas; si no → `cartLinesAddMultiple`.
  2. Si hay `discountCode` → `cartDiscountCodesUpdate(cartId, [discountCode])`.
  3. Sincroniza cada línea en el `cart[]` local (lineId por GID) y persiste en `localStorage.cart_v2`.
- Las piezas aparecen como **líneas individuales** en el drawer (sin cambios en la UI del carrito).

## Cambios de schema (skill `sanity-schema-builder`)

### `look.tsx`
- **Eliminar** `priceFixed` y la opción `overrideTotal` de `discountStrategy`.
- **Eliminar** `priceCompareAt` (la "suma tachada" se calcula de la suma real, no hace falta un compareAt cerrado).
- `discountStrategy` → lista `none | sumMinusFixed | sumMinusPercent` (initialValue `none`).
- Mantener `discountValue`.
- **Añadir** `discountCode` (string) — código de descuento de Shopify; descripción advirtiendo que debe coincidir con `discountValue`/`discountStrategy`.
- **Añadir** `relatedProducts` (array de refs a `product`) — grupo editorial.
- Conservar `title`, `slug`, `description`, `editorialImages`, `components`, `seo`.

### `bundleComponent`
- Sin cambios (`productVariant` + `availableSizes` + `label` + `notes`).

### Migración
- Documentos `look` existentes con `priceFixed`/`overrideTotal`: fijar `discountStrategy` a `none` (o el valor adecuado), retirar `priceFixed`/`priceCompareAt`. Seguir patrones de migración de la skill `sanity-schema-builder`.

## Query GROQ — `getLook(slug)`

Nueva en `sanity/queries/queries/look.ts`. Proyecta:
- `title, "slug": slug.current, description/body, "seo": seo{...}`
- `editorialImages[]{${image}, alt}`
- `components[]{ label, availableSizes, "variantGid": productVariant->store.gid, "productGid": productVariant->store.productGid, "productHandle": *[_type=="product" && store.gid == ^.productVariant->store.productGid][0].store.slug.current, "previewImageUrl": productVariant->store.previewImageUrl, "variantTitle": productVariant->store.title }`
- `discountStrategy, discountValue, discountCode`
- `"relatedProducts": relatedProducts[]->{ "handle": store.slug.current }`

Caché: `{next: {tags: ['look', \`look:${slug}\`], revalidate: 3600}}`.

## Revalidación y SEO

- Registrar tags `look` y `look:{slug}` en `CLAUDE.md` y en `app/api/revalidate/route.ts`.
- `generateMetadata` desde `look.seo` (mirror PDP/legal).
- `SetCard` ya enlaza a `/looks/[slug]` — no requiere cambios.

## Types

- `types/look.ts` — `LookView`, props de `LookDetail`, `LookComponentView`, `SizeOption` (forma del frontend).
- `sanity/types/` — forma cruda de la respuesta GROQ de `getLook`.

## Fuera de alcance

- `/sets/[slug]` (estructura análoga; futura fase).
- Listado/archivo `/looks`.
- Agrupar piezas como "un look" en el drawer del carrito.
- Modo "collection" de related products (solo curado manual).

## Riesgos / notas

- **Desalineación descuento Sanity ↔ Shopify:** el display usa `discountValue` de Sanity; el cobro real usa el código de Shopify. Mitigación: descripción clara en el schema + (futuro) validación.
- **Identificación de opción color vs talla:** depende de los nombres/valores de opción sincronizados desde Shopify. La heurística (opción cuyos valores ⊇ `availableSizes`) debe validarse con datos reales.
- **N consultas a Shopify** (una por producto del look): aceptable en paralelo; cacheado por `revalidate = 300`.
