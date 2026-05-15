# Mikmax — Arquitectura MVP (Home + Shop + PDP + Looks + Sets)

**Fecha:** 2026-05-05
**Sprint:** 2 semanas
**Stack:** Next.js 15 (App Router) · Sanity CMS v3 · Shopify Storefront API · SCSS · TypeScript
**Dominio:** https://www.mikmax.com

---

## 1. Contexto y objetivo

Mikmax es un ecommerce textil orientado a hostelería con catálogo gestionado en Shopify. La marca quiere lanzar la versión completa del sitio en 2 semanas con tres flujos de compra distintos derivados del Figma de programación V2:

- **Shop** — venta de producto unitario por categorías (Dormitorio, Bathroom, Homewear, …).
- **Looks** — propuestas visuales que combinan productos de **distintas familias**. El usuario compra el look entero; selecciona talla por componente; el color viene pre-bloqueado.
- **Sets** — bundles de productos de la **misma familia** (ej. juego de cama). El usuario compra el set entero; selecciona talla por componente; color cerrado por set.

**Quedan fuera del MVP:** B2B "Mikmax for Business", Account/Login, Multi-currency, Multi-idioma, Blog, 404 personalizada, Tests automatizados, Animaciones complejas / 3D, Wishlist.

**Stretch goals (si llegamos al día 10 con margen):** Our Story, Shop Vista 2, Shopify Function de descuento de bundle.

---

## 2. Decisiones arquitectónicas nucleares

| Decisión | Resolución |
|---|---|
| **Authority de producto** | **Shopify** (precio, stock, variantes, imágenes principales, SKU). Sanity Connect ya sincroniza a Sanity como `product` + `productVariant` read-only. |
| **Authority de bundles (Look / Set)** | **Sanity** (documentos `look` y `set`). Cada bundle referencia variantes Shopify específicas. **No usamos Shopify Bundles app.** |
| **Cart** | Shopify Cart API. Una línea por variante; agrupación visual mediante `attributes._bundleId`/`_bundleType`/`_bundleLabel`. |
| **Checkout** | Shopify-hosted vía `cart.checkoutUrl`. |
| **Precio Look/Set** | Precio fijo en Sanity (`priceFixed`). Descuento aplicado por **Shopify Function** custom (Order Discount Function). 3 estrategias: `sumMinusFixed`, `sumMinusPercent`, `overrideTotal`. Reparto proporcional entre líneas. |
| **Page builder** | Híbrido: librería core compartida (Hero, ProductModule, CampaignImageVideo, FeaturedSection, RichText, BannerDescuento) + bloques específicos de Home (LookModule, SetModule). Reutilizable en `home`, `page`, `collection`. |
| **Newsletter** | Mailchimp (ya integrado en `/api/subscribeUser`). |
| **Búsqueda** | Shopify Predictive Search API. |
| **Sync Shopify→Sanity** | Sanity Connect for Shopify (ya instalado y operativo). |
| **Estilos** | SCSS Modules co-localizados, mobile-first con nuevo mixin `from(bp)`. CLAUDE.md compliant. |
| **País / moneda** | Shopify Markets, default ES/EUR. Selector visible pero no funcional en MVP. |

---

## 3. Mapa de rutas

```
/                              → Home (page builder modular)
/shop                          → Listado general (Vista 1 default)
/shop/[category]               → Listado por categoría (Shopify collection handle)
/shop/product/[handle]         → PDP estándar (color + talla)
/looks                         → Listado de Look Books
/looks/[slug]                  → Look PDP (talla por componente)
/sets                          → Listado de Sets
/sets/[slug]                   → Set PDP (talla por componente, color cerrado)

+ Cart drawer global (no tiene ruta)
+ MobileMenu global (con search input + cart inline)
+ Newsletter form (en footer)

API:
/api/subscribeUser             (existente — Mailchimp)
/api/revalidate                (NUEVO — webhook Sanity para ISR)
/api/sync-bundle-to-shopify    (NUEVO — webhook look/set → Metaobject)

Stretch goals:
/our-story
Shop Vista 2 toggle
```

### Estructura de carpetas

