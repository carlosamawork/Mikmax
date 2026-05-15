# Mikmax — Product Detail Page (PDP)

**Fecha:** 2026-05-12
**Fase MVP:** PDP — Single product view
**Stack:** Next.js 15 (App Router, Server Components) · Sanity CMS v3 · Shopify Storefront API 2025-10 · SCSS Modules · TypeScript estricto
**Figma:**
- Desktop default: `node-id=11:3317`
- Desktop color cambiado: `node-id=11:3339`
- Desktop selector talla abierto: `node-id=32:14969`
- Desktop zoom imagen: `node-id=11:3360`
- Desktop Product Information panel: `node-id=2024:8302`
- Mobile default: `node-id=11:3567`
- Mobile scrolleado (toolbar inline + related): `node-id=11:3365`
- Mobile size dropdown abierto: `node-id=11:3773`

---

## 1. Objetivo

Implementar la página de detalle de producto con:

- Ruta `/products/[handle]` (handle = slug Shopify del producto).
- Layouts diferenciados desktop / mobile.
  - **Desktop:** galería horizontal scrollable (imágenes + related products inline) + barra de ficha fija inferior.
  - **Mobile:** scroll vertical estándar (imagen swipeable arriba, toolbar inline, related grid 2-col debajo, sticky bottom CTA).
- Selección de color y talla persistida en URL (`?color=xxx&size=yyy`) para compartir.
- Cambio de color → swap completo de la galería + recálculo de tallas disponibles.
- Selector de talla → overlay con lista de variantes + precio + botón Select por fila.
- Botón "Product Information" → overlay con 4 tabs (Descripción / Material / Lavado / Uso) renderizando PortableText del schema Sanity.
- Lightbox con pan/zoom para ampliar imágenes.
- Related products definidos manualmente desde Sanity.

Excluido del MVP:
- Funcionalidad del botón favorito (se renderiza visualmente, sin estado).
- Reviews / ratings.
- Stock notifications.
- Cart drawer custom (si no existe ya en el codebase, fallback a redirect `/cart`).

---

## 2. Decisiones de diseño

### 2.1 URL

- `/products/[handle]` para producto.
- `/shop` y `/shop/[handle]` siguen siendo archive de colecciones (no se tocan).
- Query params para estado:
  - `?color=cardon-seed` — slug del color (kebab-case del label del metaobject).
  - `?size=240X220` — label literal de la talla.
- Update vía `router.replace({scroll: false})` para no añadir entradas al history en cada cambio.

### 2.2 Source of truth por dato

| Dato | Fuente |
|---|---|
| Title, precio, variantes, disponibilidad, imágenes de variante | Shopify |
| Color base (taxonomía) | Shopify metafield `shopify.color-pattern` a nivel **producto** (metaobjects con campo `color_taxonomy_reference`) |
| Galería de imágenes por color | Shopify `variant.image` + `variant.metafield(custom.gallery)` |
| Descripción, propiedades material, recomendaciones lavado, uso recomendado | Sanity (PortableText) |
| Related products | Sanity — selección manual del editor (nuevo campo) |
| "Estimated delivery / Complimentary gift wrapping / 30-day returns" | Hardcoded en el toolbar (MVP) |

### 2.3 Initial state al llegar a la PDP

- **Color:** preseleccionado. Si `?color=` válido en URL, ese; si no, el primer color con stock.
- **Size:** sin preseleccionar (CTA muestra "Please Select Size"). Si `?size=` válido en URL y compatible con el color resuelto, se respeta.

### 2.4 Color ↔ Size coherencia

- Al cambiar color, si la talla actual existe en el nuevo color → se mantiene.
- Si no existe → reset a `undefined`, CTA vuelve a "Please Select Size".
- Función helper `findEquivalentSize(color, prevSize)` server-side y replicada client-side para consistencia.

### 2.5 Add to cart

- Usa `shopContext.addToCart` existente (no se duplica lógica).
- Tras añadir:
  - **Si existe cart drawer** (a verificar en implementación): se abre.
  - **Si no existe**: redirige a `/cart` (fallback MVP).
- El contador del header (`Cart [ N ]`) actualiza automáticamente vía shopContext.

### 2.6 Image zoom

- Lightbox fullscreen con pan/zoom:
  - Mobile: pinch-zoom nativo (CSS `touch-action: pinch-zoom`).
  - Desktop: scroll/click para zoom-in, drag para pan.
- Flechas para navegar entre las imágenes del color seleccionado.
- ESC, backdrop click y botón X cierran.

---

## 3. Arquitectura

### 3.1 Approach: server-fetch + client root + layout islands

`page.tsx` (server) fetchea Sanity + Shopify en paralelo, llama a `buildProductView()` para producir un `ProductView` pre-procesado, y lo pasa a `<ProductDetail>` (client root).

`<ProductDetail>` mantiene el estado de variante (color, size, lightbox, info panel) y sincroniza con URL. Renderiza dos layouts top-level (`<DesktopLayout>` y `<MobileLayout>`) con CSS hide/show por viewport. Ambos comparten sub-componentes (`<ColorSwatches>`, `<SizeSelector>`, `<ProductInfoPanel>`, `<ImageLightbox>`) y reciben handlers del root.

Las partes verdaderamente estáticas (header, breadcrumb, related grid en mobile) viven como server components fuera del client root.

### 3.2 Árbol de archivos

```
app/(frontend)/products/[handle]/
├── page.tsx                                  [server]
├── ProductDetail.tsx                          [client]
├── loading.tsx                                [server]   skeleton
├── error.tsx                                  [client]   error boundary
├── _types.ts                                              tipos ProductView
└── components/
    ├── Desktop/
    │   ├── DesktopLayout.tsx                  [client]
    │   ├── GalleryHorizontal.tsx              [client]   horizontal scroll + related inline
    │   └── DesktopToolbar.tsx                 [client]
    ├── Mobile/
    │   ├── MobileLayout.tsx                   [client]
    │   ├── GallerySwiper.tsx                  [client]   single image + arrows + swipe
    │   ├── MobileToolbar.tsx                  [client]   inline accordion-style
    │   ├── RelatedGrid.tsx                    [server]   2-col grid
    │   └── StickyCTA.tsx                      [client]
    └── shared/
        ├── ColorSwatches.tsx                  [client]
        ├── SizeSelector.tsx                   [client]
        ├── ProductInfoPanel.tsx               [client]   tabs PortableText
        ├── ImageLightbox.tsx                  [client]   dynamic import, ssr:false
        ├── RelatedMiniCard.tsx                [server]
        ├── Breadcrumb.tsx                     [server]
        └── PriceLabel.tsx                     [server]

lib/product/
├── buildProductView.ts                                    pure: Sanity+Shopify → ProductView
└── findEquivalentSize.ts                                  helper coherencia color/size

sanity/queries/queries/
└── product.ts                                             GROQ query single product

sanity/schemas/documents/
└── product.tsx                                            (modificado) add relatedProducts field

lib/shopify.js                                             (modificado) +getProductDetail +getProductCards
```

---

## 4. Data layer

### 4.1 Sanity schema — cambio

Añadir campo `relatedProducts` al schema `product`:

```ts
defineField({
  name: 'relatedProducts',
  title: 'Related products',
  type: 'array',
  of: [{type: 'reference', to: [{type: 'product'}]}],
  group: 'editorial',
  validation: (Rule) => Rule.max(10),
}),
```

### 4.2 Sanity query

```groq
*[_type == "product"
   && store.slug.current == $handle
   && !(_id in path('drafts.**'))][0] {
  _id,
  descripcion, propiedadesMaterial, recomendacionesLavado, usoRecomendado,
  "relatedProductHandles": relatedProducts[]->store.slug.current,
  "title": store.title,
  "slug": store.slug.current
}
```

### 4.3 Shopify queries