```
app/
├── (frontend)/
│   ├── layout.tsx              (ShopProvider + Header + Footer + CartDrawer + MobileMenu)
│   ├── page.tsx                (Home)
│   ├── shop/
│   │   ├── page.tsx
│   │   ├── [category]/page.tsx
│   │   └── product/[handle]/page.tsx
│   ├── looks/{page,[slug]/page}.tsx
│   ├── sets/{page,[slug]/page}.tsx
│   ├── sitemap.ts (ampliar)
│   └── not-found.tsx
├── (admin)/                    (sin tocar)
└── api/
    ├── subscribeUser/route.tsx (existente)
    ├── revalidate/route.ts     (NUEVO)
    └── sync-bundle-to-shopify/route.ts (NUEVO)

components/
├── Common/                     (existente)
├── Layout/
│   ├── Header/
│   ├── MegaMenu/
│   ├── MobileMenu/
│   ├── MobileBottomNav/
│   └── Footer/
├── Cart/
│   ├── CartDrawer/             (overlay 1072px desktop, fullscreen mobile)
│   ├── CartLine/
│   └── CartLineBundle/
├── Product/
│   ├── ProductCard/            (variants: default, grande, mini, related)
│   ├── ProductGallery/
│   ├── VariantSelector/
│   ├── FichaButton/
│   ├── FichaModal/             (info-only, link a PDP)
│   └── PriceDisplay/
├── Bundle/
│   ├── BundleCard/
│   ├── BundlePDP/
│   ├── BundlePDPClient/
│   └── BundleComponentRow/
├── Shop/
│   ├── ProductGrid/            (Vista 1: grid 4col uniforme; Vista 3: grid mixto)
│   ├── Breadcrumb/
│   ├── FilterDrawer/           (desktop)
│   └── FilterModal/            (mobile, 2 estados: general + tallas)
├── Search/
│   ├── SearchInput/
│   └── SearchResults/
└── Blocks/
    ├── BannerDescuento/
    ├── HeroCampaign/
    ├── CampaignImageVideo/
    ├── ProductModule/
    ├── LookModule/
    ├── SetModule/
    ├── FeaturedSection/
    ├── RichText/
    └── index.tsx               (PageBuilder dispatcher)

styles/
├── common/
│   ├── _tokens.scss            (NUEVO — spacing, z-index, container, transitions)
│   ├── _variables.scss         (existente)
│   ├── _typography.scss        (auditar contra Figma)
│   └── …
├── mixins/
│   └── _mixins.scss            (MODIFICADO — añadir mixin from())
└── main.scss                   (MODIFICADO — @import 'common/tokens')
```

### Componentes a borrar tras migración

`components/Landing/` y `components/Welcome/` se eliminan al final del sprint cuando la nueva Home esté en producción.

---

## 4. Schemas Sanity

### 4.1. Documents nuevos

#### `look` (document)

```ts
{
  name: 'look',
  fields: [
    { name: 'title', type: 'string', required },
    { name: 'slug', type: 'slug', source: 'title' },
    { name: 'description', type: 'text' },
    { name: 'editorialImages', type: 'array', of: [moduleImage] },
    { name: 'components', type: 'array', of: [bundleComponent] },
    { name: 'priceFixed', type: 'number', required },
    { name: 'priceCompareAt', type: 'number' },
    { name: 'discountStrategy', type: 'string', options: { list: [
        'sumMinusFixed', 'sumMinusPercent', 'overrideTotal'
    ] } },
    { name: 'discountValue', type: 'number' },
    { name: 'colorTheme', type: 'reference', to: 'colorTheme' },
    { name: 'seo', type: 'seo.page' },
    { name: 'orderRank', type: 'string' }  // sanity-plugin-orderable
  ]
}
```

#### `set` (document)

Mismos campos que `look` + un campo extra:

```ts
{ name: 'colorLocked', type: 'string', required }   // p.ej. "Azul", "Crudo"
```

> **Decisión:** mantener `look` y `set` como documents separados (no unificar bajo un campo `type`). Razón: la UI del listing/PDP es distinta y separar simplifica las queries GROQ y las rutas.

### 4.2. Object auxiliar nuevo

#### `bundleComponent` (object)

```ts
{
  name: 'bundleComponent',
  fields: [
    { name: 'productVariant', type: 'reference', to: 'productVariant', required },
    { name: 'label', type: 'string' },                  // override visible
    { name: 'availableSizes', type: 'array', of: 'string' },
    { name: 'notes', type: 'string' }
  ]
}
```

> Referencia variante (no producto) porque el color está pre-bloqueado por la variante.

### 4.3. Page builder blocks (8 nuevos objects)

| `_type` | Campos clave |
|---|---|
| `block.bannerDescuento` | `text`, `link`, `colorTheme` |
| `block.heroCampaign` | `media` (image/video toggle), `headline`, `subhead`, `cta`, `colorTheme` |
| `block.campaignImageVideo` | `media`, `headline`?, `link`?, `aspectRatio`, `fullBleed` |
| `block.productModule` | `title`, `layout` ('carousel'\|'grid-4col'\|'grid-mixed'), `source` ('manual'\|'collection'), `manualProducts`, `collection`, `limit` |
| `block.lookModule` | `title`, `looks` (refs), `layout` ('row-wide'\|'grid-2col') |
| `block.setModule` | `title`, `sets` (refs), `layout` ('row-mini'\|'grid') |
| `block.featuredSection` | `image`, `headline`, `body` (PortableText), `cta`, `mediaPosition` ('left'\|'right') |
| `block.richText` | `body` (PortableText) |

### 4.4. Modificaciones a schemas existentes

#### `home` (singleton) — refactor completo

**Antes:** `{ hero, destacados, importantes, modulos[2 tipos], seo }`
**Después:**

```ts
{
  pageBuilder: array [
    block.bannerDescuento, block.heroCampaign, block.campaignImageVideo,
    block.productModule, block.lookModule, block.setModule,
    block.featuredSection
  ],
  seo: seo.home
}
```

> Confirmado por el usuario que el `home` actual no tiene contenido publicado. Borrado limpio de campos antiguos.

#### `page` — añadir page builder