**`getProductDetail(handle)`** — devuelve el producto completo. GraphQL incluye:

- Campos producto: `id, handle, title, descriptionHtml, vendor, productType, tags, featuredImage, priceRange, compareAtPriceRange, options { name values }`
- `colorPattern: metafield(namespace:"shopify", key:"color-pattern")` con `references.nodes` (mismos metaobjects que ya consumimos en archive: `label`, `color`, `color_taxonomy_reference`)
- `variants(first: 100) { nodes { id, availableForSale, image, price { amount currencyCode }, compareAtPrice { amount }, selectedOptions { name value }, gallery: metafield(namespace:"custom", key:"gallery") { type value references { nodes { ... on MediaImage { image { url altText width height } } } } } } }`

> **NOTA (probe ejecutado 2026-05-12):** El campo `metafield(namespace:"custom", key:"gallery")` resuelve correctamente vía Storefront API tanto a nivel `Product` como `ProductVariant`, pero está `null` en los 66 productos del store en este momento (no hay ningún producto/variante con el metafield poblado, y tampoco se sabe si la definición del metafield existe en Admin o si está expuesta al Storefront API). Mantenemos el query asumiendo la forma esperada (`list.file_reference` → `MediaImage`) — cuando empiecen a poblarse, si la shape difiere se ajusta `buildProductView`. El fallback descrito en §"Edge cases" (`Variante sin custom.gallery` → solo `variant.image`s) cubre el estado actual del catálogo.

**`getProductCards(handles[])`** — fetch ligero para related products. GraphQL: `products(first: 20, query: "handle:a OR handle:b OR ...")` con campos mínimos: `handle, title, featuredImage { url altText }, priceRange { minVariantPrice maxVariantPrice }`.

### 4.4 Pre-procesado: `buildProductView`

Función pura que recibe `(sanityDoc, shopifyProduct, relatedCards)` y devuelve:

```ts
type ProductView = {
  id: string
  handle: string
  title: string
  currency: string
  minPrice: number
  maxPrice: number
  editorial: {
    descripcion: PortableTextBlock[] | null
    propiedadesMaterial: PortableTextBlock[] | null
    recomendacionesLavado: PortableTextBlock[] | null
    usoRecomendado: PortableTextBlock[] | null
  }
  hasEditorial: boolean                       // true si al menos uno de los 4 no es null/vacío
  colors: ProductColor[]
  defaultColorSlug: string                    // primer color con stock o primero del array
  related: ProductMiniCard[]
}

type ProductColor = {
  slug: string                                 // 'cardon-seed' (kebab del label del metaobject)
  label: string                                // 'CARDON SEED'
  hex: string                                  // '#757331'
  taxonomyValueGids: string[]                  // ['gid://shopify/TaxonomyValue/9']
  images: GalleryImage[]                       // variant.image + metafield gallery
  sizes: ColorSize[]
}

type ColorSize = {
  variantId: string                            // gid://shopify/ProductVariant/...
  label: string                                // '240X220'
  price: number
  compareAtPrice?: number
  availableForSale: boolean
}

type GalleryImage = {
  url: string
  altText?: string
  width?: number
  height?: number
}

type ProductMiniCard = {
  handle: string
  title: string
  imageUrl?: string
  imageAlt?: string
  minPrice?: number
  maxPrice?: number
}
```

**Algoritmo `buildProductView`:**

1. Lee `product.colorPattern.references.nodes` → lista de metaobjects color.
2. Agrupa `product.variants.nodes` por `selectedOptions.color` (case-insensitive).
3. Para cada grupo: busca el metaobject cuyo `label` coincida → `hex`, `taxonomyValueGids`.
4. Para cada color, ordena variantes por `selectedOptions.size` y construye `sizes[]`.
5. Para cada color, toma la **primera variante disponible** y construye `images[]`:
   - Primero `variant.image` si existe.
   - Luego cada imagen del `gallery` metafield (file references → MediaImage → image).
   - Si el color no tiene imágenes propias → fallback a `product.featuredImage`.