```ts
{
  title, slug, legal, colorTheme, showHero, hero,
  body,               // se mantiene (PortableText, útil para legales)
  pageBuilder,        // NUEVO — para Our Story y futuras landings
  seo
}
```

#### `collection`, `product`, `productVariant`, `settings`, `colorTheme`, `post` y taxonomies

Sin cambios estructurales.

### 4.5. Inventario final de schemas

```
documents:
  collection ✓, colorTheme ✓, page (modificado), product ✓, productVariant ✓,
  look (NUEVO), set (NUEVO), post ✓ (fuera del MVP)

singletons:
  home (refactor), settings ✓

objects nuevos:
  bundleComponent, block.bannerDescuento, block.heroCampaign,
  block.campaignImageVideo, block.productModule, block.lookModule,
  block.setModule, block.featuredSection, block.richText
```

`hiddenDocTypes` en `sanity/desk/index.ts` añadirá: `look`, `set`, `orderable.look`, `orderable.set`.

---

## 5. Data layer (GROQ + Shopify)

### 5.1. Estrategia híbrida Sanity ↔ Shopify-live

| Contexto | Fuente |
|---|---|
| Home modules | Sanity (sync), ISR 1h |
| Shop listings (`/shop`, `/shop/[category]`) | Sanity (sync), ISR 1h |
| Looks/Sets listings | Sanity, ISR 1h |
| **PDP estándar** | Sanity (editorial) **+ Shopify Storefront live** (precio/stock/variants) |
| **PDP Look/Set** | Sanity (estructura bundle) **+ Shopify Storefront live** (precio/stock por componente) |
| Cart drawer | Shopify Cart API (live) |
| Add-to-cart | Validación stock vía Server Action antes de añadir |
| `+Ficha` modal | Live al abrir |

### 5.2. Estructura de queries GROQ

```
sanity/queries/
├── primitives/
│   ├── imageData.ts ✓
│   ├── imageSize.ts ✓
│   ├── bundleComponent.ts          (NUEVO)
│   └── productCard.ts              (NUEVO)
├── fragments/
│   ├── body.ts ✓
│   ├── image.ts ✓
│   ├── seo.ts ✓
│   ├── look.ts                     (NUEVO)
│   ├── set.ts                      (NUEVO)
│   ├── blocks.ts                   (NUEVO)
│   └── pageBuilder.ts              (NUEVO)
├── common/
│   ├── defaultSEO.ts ✓
│   ├── footer.ts ✓
│   ├── header.ts ✓
│   └── settings.ts ✓
└── queries/
    ├── home.ts                     (REESCRITO)
    ├── shop.ts                     (NUEVO)
    ├── product.ts                  (NUEVO)
    ├── looks.ts                    (NUEVO)
    ├── sets.ts                     (NUEVO)
    └── page.ts                     (NUEVO)
```

### 5.3. Extensiones a `lib/shopify.js`

Funciones nuevas:

```js
cartCreateBatch(lines)                  // lines: [{merchandiseId, quantity, attributes}]
cartLinesAddBatch(cartId, lines)        // batch add para bundles
cartLinesUpdateBatch(cartId, updates)   // batch update [{lineId, quantity}]
getProductByHandle(handle)              // Storefront live: precio, stock, variants
getCollectionByHandle(handle, opts)     // listing por colección con sort + cursor
getProductsByVariantIds(variantGids[])  // batch hydrate Look/Set components
searchPredictive(query, limit)          // Predictive Search API
```

`CART_LINES_FRAGMENT` se amplía para incluir `cost`, `attributes`, `discountAllocations`, `merchandise.{title, sku, image, product, selectedOptions, price, compareAtPrice, availableForSale, quantityAvailable}`, `totalQuantity`.

Las funciones existentes (`cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`, `login`, `getUser`, `resetPassword`) se mantienen sin cambios.

### 5.4. Convención de attributes para bundles en cart

```js
attributes: [
  { key: '_bundleId',      value: 'look-cotton-organic-jersey' },
  { key: '_bundleType',    value: 'look' | 'set' },
  { key: '_bundleLabel',   value: 'Look Cotton Organic Jersey' },
  { key: '_componentLabel', value: 'Funda nórdica' }
]
```

Estos attributes los usa también la Shopify Function para detectar el bundle y aplicar el descuento.

### 5.5. Cache & ISR

| Recurso | TTL | Tag |
|---|---|---|
| `home` | 3600s | `home` |
| `settings`, `header`, `footer` | 3600s | `settings` |
| Shop listings | 3600s | `product`, `collection` |
| `look[slug]`, `set[slug]` | 3600s | `look:<slug>`, `set:<slug>` |
| `product` editorial (Sanity) | 3600s | `product:<id>` |
| Shopify Storefront live | `cache: 'no-store'` | — |
| Cart API | `cache: 'no-store'` | — |

### 5.6. Webhook revalidate

Ruta `/api/revalidate` (POST):

1. Verifica HMAC SHA-256 con `SANITY_REVALIDATE_SECRET`.
2. Mapea `_type` a `revalidateTag(...)`:
   - `home` → `home`
   - `settings` → `settings`
   - `product` → `product:<_id>`, `product`
   - `look` → `look:<slug>`, `look`
   - `set` → `set:<slug>`, `set`
   - `page` → `page:<slug>`
   - `collection` → `collection:<_id>`, `product`