6. `defaultColorSlug` = primer color con alguna `size.availableForSale === true`. Si ninguno tiene stock → primer color del array.
7. `related` = `relatedCards` filtrados eliminando los que no existen en Shopify ni los duplicados del producto actual.

---

## 5. Componentes

### 5.1 `page.tsx` (server)

```ts
export const revalidate = 300

export default async function ProductPage({params, searchParams}) {
  const {handle} = await params
  const search = await searchParams

  const [sanityDoc, shopifyProduct] = await Promise.all([
    getSanityProduct(handle),
    getShopifyProductDetail(handle),
  ])
  if (!shopifyProduct) notFound()

  const relatedHandles = sanityDoc?.relatedProductHandles ?? []
  const relatedCards = relatedHandles.length
    ? await getProductCards(relatedHandles)
    : []

  const view = buildProductView(sanityDoc, shopifyProduct, relatedCards)
  const initial = resolveInitialState(view, search)

  return <ProductDetail view={view} initial={initial} />
}

export async function generateMetadata({params}) {
  // title + description from Sanity descripcion or Shopify seo
  // canonical = /products/[handle] (sin query params)
  // og:image = featuredImage
}
```

### 5.2 `<ProductDetail>` (client root)

Estado:

```ts
const [selectedColor, setSelectedColor] = useState(initial.color)
const [selectedSize, setSelectedSize] = useState(initial.size)
const [isInfoOpen, setIsInfoOpen] = useState(false)
const [lightbox, setLightbox] = useState({open: false, index: 0})
```

Effects:
- URL sync: `useEffect` que llama `router.replace` cuando cambian color/size.
- Color change: `setSelectedColor(slug)` + `setSelectedSize(findEquivalentSize(view, slug, selectedSize))`.

Renderiza:

```tsx
<>
  <Breadcrumb title={view.title} />
  <DesktopLayout className={s.desktop} ... />
  <MobileLayout className={s.mobile} ... />
  <ProductInfoPanel
    open={isInfoOpen}
    onClose={() => setIsInfoOpen(false)}
    editorial={view.editorial}
  />
  <ImageLightbox
    open={lightbox.open}
    images={currentColor.images}
    index={lightbox.index}
    onClose={() => setLightbox({open:false, index:0})}
    onIndexChange={(i) => setLightbox({open:true, index:i})}
  />
</>
```

### 5.3 `<DesktopLayout>`

- `<GalleryHorizontal>` (full-bleed, scroll horizontal) recibe `images` del color actual + el array `related`. Renderiza N tiles de imagen + un bloque "Related products" + N mini-cards en línea.
- `<DesktopToolbar>` fixed bottom: 4 columnas (Title/Price · SizeSelector + ColorSwatches · Product Information · CTA + Favorite).

### 5.4 `<MobileLayout>`

Layout vertical:

```
<GallerySwiper images={...} onZoom={(i) => setLightbox({open:true, index:i})} />
<TitlePriceBlock />
<MobileToolbar ... />
<RelatedGrid products={view.related} />
<StickyCTA selectedSize={...} onAddToCart={...} />
```

### 5.5 Sub-componentes `shared/`

**`<ColorSwatches values selected onToggle>`** — cuadrados color con tira inferior. Tira negra = seleccionado.

**`<SizeSelector sizes selected onSelect>`** — Desktop dropdown que abre panel flotante; Mobile accordion inline. Cada fila: label · price · "Select" button. Filas con `available=false` atenuadas y "Select" deshabilitado.

**`<ProductInfoPanel open onClose editorial>`** — overlay (desktop slide-up, mobile drawer fullscreen). Sidebar tabs 1-4. Contenido = `<PortableText value={editorial[activeTab]} />` usando el renderer ya existente del proyecto.

**`<ImageLightbox open images index onClose onIndexChange>`** — `dynamic(() => import('./ImageLightbox'), {ssr:false})` para no entrar en el bundle inicial. Portal a `document.body`. CSS pan/zoom: contenedor con `transform-origin` + drag handlers.

---

## 6. Edge cases

| Caso | Comportamiento |
|---|---|
| Handle no existe en Shopify | `notFound()` |
| Producto en Shopify sin documento Sanity | Renderiza, `hasEditorial=false`, botón "Product Information" oculto |
| Producto sin opción "Color" | `colors[]` = 1 entrada sintética usando `product.featuredImage` + first variant gallery |
| Variante sin `custom.gallery` | Galería = solo `variant.image`s del color. Si no hay → `product.featuredImage` |
| Color sin stock pero existe | Aparece en swatches normal, las sizes están todas con `available=false` y la CTA en "Sold out" deshabilitada |
| Size unavailable tras color change | Reset a `undefined`, CTA "Please Select Size" |
| Size existe pero `availableForSale=false` | Fila atenuada en dropdown, no seleccionable |
| `?color=xxx` URL inválido | Fallback a `defaultColorSlug`, `router.replace` limpia |
| `?size=xxx` URL inválido | Se ignora |
| `relatedProducts` vacío o eliminados | Sección related se oculta entera |
| Producto related sin documento Sanity (solo Shopify) | OK, renderiza con datos Shopify |
| Producto related sin existir en Shopify | Filtrado server-side, no se renderiza |
| Fallo carga imagen | `LazyImage` muestra placeholder gris |
| Cart drawer no existe en codebase | Fallback: redirect a `/cart` tras add, toast confirmación |

---

## 7. SEO

- `generateMetadata` en `page.tsx`:
  - `title`: `${product.title} | Mikmax`
  - `description`: primeros 160 chars plain text de `descripcion` o fallback a Shopify `seo.description`
  - `openGraph.images`: `[{url: featuredImage.url, width, height, alt}]`
  - `alternates.canonical`: `/products/${handle}` (sin query params)
- Structured data JSON-LD `Product` schema (`<script type="application/ld+json">`):
  - `name`, `image`, `description`, `sku` (variantId del default), `offers[]` (uno por variante con price, availability)

---

## 8. Performance

- `Promise.all` en `page.tsx` para paralelizar Sanity + Shopify + related.
- `revalidate = 300` (igual que archive).
- `<ImageLightbox>` via `dynamic(import, {ssr:false})` — no entra en bundle inicial.
- Primera imagen del color → `priority` (LCP).
- Resto vía `LazyImage` ya existente.
- `custom.gallery` se trae en la misma query del producto → 0 round-trips extra al cambiar color.
- Imágenes related se sirven con `sizes` apropiados para evitar overfetch.

---

## 9. Tareas paralelas de descubrimiento (durante implementación)

Estas no son blockers del diseño pero hay que resolverlas en el plan de implementación:

1. ~~**Tipo del metafield `custom.gallery`** — probe la primera vez para confirmar shape exacto. Si no es `list.file_reference` a MediaImage, ajustar el query y el extractor en `buildProductView`.~~ — Probe ejecutado 2026-05-12: el campo resuelve vía Storefront API pero está `null` en los 66 productos actuales. Mantenemos el query con la forma esperada (`list.file_reference` → `MediaImage`); ajustar cuando empiecen a poblarse si la shape real difiere.
2. **Cart drawer** — ¿existe ya un drawer en `context/shopContext.js` / `components/`? Si no → MVP usa redirect `/cart`; backlog: construir drawer.
3. **PortableText renderer** — verificar que el renderer existente en el proyecto cubre todos los marks/blocks usados en los 4 campos editoriales. Si no, extender.
4. **`hiddenDocTypes`** — no aplica (no añadimos document types, solo un field).

---

## 10. Out of scope

- Funcionalidad real del botón favorito (wishlist).
- Reviews / ratings.
- "Notify me when back in stock".
- Cross-sell / "Complete the look" más allá de los related manuales.
- Comparador de productos.
- Galería video player avanzado (los campos `videos` de Sanity quedan para iteración posterior).