3. Devuelve 200.

Configurar webhook en Sanity Studio: filter `_type in ["home","settings","product","look","set","page","collection"]`, URL `https://www.mikmax.com/api/revalidate`.

### 5.7. Server vs Client components

Por defecto **todo Server Component**. `'use client'` solo donde hay interacción genuina:

| Server | Client |
|---|---|
| Page roots, Layout, Header, Footer, MegaMenu (markup), blocks "tontos" | CartDrawer, CartLine, CartLineBundle, MobileMenu, MobileBottomNav, VariantSelector, ProductGallery, FichaButton/Modal, BundlePDPClient, BundleComponentRow, BundleSizePicker, FilterDrawer/Modal, SearchInput/SearchResults |

Patrón: page-level Server Component fetcha → pasa props serializables → wrapper Client Component recibe lo necesario.

### 5.8. TypeScript

- Types de respuestas GROQ → `sanity/types/`.
- Types de componentes/props/hooks → `types/` raíz.

---

## 6. Cart con bundles + Shopify Function

### 6.1. Extensión de `context/shopContext.js`

Forma del item extendida (campo opcional retro-compatible):

```js
{
  store: { gid }, title, productId, image, variantQuantity, lineId,
  bundleMeta: {                       // solo si pertenece a un bundle
    bundleId, bundleType, bundleLabel, bundleSlug, componentLabel
  }
}
```

Métodos nuevos del context:

```js
async function addBundleToCart(bundleMeta, lines)
async function removeBundle(bundleId)
async function updateBundleQuantity(bundleId, newBundleQty)
function getCartGroups(cart)        // selector que agrupa por bundleId
```

Las funciones existentes (`addToCart`, `updateCartItem`, `removeCartItem`) no se tocan.

### 6.2. UI del Cart drawer

Cart drawer **overlay full-content-width** (1072px desktop según Figma `11:5641`), fullscreen mobile (compartido con MobileMenu).

```
Header: "Cart" / close
Group [single]:    [thumb] Title  Variant  − N +  €X  ×
Group [bundle]:    Bundle label · €total · qty − N +  ×
                   ↳ subtotal componentes (€) - bundle discount (−€)
                   ↳ [▼ ver componentes] (toggle)
                       • [thumb] Componente · talla · €X (read-only)
                       • …
Footer: subtotal · bundle discount · total estimated · [Checkout →]
```

Reglas:
- Bundle row colapsada por defecto, expandible.
- qty bundle multiplica todas las líneas componentes simultáneamente.
- No se permite quitar componentes individuales — solo el bundle entero.
- "Bundle discount" lee de `discountAllocations` que devuelve la Shopify Function.

### 6.3. Shopify Function (Order Discount)

**Tipo:** Order Discount Function en TypeScript, deployada vía Shopify CLI como extensión de una App custom (Partner account).

**Fuente de bundle configs:** Shopify Metaobjects, definición `bundle_config`:

```
bundle_id              (single_line_text, unique)
bundle_type            (single_line_text)
required_variant_ids   (list.product_reference)
discount_strategy      (single_line_text)   # sumMinusFixed | sumMinusPercent | overrideTotal
discount_value         (number_decimal)
price_fixed            (number_decimal)
active                 (boolean)
```

**Lógica:**

1. Agrupar líneas del cart por `_bundleId`.
2. Para cada grupo: leer metaobject correspondiente; validar que **todos** los `required_variant_ids` están presentes.
3. Calcular descuento según `discount_strategy`:
   - `sumMinusFixed`: `discountAmount = discount_value`
   - `sumMinusPercent`: `discountAmount = sumLineas * discount_value / 100`
   - `overrideTotal`: `discountAmount = sumLineas - price_fixed`
4. Repartir `discountAmount` proporcionalmente entre todas las líneas del bundle (cada línea recibe parte según su peso en la suma).
5. Devolver `discountAllocations` con `discountApplicationStrategy: 'MAXIMUM'`.

**Estructura del extension:**

```
extensions/
└── bundle-discount/
    ├── shopify.extension.toml
    ├── src/run.ts
    ├── input.graphql
    └── package.json
```

### 6.4. Sync Sanity → Shopify Metaobject

Ruta `/api/sync-bundle-to-shopify` (POST):

1. Verifica HMAC con `SANITY_SYNC_SECRET`.
2. Si `_deleted`: marca metaobject `active = false` (no borra).
3. Si publish: resuelve `slug` → `bundleId`, resuelve `components[].productVariant._ref` → `[variantGid]` (lectura adicional Sanity).
4. Llama `metaobjectUpsert` con Admin API.
5. 200 OK.

**Webhook en Sanity:** filter `_type in ["look","set"]` → URL `/api/sync-bundle-to-shopify`.

### 6.5. Validación de stock

Server Action `validateBundleStock(variantGids)`:

1. `getProductsByVariantIds(variantGids)` → live.
2. Filtra `!availableForSale || quantityAvailable < 1`.
3. Devuelve `{ ok, unavailableComponents }`.

`BundlePDPClient` la llama antes de `addBundleToCart`. Si falla, muestra error inline con el componente afectado.

### 6.6. Phasing del bundle dentro del sprint

| Fase | Día | Entregable | Si se retrasa |
|---|---|---|---|
| **A** | L8 | Cart bundles funcional **sin** descuento (cobra suma) | Bloquea Looks/Sets PDP |
| **B** | Stretch | Function deployada + sync metaobjects | Ship sin descuento, hotfix post-MVP |
| **C** | L9 | Stock validation + UX errores | OK retrasar a v1.1 |

---

## 7. Componentes UI (32 nuevos)

### 7.1. Inventario completo

```
Layout (5):    Header, MegaMenu, MobileMenu, MobileBottomNav, Footer
Cart (3):      CartDrawer, CartLine, CartLineBundle
Product (6):   ProductCard, ProductGallery, VariantSelector,
               FichaButton, FichaModal, PriceDisplay
Bundle (4):    BundleCard, BundlePDP, BundlePDPClient, BundleComponentRow
Shop (4):      ProductGrid, Breadcrumb, FilterDrawer, FilterModal
Search (2):    SearchInput, SearchResults
Blocks (8):    BannerDescuento, HeroCampaign, CampaignImageVideo,
               ProductModule, LookModule, SetModule,
               FeaturedSection, RichText
+ Common existentes: LazyImage, LazyVideo, CookieConsent, Analytics
```

### 7.2. APIs principales

#### Layout

```tsx
<Header variant="default|variant2|variant3|z" />
<MegaMenu category items featuredProduct />     // 5 variants
<MobileMenu />                                  // overlay con search + nav + cart
<MobileBottomNav />                             // sticky <768px
<Footer />
```

#### Cart

```tsx
<CartDrawer />
<CartLine line={item} />
<CartLineBundle group={bundleGroup} />
```

#### Product

```tsx
<ProductCard variant="default|grande|mini|related" product />
<ProductGallery images variantImages />
<VariantSelector product onChange />
<FichaButton onClick />
<FichaModal product variant />                  // info-only, link a PDP
<PriceDisplay price compareAtPrice discountAllocations />
```

#### Bundle

```tsx
<BundleCard bundle variant="row-wide|grid-2col|grid|row-mini" />
<BundlePDP bundle componentsLive />
<BundlePDPClient bundle componentsLive />
<BundleComponentRow component liveData selectedSize onSizeChange />
```

#### Shop

```tsx
<ProductGrid products layout="vista1|vista3" />
<Breadcrumb items={[{label,href}]} />
<FilterDrawer filters activeFilters onChange />
<FilterModal {...} />
```

#### Search

```tsx
<SearchInput />                  // debounce 300ms, min 3 chars
<SearchResults results />        // products + collections
```

#### Page Builder dispatcher

```tsx
const BLOCK_MAP = {
  'block.bannerDescuento': BannerDescuento,
  'block.heroCampaign': HeroCampaign,
  'block.campaignImageVideo': CampaignImageVideo,
  'block.productModule': ProductModule,
  'block.lookModule': LookModule,
  'block.setModule': SetModule,
  'block.featuredSection': FeaturedSection,
  'block.richText': RichText
}

export function PageBuilder({blocks}) {
  return blocks.map(b => {
    const Cmp = BLOCK_MAP[b._type]
    return Cmp ? <Cmp key={b._key} data={b} /> : null
  })
}
```

### 7.3. Convenciones cross-component

- Imágenes: `<LazyImage>` siempre. `priority` solo above-the-fold.
- Vídeos: `<LazyVideo>` siempre.
- `sizes` real por breakpoint en cada `LazyImage`.
- PascalCase de archivos, SCSS modules co-localizados.
- `'use client'` solo cuando estrictamente necesario.
- `error.tsx` por route group.

---

## 8. Estilos: tokens, mixins, breakpoints

### 8.1. Decisión mobile-first (CLAUDE.md compliance)

Se añade un mixin nuevo en `styles/mixins/_mixins.scss`:

```scss
@mixin from($bp) {
  @if      $bp == sm  { @media (min-width: 768px)  { @content; } }
  @else if $bp == md  { @media (min-width: 1024px) { @content; } }
  @else if $bp == lg  { @media (min-width: 1200px) { @content; } }
  @else if $bp == xl  { @media (min-width: 1440px) { @content; } }
  @else if $bp == xxl { @media (min-width: 1920px) { @content; } }
  @else               { @warn "from() supports: sm, md, lg, xl, xxl"; }
}
```

**Convención:** todos los componentes nuevos usan `@include from(...)` con base mobile. El `responsive()` legacy (max-width) queda solo para `Landing`/`Welcome` hasta su eliminación al final del sprint.

### 8.2. Tokens nuevos (`styles/common/_tokens.scss`)

#### Spacing

```scss
$space-0: 0;    $space-1: px(4);   $space-2: px(8);    $space-3: px(12);
$space-4: px(16); $space-5: px(24); $space-6: px(32);  $space-7: px(48);
$space-8: px(64); $space-9: px(96); $space-10: px(128);
```

#### Z-index

```scss
$z-base: 0;            $z-content: 1;          $z-sticky-header: 100;
$z-mobile-nav: 200;    $z-cart-drawer: 900;    $z-filter-drawer: 900;
$z-ficha-modal: 950;   $z-zoom-modal: 960;     $z-toast: 990;
$z-cookie-banner: 1000;
```

#### Containers

```scss
$container-mobile: 100%;     $container-tablet: 100%;
$container-desktop: px(1200); $container-wide: px(1440);
$gutter-mobile: $space-4;     $gutter-desktop: $space-6;
```

#### Transitions

```scss
$transition-fast:   200ms $ease-out-quad;
$transition-medium: 400ms $ease-out-quart;
$transition-slow:   600ms $ease-out-expo;
```

### 8.3. Tokens del Figma

Pendiente de extracción durante implementación. Cuando arranquemos cada componente, abrir el frame correspondiente y volcar paleta/typography/spacing reales a `_tokens.scss`. Riesgo bajo: la `$colors` actual y la escala typography existente son punto de partida razonable.

### 8.4. Tema (colorTheme)

Mecánica:
1. Page-level Server Component lee `colorTheme` activo.
2. Inyecta CSS custom properties en wrapper: `<div style={{ '--bg':..., '--fg':... }}>`.
3. Componentes usan `var(--bg)` / `var(--fg)`.

### 8.5. Convención SCSS module

```scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.drawer {
  width: 100%;            // mobile
  z-index: $z-cart-drawer;
  transition: transform $transition-medium;

  @include from(sm) { width: px(480); }
  @include from(lg) { width: px(560); }
}
```

- `@use` (no `@import`) en módulos nuevos.
- Clases en `camelCase` (importables como `s.drawer`).
- Mobile-first siempre.

---

## 9. Variables de entorno

### Existentes

```
NEXT_PUBLIC_SANITY_PROJECT_ID
NEXT_PUBLIC_SANITY_DATASET
NEXT_PUBLIC_SANITY_API_VERSION
NEXT_PUBLIC_SANITY_TOKEN_FORM
SHOPIFY_STORE_DOMAIN
SHOPIFY_STOREFRONT_ACCESSTOKEN
SHOPIFY_API_VERSION                      (= 2025-10)
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_CLIENT_ID
NEXT_PUBLIC_GA_ID / FB_ID / HOTJAR_ID / PINTEREST_ID
MAILCHIMP_API_KEY
MAILCHIMP_AUDIENCE_ID
MAILCHIMP_API_SERVER
```

### Nuevas

```
SHOPIFY_ADMIN_ACCESS_TOKEN              (Custom App: read_products, write_metaobjects, read_metaobjects)
SANITY_REVALIDATE_SECRET                (HMAC para webhook revalidate)
SANITY_SYNC_SECRET                      (HMAC para webhook sync-bundle-to-shopify)
```

---

## 10. Timeline

### Semana 1 — Foundations

| Día | Bloque | Entregables |
|---|---|---|
| **L1** | Setup + Schemas | Verify Sanity Connect. Add `_tokens.scss` + mixin `from()`. Crear schemas `look`, `set`, `bundleComponent`, 8 blocks. Refactor `home`, ampliar `page`. Update `desk/index.ts` y `hiddenDocTypes`. |
| **L2** | Layout chrome | Header, MegaMenu (5 variants), MobileBottomNav, Footer, NewsletterForm. Queries: `getSettings`, `getMenu`, `getFooter`. |
| **L3** | Blocks server + Home | `BannerDescuento`, `HeroCampaign`, `CampaignImageVideo`, `FeaturedSection`, `RichText`. PageBuilder dispatcher. Reescribir `app/(frontend)/page.tsx` con `getHome()` + pageBuilder. |
| **L4** | Product card + module blocks | `ProductCard` (4 variants), `PriceDisplay`, `FichaButton`, `FichaModal`. Blocks `ProductModule`, `LookModule`, `SetModule`. Wire a Home. |
| **L5** | Shop listing | `/shop`, `/shop/[category]`. `ProductGrid` (Vista 1+3). `Breadcrumb`. `FilterDrawer`+`FilterModal` (categoría, color, talla, precio). Sync URL params. |

### Semana 2 — Producto + Bundles + Polish

| Día | Bloque | Entregables |
|---|---|---|
| **L6** | PDP estándar | `/shop/product/[handle]`. `ProductGallery` (carousel + zoom). `VariantSelector`. Add to cart wiring. Confirmar Mobile PDP `11:3982`. |
| **L7** | Cart drawer + Mobile menu | `CartDrawer` (overlay 1072×desktop, fullscreen mobile). `CartLine`. `MobileMenu` (nav + cart + search input). Smoke test checkout. |
| **L8** | Bundle foundations | Extender `lib/shopify.js` y `shopContext.js`. `CartLineBundle`. Look listing `/looks` + Look PDP `/looks/[slug]` (`BundleCard`, `BundlePDP`, `BundlePDPClient`, `BundleComponentRow`). |
| **L9** | Sets + Search + Revalidate | Set listing/PDP. Stock validation Server Action. `searchPredictive` + `SearchInput`/`SearchResults`. `/api/revalidate` + webhook Sanity. |
| **L10** | Polish + deploy | Bug bash, breakpoints, error/loading states, SEO metadata, deploy staging. Stretch: Function bundle-discount + sync metaobject, /our-story, Vista 2. |

### Phasing si vamos justos

```
Mínimo aceptable (día 8): Home, Shop, PDP estándar, Cart, checkout
MVP completo (día 10):    + Looks, Sets, búsqueda, newsletter, revalidate
MVP+ (día 14):            + Function descuento, Our Story, Vista 2
```

---

## 11. Definition of Done

### Funcional

- Home renderiza pageBuilder editable desde Sanity Studio.
- `/shop` lista productos por categoría con filtros funcionales.
- `/shop/product/[handle]` permite seleccionar variante y añadir al cart.
- Cart drawer abre desde cualquier add-to-cart, muestra items, lleva a checkout.
- Checkout Shopify completa una compra real (test transaction).
- `/looks` y `/sets` listan editorialmente.
- `/looks/[slug]` y `/sets/[slug]` permiten seleccionar tallas por componente y añadir bundle al cart.
- Cart agrupa visualmente las líneas de bundle. qty/remove afectan al bundle entero.
- Search predictivo en MobileMenu devuelve productos en <500ms.
- Newsletter form en footer guarda en Mailchimp.
- Webhook `/api/revalidate` invalida tags al publicar en Sanity.

### No-funcional

- TypeScript build sin errores (`npm run typecheck`).
- ESLint sin errores (`npm run lint`).
- Build de prod sin warnings (`npm run build`).
- Lighthouse Home: Performance >75, A11y >90, SEO >95.
- Mobile (375 px) y desktop (1440 px) sin overflow horizontal.
- Imágenes solo desde `cdn.sanity.io` / `cdn.shopify.com`.
- Cero `<img>` o `<video>` nativos.
- Cero queries GROQ inline en componentes.
- Cero llamadas a `lib/shopify.js` desde Client Components.
- SEO metadata correcto por ruta (canonical, OG, Twitter).

---

## 12. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Sanity Connect lag o sync incompleto | Media | Alto | Verificar día 1. Reset/resync si necesario. Plan B: leer productos directamente de Shopify para listings. |
| Mobile PDP estándar mal etiquetada (`11:3982`) | Alta | Bajo | Día 6 pedir screenshot del frame; si no aplica, derivar del desktop. |
| Mobile Set PDP no diseñada | Alta | Bajo | Derivar de Mobile Look PDP (misma anatomía). |
| Shopify Function (Partner app + deploy) | Alta | Medio | Stretch goal. MVP ship-able sin Function (cobra suma). |
| Predictive Search rate limit | Baja | Bajo | Debounce 300 ms + min 3 chars. Caché sessionStorage 5 min. |
| Color theme integration con Look/Set | Media | Bajo | Default theme si no se asigna. Revisar schema día 1. |
| Webhook revalidate falla en prod | Media | Medio | Test día 9 con publish real. Fallback: `revalidate: 60` en queries. |
| Sanity Connect sobrescribe campos personalizados | Baja | Alto | Confirmado: Connect solo escribe en `store.*`. Custom fields fuera de ese namespace. |
| Tests automatizados | — | — | No se hacen en MVP. Smoke manual + cross-browser día 10. |

### Estado de sync Sanity Connect (verificación L1, 2026-05-05)

- 1 colección sincronizada
- 0 productos
- 0 variantes

**Bloqueante para Phase 3-4 (módulos de productos en Home, Shop listing, PDP).** Antes de llegar al día L4, el cliente debe:
1. Confirmar que Sanity Connect está instalado en el Shopify Admin con dataset `production`.
2. Crear (o publicar) productos en Shopify (mín. 1 por categoría + 2 para crear un Look + 3 para crear un Set).
3. Verificar que el sync corre y los `productVariant` aparecen con `store.sku` y `store.gid`.

**Phase 1-2 NO se bloquea** porque solo requiere schemas y datos del singleton `settings` (header/footer), que se rellenan manualmente en Sanity Studio.

### Close de Phase 1 (2026-05-05)

Schemas y tokens en producción de la rama `feature/mvp-arquitectura`. 8 commits. Typecheck y lint clean.

- `_tokens.scss` + mixin `from()` (mobile-first)
- `bundleComponent`, 8 blocks, `look`, `set` (con `colorLocked`)
- `home` refactorizado a `pageBuilder` puro; `page` ampliado con `pageBuilder` opcional
- Studio carga sin errores; entries "Looks" y "Sets" en el desk

### Close de Phase 2 (2026-05-05)

Layout chrome live en la rama. 8 commits. Typecheck y lint clean.

- `menuSettings` schema arreglado (referencia rota `menuLinks` → `linkInternal | linkExternal | menuGroup` con `featuredProduct`)
- Queries `getSettings`/`getHeader`/`getFooter` realineadas con el schema real (`menu`/`footer` en lugar de `headerMenu`/`footerMenu`)
- Types reorganizados: `MenuData`, `MenuItem`, `MenuLinkInternal`, `MenuLinkExternal`, `MenuGroup`, `MenuFeaturedProduct`, `FooterColumnData`, `SocialLink` en `sanity/types/objects/global/`
- Componentes nuevos en `components/Layout/`: `Header` (4 variants scroll-driven) + `HeaderClient`, `MegaMenu` (hover + items + featuredProduct slot), `Footer`, `NewsletterForm` (Mailchimp wired al `/api/subscribeUser` real, response shape ajustada vs. el plan), `MobileBottomNav` (sticky bottom, oculto ≥768 px), barrel `index.ts`
- `app/(frontend)/layout.tsx` ahora `async`, fetcha `getFooter`, renderiza Header/Footer/MobileBottomNav, `<html lang="es">`
- Conocidos para Phase 3+: cart button stub, MobileMenu drawer (Phase 7), search input (Phase 9), home page render queda roto en runtime hasta Phase 3 (página vieja referencia `home.hero` que ya no existe — esperado).

### Close de Phase 3 (2026-05-08)

PageBuilder dispatcher + 4 server-side blocks live on `feature/mvp-arquitectura`.
Typecheck and lint clean.

- `<PageBuilder>` server component dispatches `pageBuilder` array by `_type`.
- Block components: `HeroCampaign` (1–2 slides, image/video, title overlay, link), `CampaignImageVideo` (single media + headline + url + aspect ratio), `RichText` (PortableText with color decorators), `FeaturedSection` (image + copy + CTA, mediaPosition L/R).
- Shared `<PortableText>` renderer handles `textBlack`/`textGray` marks and the three annotation types (`annotationProduct`, `annotationLinkExternal`, `annotationLinkEmail`).
- Home (`app/(frontend)/page.tsx`) now consumes `getHome()` and renders `<PageBuilder>`; `<Landing>` placeholder removed from the route.
- Known follow-ups: `ProductModule`/`LookModule`/`SetModule` deferred to Phase 4 (need `<ProductCard>` first); `Landing` component still exists in `components/` but is unused — clean up at end of MVP.
- Production build + dev smoke test deferred until the root-owned `.next/server/` artifacts (from a stale dev server) are cleaned up by the human; typecheck and lint clean cover the static guarantees in the meantime.

### Close de Phase 4 (2026-05-09)

Three product-driven home blocks + shared cards live on `feature/mvp-arquitectura`.
Typecheck and lint clean.

- `<PriceDisplay>` shared component (single price, range, compare-at strikethrough).
- `<ProductCard>` (default Figma variant) backed by `productCardProjection` GROQ fragment.
- `<BundleCard>` for both looks and sets (kind prop swaps the route prefix).
- `<ProductModule>` renders the manual-products grid (grid-4col layout). Collection-mode source returns `[]` until a product↔collection link is wired (Phase 5+). Other layouts (`carousel`, `grid-mixed`) fall back to grid-4col.
- `<LookModule>` renders the `looks[]` references in a row (row-wide layout).
- `<SetModule>` renders the `sets[]` references in a row on a grey background, including `colorLocked` text per card (row-mini layout).
- `<ImageWithProduct>` no longer uses its inline placeholder; it composes `<ProductCard />` directly from the same projection.
- Known follow-ups: ProductCard `mini`/`hover`/`set` variants, `FichaButton`/`FichaModal` (quick-view), the rest of the layout enums (carousel, grid-mixed, grid-2col, grid), and the collection-mode resolver for ProductModule. Compare-at price is currently undefined at the product-card level until variant-aggregation lands.

---

## 13. Checklist pre-arranque (antes de día L1)

```
□ SHOPIFY_ADMIN_ACCESS_TOKEN: crear Custom App en Shopify Admin
  con scopes read_products, write_metaobjects, read_metaobjects
□ SANITY_REVALIDATE_SECRET: generar secret aleatorio
□ SANITY_SYNC_SECRET: generar secret aleatorio
□ MAILCHIMP_*: copiar de la landing actual
□ Crear Partner Account Shopify (Function deferred a stretch)
□ Confirmar permisos editor del cliente en Sanity Studio
□ Confirmar productos seed en Shopify: mínimo 1 por categoría
  + 2 productos para crear un Look + 3 para crear un Set
□ Bookmarks Figma:
  Home 11:1990, Shop V1 11:5471, Shop V3 11:5303, PDP 11:3295,
  Looks 11:1872, Sets 11:4977, Look PDP 11:4591, Set PDP 11:5234,
  Cart 11:5641, Mega-menu 11:6450
```

---

## 14. Fuera del MVP (explícito)

```
✗ Account / Login / Order history (Shopify Customer Accounts)
✗ Multi-currency / Multi-Markets (selector visible pero no funcional)
✗ Multi-idioma (i18n)
✗ Blog / Posts (schema existe, sin rutas)
✗ 404 personalizada
✗ Tests unitarios / e2e
✗ Animaciones complejas / 3D
✗ B2B / Mikmax for Business
✗ Wishlist / Favorites (botón "Favoritos" oculto en MVP)
```

---

## 15. Stretch goals (por orden)

1. Shopify Function bundle-discount + sync metaobject.
2. `/our-story` (page con pageBuilder).
3. Shop Vista 2 toggle.
