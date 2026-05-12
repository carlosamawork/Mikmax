# Mikmax PDP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Product Detail Page (`/products/[handle]`) with desktop horizontal-scroll gallery + fixed bottom toolbar and mobile vertical-scroll + sticky CTA. Variants resolved via `shopify.color-pattern` (product-level metafield); per-color galleries from `variant.image` + `custom.gallery` metafield; editorial body from Sanity (PortableText); related products manually curated in Sanity.

**Architecture:**
- `page.tsx` (server) fetches Sanity + Shopify + related in parallel, calls `buildProductView()`, passes a pre-resolved `ProductView` to `<ProductDetail>` (client root).
- `<ProductDetail>` owns `selectedColor`/`selectedSize`/`isInfoOpen`/`lightbox` state, syncs URL via `router.replace`, renders `<DesktopLayout>` and `<MobileLayout>` with CSS hide/show.
- Shared sub-components (`<ColorSwatches>`, `<SizeSelector>`, `<ProductInfoPanel>`, `<ImageLightbox>`) used by both layouts.

**Tech stack:** Next.js 15 App Router (Server Components), TypeScript strict, SCSS Modules, `next-sanity` GROQ client, Shopify Storefront API 2025-10. No new dependencies. Dynamic import for `<ImageLightbox>` (ssr:false) to keep initial bundle small.

**Testing model:** No automated tests (per project convention). Each task ends with `npm run typecheck`, `npm run lint`, manual browser verification, and a focused commit. UI tasks reference Figma node IDs — pixel-perfect styling can be polished with the `figma-maquetador` / `pixel-perfect` skills during/after the task.

**Out of scope:**
- Wishlist/favorite button functionality (renders visually only).
- Reviews/ratings.
- "Notify when back in stock".
- Cross-sell beyond manual related products.
- Video player in gallery (Sanity `videos` field unused).
- Cart drawer construction if it doesn't exist (use redirect-to-`/cart` fallback).

**Spec:** `docs/superpowers/specs/2026-05-12-pdp-design.md`

**Figma references:**
- Desktop default: node-id `11:3317`
- Desktop color change: node-id `11:3339`
- Desktop size open: node-id `32:14969`
- Desktop info panel: node-id `2024:8302`
- Desktop zoom: node-id `11:3360`
- Mobile default: node-id `11:3567`
- Mobile scrolled (toolbar inline + related): node-id `11:3365`
- Mobile size open: node-id `11:3773`
- File: `u92pryF41Lr42YVpq1Qxsn`

---

## File Structure

### Discovery / probe
- Temporary diagnostic in `lib/shopify.js` (removed after Task 1)

### Schema / queries
- Modify: `sanity/schemas/documents/product.tsx` — add `relatedProducts` field
- Create: `sanity/queries/queries/product.ts` — single product GROQ
- Modify: `lib/shopify.js` — add `getProductDetail`, `getProductCards`

### Helpers
- Create: `app/(frontend)/products/[handle]/_types.ts` — `ProductView`, `ProductColor`, `ColorSize`, `GalleryImage`, `ProductMiniCard`
- Create: `lib/product/buildProductView.ts` — pure function combining Sanity + Shopify
- Create: `lib/product/findEquivalentSize.ts` — color↔size coherence helper
- Create: `lib/product/resolveInitialState.ts` — parses search params

### Route
- Create: `app/(frontend)/products/[handle]/page.tsx` — server entry
- Create: `app/(frontend)/products/[handle]/ProductDetail.tsx` — client root
- Create: `app/(frontend)/products/[handle]/loading.tsx`
- Create: `app/(frontend)/products/[handle]/error.tsx`

### Components — shared
- Create: `app/(frontend)/products/[handle]/components/shared/PriceLabel.tsx`
- Create: `app/(frontend)/products/[handle]/components/shared/Breadcrumb.tsx` + `.module.scss`
- Create: `app/(frontend)/products/[handle]/components/shared/ColorSwatches.tsx` + `.module.scss`
- Create: `app/(frontend)/products/[handle]/components/shared/SizeSelector.tsx` + `.module.scss`
- Create: `app/(frontend)/products/[handle]/components/shared/ProductInfoPanel.tsx` + `.module.scss`
- Create: `app/(frontend)/products/[handle]/components/shared/ImageLightbox.tsx` + `.module.scss`
- Create: `app/(frontend)/products/[handle]/components/shared/RelatedMiniCard.tsx` + `.module.scss`

### Components — desktop
- Create: `app/(frontend)/products/[handle]/components/Desktop/DesktopLayout.tsx` + `.module.scss`
- Create: `app/(frontend)/products/[handle]/components/Desktop/GalleryHorizontal.tsx` + `.module.scss`
- Create: `app/(frontend)/products/[handle]/components/Desktop/DesktopToolbar.tsx` + `.module.scss`

### Components — mobile
- Create: `app/(frontend)/products/[handle]/components/Mobile/MobileLayout.tsx` + `.module.scss`
- Create: `app/(frontend)/products/[handle]/components/Mobile/GallerySwiper.tsx` + `.module.scss`
- Create: `app/(frontend)/products/[handle]/components/Mobile/MobileToolbar.tsx` + `.module.scss`
- Create: `app/(frontend)/products/[handle]/components/Mobile/RelatedGrid.tsx` + `.module.scss`
- Create: `app/(frontend)/products/[handle]/components/Mobile/StickyCTA.tsx` + `.module.scss`

---

## Task 1: Discover `custom.gallery` metafield shape

**Why first:** The shape of `custom.gallery` is unknown. The query in `getProductDetail` depends on it. Probe it before writing the real query.

**Files:**
- Modify (temporary): `lib/shopify.js` (add probe field, remove in Task 5)
- Modify (temporary): `lib/shop/expandToCards.ts` (log the probe, remove in Task 5)

- [ ] **Step 1: Add a probe metafield to the variant query in the existing `PRODUCT_CARD_FRAGMENT`**

In `lib/shopify.js`, inside `variants(first:100) { nodes { ... } }`, after `selectedOptions { name value }`, add:

```graphql
galleryProbe: metafield(namespace: "custom", key: "gallery") {
  type
  value
  references(first: 25) {
    nodes {
      __typename
      ... on MediaImage {
        id
        image { url altText width height }
      }
      ... on Video {
        id
        sources { url mimeType }
      }
      ... on Metaobject {
        id
        handle
        type
        fields { key value }
      }
    }
  }
}
```

- [ ] **Step 2: Update `lib/shop/expandToCards.ts` to dump the probe**

In `expandProductsToCards`, inside the existing debug loop, add a per-variant log:

```ts
for (const v of variants) {
  // eslint-disable-next-line no-console
  console.log(
    `[probe] ${p.handle} variant=${v.id.split('/').pop()} galleryProbe=`,
    JSON.stringify((v as any).galleryProbe, null, 2),
  )
}
```

- [ ] **Step 3: Reload `/shop` in the browser**

Pick a product with a real gallery (a known good color, e.g. one with multiple images in Shopify Admin). Inspect the server console output. Record:
- The `type` value (expected: `list.file_reference` or similar)
- The `__typename` of each reference node
- The shape of the resolved image (where `image.url` lives in MediaImage)

Document findings inline at the top of `lib/shopify.js` as a comment.

- [ ] **Step 4: If shape differs from spec assumption, update spec**

If the metafield isn't `list.file_reference → MediaImage`, edit `docs/superpowers/specs/2026-05-12-pdp-design.md` section 4.3 to reflect actual shape and amend later tasks accordingly.

- [ ] **Step 5: Revert probe**

Remove the `galleryProbe` field from `PRODUCT_CARD_FRAGMENT` and the probe log from `expandToCards.ts`. Run:

```bash
npm run typecheck && npm run lint
```

Expected: clean.

- [ ] **Step 6: Commit findings**

```bash
git add docs/superpowers/specs/2026-05-12-pdp-design.md
git commit -m "Document custom.gallery metafield shape from probe"
```

Skip the commit if no spec change was needed.

---

## Task 2: Add `relatedProducts` field to Sanity product schema

**Files:**
- Modify: `sanity/schemas/documents/product.tsx`

- [ ] **Step 1: Add the field definition**

In `sanity/schemas/documents/product.tsx`, after the existing `videos` field (around line 101) and before `orderRank`, insert:

```tsx
defineField({
  name: 'relatedProducts',
  title: 'Related products',
  description: 'Manual curation. Max 10. Order matters: shown left-to-right in the PDP.',
  type: 'array',
  of: [{type: 'reference', to: [{type: 'product'}]}],
  group: 'editorial',
  validation: (Rule) => Rule.max(10),
}),
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Verify in Sanity Studio**

```bash
npm run dev
```

Open `http://localhost:3000/admin`, open any product document, switch to "Editorial" group, confirm "Related products" field appears with array of reference inputs.

- [ ] **Step 4: Commit**

```bash
git add sanity/schemas/documents/product.tsx
git commit -m "Add relatedProducts field to product schema"
```

---

## Task 3: ProductView types

**Files:**
- Create: `app/(frontend)/products/[handle]/_types.ts`

- [ ] **Step 1: Create types file**

```ts
// app/(frontend)/products/[handle]/_types.ts
import type {PortableTextBlock} from '@portabletext/types'

export type GalleryImage = {
  url: string
  altText?: string
  width?: number
  height?: number
}

export type ColorSize = {
  variantId: string         // gid://shopify/ProductVariant/...
  label: string             // '240X220'
  price: number
  compareAtPrice?: number
  availableForSale: boolean
}

export type ProductColor = {
  slug: string                  // 'cardon-seed'
  label: string                 // 'CARDON SEED'
  hex: string                   // '#757331'
  taxonomyValueGids: string[]   // ['gid://shopify/TaxonomyValue/9']
  images: GalleryImage[]
  sizes: ColorSize[]
}

export type ProductEditorial = {
  descripcion: PortableTextBlock[] | null
  propiedadesMaterial: PortableTextBlock[] | null
  recomendacionesLavado: PortableTextBlock[] | null
  usoRecomendado: PortableTextBlock[] | null
}

export type ProductMiniCard = {
  handle: string
  title: string
  imageUrl?: string
  imageAlt?: string
  minPrice?: number
  maxPrice?: number
}

export type ProductView = {
  id: string
  handle: string
  title: string
  currency: string
  minPrice: number
  maxPrice: number
  featuredImageUrl?: string
  editorial: ProductEditorial
  hasEditorial: boolean
  colors: ProductColor[]
  defaultColorSlug: string
  related: ProductMiniCard[]
}

export type ProductInitialState = {
  color: string
  size: string | undefined
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: clean (file is self-contained, no imports beyond types).

- [ ] **Step 3: Commit**

```bash
git add "app/(frontend)/products/[handle]/_types.ts"
git commit -m "Add ProductView type definitions"
```

---

## Task 4: Sanity GROQ query for single product

**Files:**
- Create: `sanity/queries/queries/product.ts`

- [ ] **Step 1: Write the query and accessor**

```ts
// sanity/queries/queries/product.ts
import {getSanityClient} from '@/sanity/queries'

export const PRODUCT_BY_HANDLE_QUERY = `
  *[_type == "product"
     && store.slug.current == $handle
     && !(_id in path('drafts.**'))][0] {
    _id,
    descripcion,
    propiedadesMaterial,
    recomendacionesLavado,
    usoRecomendado,
    "relatedProductHandles": relatedProducts[]->store.slug.current,
    "title": store.title,
    "slug": store.slug.current
  }
`

export type SanityProductDoc = {
  _id: string
  descripcion: unknown[] | null
  propiedadesMaterial: unknown[] | null
  recomendacionesLavado: unknown[] | null
  usoRecomendado: unknown[] | null
  relatedProductHandles: string[] | null
  title: string
  slug: string
}

export async function getSanityProduct(handle: string): Promise<SanityProductDoc | null> {
  const client = getSanityClient()
  const doc = await client.fetch<SanityProductDoc | null>(PRODUCT_BY_HANDLE_QUERY, {handle})
  return doc ?? null
}
```

- [ ] **Step 2: Verify the Sanity client export is `getSanityClient`**

```bash
grep -n "getSanityClient\|export.*sanity" sanity/queries/index.tsx
```

If the helper is named differently (e.g. `getClient` or default `sanityClient`), adjust the import in Step 1.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add sanity/queries/queries/product.ts
git commit -m "Add GROQ query for single product by handle"
```

---

## Task 5: Shopify queries — `getProductDetail` and `getProductCards`

**Files:**
- Modify: `lib/shopify.js`

- [ ] **Step 1: Add `PRODUCT_DETAIL_FRAGMENT` and `getProductDetail`**

In `lib/shopify.js`, after the existing `COLLECTION_FILTERS_QUERY` block (around line 349), append:

```js
// --- PDP helpers (added 2026-05-12) ---

const PRODUCT_DETAIL_FRAGMENT = `
  fragment ProductDetail on Product {
    id
    handle
    title
    descriptionHtml
    productType
    vendor
    tags
    featuredImage { url altText width height }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    compareAtPriceRange {
      maxVariantPrice { amount currencyCode }
    }
    options { name values }
    colorPattern: metafield(namespace: "shopify", key: "color-pattern") {
      type
      value
      references(first: 25) {
        nodes {
          ... on Metaobject {
            id
            handle
            type
            fields { key value }
          }
        }
      }
    }
    seo { title description }
    variants(first: 100) {
      nodes {
        id
        availableForSale
        image { url altText width height }
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        selectedOptions { name value }
        gallery: metafield(namespace: "custom", key: "gallery") {
          type
          value
          references(first: 25) {
            nodes {
              ... on MediaImage {
                image { url altText width height }
              }
            }
          }
        }
      }
    }
  }
`

const PRODUCT_DETAIL_QUERY = `
  ${PRODUCT_DETAIL_FRAGMENT}
  query ProductDetail($handle: String!) {
    product(handle: $handle) { ...ProductDetail }
  }
`

export async function getProductDetail(handle) {
  const data = await shopifyData(PRODUCT_DETAIL_QUERY, {handle})
  return data?.product ?? null
}
```

> **NOTE:** Adjust the `gallery` field references if Task 1 found a different shape (e.g. `... on Video` or `... on Metaobject`).

- [ ] **Step 2: Add `getProductCards` for related products**

Below `getProductDetail`, append:

```js
const PRODUCT_CARDS_QUERY = `
  query ProductCards($query: String!) {
    products(first: 25, query: $query) {
      nodes {
        id
        handle
        title
        featuredImage { url altText }
        priceRange {
          minVariantPrice { amount }
          maxVariantPrice { amount }
        }
      }
    }
  }
`

export async function getProductCards(handles) {
  if (!Array.isArray(handles) || handles.length === 0) return []
  const query = handles.map((h) => `handle:${h}`).join(' OR ')
  const data = await shopifyData(PRODUCT_CARDS_QUERY, {query})
  return data?.products?.nodes ?? []
}
```

- [ ] **Step 3: Typecheck + lint**

```bash
npm run typecheck && npm run lint
```

Expected: clean.

- [ ] **Step 4: Smoke test from a temporary file** *(optional — skip if confident)*

Create `scripts/probe-product.mjs`:

```js
import {getProductDetail, getProductCards} from '../lib/shopify.js'
const product = await getProductDetail('funda-nordica-algodon-organico-blanc-de-blanc')
console.log('product:', JSON.stringify(product, null, 2))
const cards = await getProductCards([product.handle])
console.log('cards:', cards)
```

Run: `node scripts/probe-product.mjs`. Confirm `colorPattern.references.nodes[]` and `variants.nodes[].gallery.references.nodes[]` are populated. Delete the script after verification.

- [ ] **Step 5: Commit**

```bash
git add lib/shopify.js
git commit -m "Add getProductDetail and getProductCards Shopify queries"
```

---

## Task 6: `findEquivalentSize` helper

**Files:**
- Create: `lib/product/findEquivalentSize.ts`

- [ ] **Step 1: Write the helper**

```ts
// lib/product/findEquivalentSize.ts
import type {ProductColor, ProductView} from '@/app/(frontend)/products/[handle]/_types'

/**
 * When switching color, keep the previously-selected size if it exists and is
 * still available in the new color; otherwise return undefined so the UI resets
 * to "Please Select Size".
 */
export function findEquivalentSize(
  view: ProductView,
  newColorSlug: string,
  prevSize: string | undefined,
): string | undefined {
  if (!prevSize) return undefined
  const color = view.colors.find((c) => c.slug === newColorSlug)
  if (!color) return undefined
  const sameLabel = color.sizes.find((s) => s.label === prevSize)
  return sameLabel?.availableForSale ? sameLabel.label : undefined
}

export function findColor(view: ProductView, slug: string): ProductColor | undefined {
  return view.colors.find((c) => c.slug === slug)
}

export function findVariant(
  view: ProductView,
  colorSlug: string,
  sizeLabel: string | undefined,
): {variantId: string; price: number} | undefined {
  if (!sizeLabel) return undefined
  const color = findColor(view, colorSlug)
  const size = color?.sizes.find((s) => s.label === sizeLabel)
  return size?.availableForSale ? {variantId: size.variantId, price: size.price} : undefined
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add lib/product/findEquivalentSize.ts
git commit -m "Add findEquivalentSize helper for color/size coherence"
```

---

## Task 7: `buildProductView` pre-processor

**Files:**
- Create: `lib/product/buildProductView.ts`

- [ ] **Step 1: Write the slugify helper at the top**

```ts
// lib/product/buildProductView.ts
import type {
  ProductView,
  ProductColor,
  ColorSize,
  GalleryImage,
  ProductMiniCard,
} from '@/app/(frontend)/products/[handle]/_types'
import type {SanityProductDoc} from '@/sanity/queries/queries/product'

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseGidArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string')
    if (typeof parsed === 'string') return [parsed]
  } catch {
    if (typeof raw === 'string' && raw.startsWith('gid://')) return [raw]
  }
  return []
}
```

- [ ] **Step 2: Add metaobject extraction helpers**

Append to the same file:

```ts
type MetaobjectField = {key: string; value: string | null}
type MetaobjectNode = {
  id: string
  handle?: string | null
  fields: MetaobjectField[]
}

function metaobjectField(m: MetaobjectNode, key: string): string | null {
  return m.fields.find((f) => f.key === key)?.value ?? null
}

function readBaseGids(m: MetaobjectNode): string[] {
  return parseGidArray(metaobjectField(m, 'color_taxonomy_reference'))
}

function findColorMetaobject(
  metaobjects: MetaobjectNode[],
  colorValue: string,
): MetaobjectNode | undefined {
  const target = colorValue.trim().toLowerCase()
  return metaobjects.find((m) => metaobjectField(m, 'label')?.trim().toLowerCase() === target)
}
```

- [ ] **Step 3: Add gallery extraction helper**

Append:

```ts
type ShopifyVariant = {
  id: string
  availableForSale: boolean
  image?: {url: string; altText?: string | null; width?: number; height?: number} | null
  price: {amount: string; currencyCode: string}
  compareAtPrice?: {amount: string} | null
  selectedOptions: {name: string; value: string}[]
  gallery?: {
    type: string
    value: string | null
    references?: {
      nodes: Array<{
        image?: {url: string; altText?: string | null; width?: number; height?: number}
      }>
    } | null
  } | null
}

function readVariantGallery(v: ShopifyVariant): GalleryImage[] {
  const out: GalleryImage[] = []
  if (v.image?.url) {
    out.push({
      url: v.image.url,
      altText: v.image.altText ?? undefined,
      width: v.image.width,
      height: v.image.height,
    })
  }
  for (const node of v.gallery?.references?.nodes ?? []) {
    const img = node.image
    if (img?.url) {
      out.push({
        url: img.url,
        altText: img.altText ?? undefined,
        width: img.width,
        height: img.height,
      })
    }
  }
  return out
}
```

- [ ] **Step 4: Add the main `buildProductView` function**

Append:

```ts
type ShopifyProductDetail = {
  id: string
  handle: string
  title: string
  productType?: string
  vendor?: string
  tags?: string[]
  featuredImage?: {url: string; altText?: string | null} | null
  priceRange: {
    minVariantPrice: {amount: string; currencyCode: string}
    maxVariantPrice: {amount: string; currencyCode: string}
  }
  compareAtPriceRange?: {maxVariantPrice: {amount: string}}
  options?: {name: string; values: string[]}[]
  colorPattern?: {
    references?: {nodes: MetaobjectNode[]} | null
  } | null
  variants: {nodes: ShopifyVariant[]}
}

type RelatedShopifyCard = {
  id: string
  handle: string
  title: string
  featuredImage?: {url: string; altText?: string | null} | null
  priceRange: {
    minVariantPrice: {amount: string}
    maxVariantPrice: {amount: string}
  }
}

export function buildProductView(
  sanity: SanityProductDoc | null,
  shopify: ShopifyProductDetail,
  related: RelatedShopifyCard[],
): ProductView {
  const metaobjects = shopify.colorPattern?.references?.nodes ?? []
  const variants = shopify.variants?.nodes ?? []
  const colorOption = shopify.options?.find((o) => o.name.toLowerCase() === 'color')

  const colorsMap = new Map<string, ProductColor>()

  if (!colorOption) {
    const fallbackImages: GalleryImage[] = variants.length
      ? readVariantGallery(variants[0])
      : []
    if (fallbackImages.length === 0 && shopify.featuredImage?.url) {
      fallbackImages.push({
        url: shopify.featuredImage.url,
        altText: shopify.featuredImage.altText ?? undefined,
      })
    }
    const sizes: ColorSize[] = variants.map((v) => ({
      variantId: v.id,
      label: v.selectedOptions.find((o) => o.name.toLowerCase() === 'size')?.value ?? 'Default',
      price: Number(v.price.amount),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice.amount) : undefined,
      availableForSale: v.availableForSale,
    }))
    colorsMap.set('default', {
      slug: 'default',
      label: 'Default',
      hex: '#a4a4a4',
      taxonomyValueGids: [],
      images: fallbackImages,
      sizes,
    })
  } else {
    for (const v of variants) {
      const colorValue = v.selectedOptions.find((o) => o.name.toLowerCase() === 'color')?.value
      if (!colorValue) continue
      const slug = slugify(colorValue)
      if (!colorsMap.has(slug)) {
        const meta = findColorMetaobject(metaobjects, colorValue)
        colorsMap.set(slug, {
          slug,
          label: colorValue,
          hex: meta ? metaobjectField(meta, 'color') ?? '#a4a4a4' : '#a4a4a4',
          taxonomyValueGids: meta ? readBaseGids(meta) : [],
          images: [],
          sizes: [],
        })
      }
      const color = colorsMap.get(slug)!
      const sizeValue =
        v.selectedOptions.find((o) => o.name.toLowerCase() === 'size')?.value ?? 'Default'
      color.sizes.push({
        variantId: v.id,
        label: sizeValue,
        price: Number(v.price.amount),
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice.amount) : undefined,
        availableForSale: v.availableForSale,
      })
      // Use the first available variant of this color for the gallery
      if (color.images.length === 0 || (v.availableForSale && color.images.length < 1)) {
        const imgs = readVariantGallery(v)
        if (imgs.length > 0) color.images = imgs
      }
    }
    // Fallback: any color with no images uses the product featured image
    for (const c of colorsMap.values()) {
      if (c.images.length === 0 && shopify.featuredImage?.url) {
        c.images.push({
          url: shopify.featuredImage.url,
          altText: shopify.featuredImage.altText ?? undefined,
        })
      }
    }
  }

  const colors = Array.from(colorsMap.values())
  const defaultColor =
    colors.find((c) => c.sizes.some((s) => s.availableForSale))?.slug ?? colors[0]?.slug ?? ''

  const editorial = {
    descripcion: (sanity?.descripcion ?? null) as ProductView['editorial']['descripcion'],
    propiedadesMaterial: (sanity?.propiedadesMaterial ?? null) as ProductView['editorial']['propiedadesMaterial'],
    recomendacionesLavado: (sanity?.recomendacionesLavado ?? null) as ProductView['editorial']['recomendacionesLavado'],
    usoRecomendado: (sanity?.usoRecomendado ?? null) as ProductView['editorial']['usoRecomendado'],
  }
  const hasEditorial = Object.values(editorial).some(
    (v) => Array.isArray(v) && v.length > 0,
  )

  const relatedCards: ProductMiniCard[] = related
    .filter((p) => p.handle !== shopify.handle)
    .map((p) => ({
      handle: p.handle,
      title: p.title,
      imageUrl: p.featuredImage?.url,
      imageAlt: p.featuredImage?.altText ?? undefined,
      minPrice: Number(p.priceRange.minVariantPrice.amount),
      maxPrice: Number(p.priceRange.maxVariantPrice.amount),
    }))

  return {
    id: shopify.id,
    handle: shopify.handle,
    title: shopify.title,
    currency: shopify.priceRange.minVariantPrice.currencyCode,
    minPrice: Number(shopify.priceRange.minVariantPrice.amount),
    maxPrice: Number(shopify.priceRange.maxVariantPrice.amount),
    featuredImageUrl: shopify.featuredImage?.url,
    editorial,
    hasEditorial,
    colors,
    defaultColorSlug: defaultColor,
    related: relatedCards,
  }
}
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/product/buildProductView.ts
git commit -m "Add buildProductView pre-processor combining Sanity + Shopify data"
```

---

## Task 8: `resolveInitialState` helper

**Files:**
- Create: `lib/product/resolveInitialState.ts`

- [ ] **Step 1: Write the helper**

```ts
// lib/product/resolveInitialState.ts
import type {ProductView, ProductInitialState} from '@/app/(frontend)/products/[handle]/_types'

function pickFirst(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

export function resolveInitialState(
  view: ProductView,
  searchParams: Record<string, string | string[] | undefined>,
): ProductInitialState {
  const requestedColor = pickFirst(searchParams.color)
  const colorExists = view.colors.find((c) => c.slug === requestedColor)
  const color = colorExists?.slug ?? view.defaultColorSlug

  const requestedSize = pickFirst(searchParams.size)
  const resolvedColor = view.colors.find((c) => c.slug === color)
  const sizeExists = resolvedColor?.sizes.find(
    (s) => s.label === requestedSize && s.availableForSale,
  )
  return {color, size: sizeExists?.label}
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add lib/product/resolveInitialState.ts
git commit -m "Add resolveInitialState parser for color/size search params"
```

---

## Task 9: Route `page.tsx` server skeleton

**Files:**
- Create: `app/(frontend)/products/[handle]/page.tsx`

- [ ] **Step 1: Create the server entry with data fetching only (no UI yet)**

```tsx
// app/(frontend)/products/[handle]/page.tsx
import {notFound} from 'next/navigation'
import {getProductDetail, getProductCards} from '@/lib/shopify'
import {getSanityProduct} from '@/sanity/queries/queries/product'
import {buildProductView} from '@/lib/product/buildProductView'
import {resolveInitialState} from '@/lib/product/resolveInitialState'

export const revalidate = 300

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{handle: string}>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const {handle} = await params
  const search = await searchParams

  const [sanityDoc, shopifyProduct] = await Promise.all([
    getSanityProduct(handle),
    getProductDetail(handle),
  ])
  if (!shopifyProduct) notFound()

  const relatedHandles = sanityDoc?.relatedProductHandles ?? []
  const relatedCards = relatedHandles.length ? await getProductCards(relatedHandles) : []

  const view = buildProductView(sanityDoc, shopifyProduct, relatedCards)
  const initial = resolveInitialState(view, search)

  return (
    <pre style={{padding: 20, fontSize: 11}}>
      {JSON.stringify({initial, view}, null, 2)}
    </pre>
  )
}
```

- [ ] **Step 2: Visual verification**

Run `npm run dev`, then navigate to `http://localhost:3000/products/funda-nordica-algodon-organico-blanc-de-blanc`. Expected: JSON dump of the resolved `ProductView` shows `colors[]` populated with `images[]`, `sizes[]`, `hex`, `taxonomyValueGids`. Confirm `defaultColorSlug` matches a color with stock.

Test 404: navigate to `/products/this-handle-does-not-exist` → expect Next.js 404.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(frontend)/products/[handle]/page.tsx"
git commit -m "Add PDP server page with data fetching and resolved ProductView"
```

---

## Task 10: `<ProductDetail>` client root

**Files:**
- Create: `app/(frontend)/products/[handle]/ProductDetail.tsx`

- [ ] **Step 1: Create client root with state and URL sync (no layouts yet)**

```tsx
// app/(frontend)/products/[handle]/ProductDetail.tsx
'use client'
import {useEffect, useState} from 'react'
import {usePathname, useRouter} from 'next/navigation'
import {findEquivalentSize} from '@/lib/product/findEquivalentSize'
import type {ProductView, ProductInitialState} from './_types'

interface Props {
  view: ProductView
  initial: ProductInitialState
}

export default function ProductDetail({view, initial}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const [selectedColor, setSelectedColor] = useState<string>(initial.color)
  const [selectedSize, setSelectedSize] = useState<string | undefined>(initial.size)
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{open: boolean; index: number}>({open: false, index: 0})

  // URL sync (shallow replace, no scroll, no history entry per change)
  useEffect(() => {
    const usp = new URLSearchParams()
    if (selectedColor && selectedColor !== view.defaultColorSlug) usp.set('color', selectedColor)
    if (selectedSize) usp.set('size', selectedSize)
    const qs = usp.toString()
    const target = qs ? `${pathname}?${qs}` : pathname
    router.replace(target, {scroll: false})
  }, [selectedColor, selectedSize, pathname, router, view.defaultColorSlug])

  function changeColor(slug: string) {
    setSelectedColor(slug)
    setSelectedSize((prev) => findEquivalentSize(view, slug, prev))
  }

  const currentColor = view.colors.find((c) => c.slug === selectedColor) ?? view.colors[0]

  return (
    <div>
      <pre style={{padding: 20, fontSize: 11}}>
        {JSON.stringify(
          {selectedColor, selectedSize, isInfoOpen, lightbox, currentColorImages: currentColor.images.length},
          null,
          2,
        )}
      </pre>
      <button onClick={() => changeColor(view.colors[1]?.slug ?? view.colors[0].slug)}>
        Switch color (test)
      </button>
      <button onClick={() => setSelectedSize(currentColor.sizes[0]?.label)}>
        Pick first size (test)
      </button>
      <button onClick={() => setIsInfoOpen((v) => !v)}>Toggle info (test)</button>
    </div>
  )
}
```

- [ ] **Step 2: Wire it into `page.tsx`**

In `app/(frontend)/products/[handle]/page.tsx`, replace the `<pre>` return with:

```tsx
import ProductDetail from './ProductDetail'

// inside the function:
return <ProductDetail view={view} initial={initial} />
```

- [ ] **Step 3: Browser smoke test**

Reload `/products/funda-nordica-algodon-organico-blanc-de-blanc`. Click the test buttons:
- "Switch color" → URL updates `?color=...`, size resets if not equivalent.
- "Pick first size" → URL adds `?size=...`.
- Reload with the query params → state should be preserved (initial resolved correctly).

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "app/(frontend)/products/[handle]/page.tsx" "app/(frontend)/products/[handle]/ProductDetail.tsx"
git commit -m "Add ProductDetail client root with state and URL sync"
```

---

## Task 11: `<PriceLabel>` shared component

**Files:**
- Create: `app/(frontend)/products/[handle]/components/shared/PriceLabel.tsx`

- [ ] **Step 1: Create the component**

```tsx
// app/(frontend)/products/[handle]/components/shared/PriceLabel.tsx

interface Props {
  min: number
  max?: number
  currency: string
}

const FMT = new Intl.NumberFormat('es-ES', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})

export default function PriceLabel({min, max, currency}: Props) {
  if (currency !== 'EUR') {
    // Fallback for unknown currency
    return <span>{min}{max && max !== min ? ` - ${max}` : ''} {currency}</span>
  }
  const minStr = FMT.format(min)
  if (max === undefined || max === min) return <span>{minStr}</span>
  return <span>{minStr} - {FMT.format(max)}</span>
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "app/(frontend)/products/[handle]/components/shared/PriceLabel.tsx"
git commit -m "Add PriceLabel formatting component"
```

---

## Task 12: `<Breadcrumb>` shared component

**Files:**
- Create: `app/(frontend)/products/[handle]/components/shared/Breadcrumb.tsx`
- Create: `app/(frontend)/products/[handle]/components/shared/Breadcrumb.module.scss`

**Figma reference:** Breadcrumb visible in node `11:3317` toolbar (Home / Shop / Sábanas y fundas nórdicas / Funda Nórdica Algodón Orgánico Blanc de Blanc).

- [ ] **Step 1: Component**

```tsx
// app/(frontend)/products/[handle]/components/shared/Breadcrumb.tsx
import Link from 'next/link'
import s from './Breadcrumb.module.scss'

interface Props {
  title: string
}

export default function Breadcrumb({title}: Props) {
  return (
    <nav className={s.breadcrumb} aria-label="Breadcrumb">
      <ol className={s.list}>
        <li><Link href="/">Home</Link></li>
        <li><Link href="/shop">Shop</Link></li>
        <li aria-current="page">{title}</li>
      </ol>
    </nav>
  )
}
```

- [ ] **Step 2: Basic SCSS (refine later with figma-maquetador)**

```scss
// Breadcrumb.module.scss
.breadcrumb {
  padding: 8px 7px;
}

.list {
  display: flex;
  gap: 15px;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 9px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #a4a4a4;

  li[aria-current='page'] {
    color: black;
  }

  a {
    color: inherit;
    text-decoration: none;
  }
}
```

- [ ] **Step 3: Typecheck + lint**

```bash
npm run typecheck && npm run lint
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(frontend)/products/[handle]/components/shared/Breadcrumb"*
git commit -m "Add Breadcrumb component for PDP"
```

---

## Task 13: `<ColorSwatches>` shared component

**Figma references:** Swatch row visible in node `11:3317` (default — black indicator under one swatch = selected) and `11:3339` (different selection).

**Files:**
- Create: `app/(frontend)/products/[handle]/components/shared/ColorSwatches.tsx`
- Create: `app/(frontend)/products/[handle]/components/shared/ColorSwatches.module.scss`

- [ ] **Step 1: Component**

```tsx
// app/(frontend)/products/[handle]/components/shared/ColorSwatches.tsx
'use client'
import type {ProductColor} from '../../_types'
import s from './ColorSwatches.module.scss'

interface Props {
  colors: ProductColor[]
  selected: string
  onSelect: (slug: string) => void
  className?: string
}

export default function ColorSwatches({colors, selected, onSelect, className}: Props) {
  return (
    <div className={[s.row, className].filter(Boolean).join(' ')} role="radiogroup" aria-label="Color">
      {colors.map((c) => {
        const isSelected = c.slug === selected
        return (
          <button
            key={c.slug}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={c.label}
            className={s.swatch}
            onClick={() => onSelect(c.slug)}
          >
            <span className={s.color} style={{backgroundColor: c.hex}} />
            <span className={[s.bar, isSelected ? s.barSelected : ''].join(' ')} />
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: SCSS**

```scss
// ColorSwatches.module.scss
.row {
  display: flex;
  align-items: stretch;
  width: 100%;
}

.swatch {
  flex: 1 0 0;
  display: flex;
  flex-direction: column;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  height: 40px;
  min-width: 0;
}

.color {
  flex: 0 0 64.86%;
  border: 1px solid #fff;
}

.bar {
  flex: 0 0 35.14%;
  background: transparent;
  margin: 0 3.85%;
}

.barSelected {
  background: black;
}
```

- [ ] **Step 3: Wire into `ProductDetail` for visual check**

Temporarily replace the test buttons in `ProductDetail.tsx`:

```tsx
import ColorSwatches from './components/shared/ColorSwatches'

// inside the return:
<ColorSwatches colors={view.colors} selected={selectedColor} onSelect={changeColor} />
```

- [ ] **Step 4: Browser smoke test**

Reload PDP. Click each swatch → URL updates, the JSON dump shows `selectedColor` changing.

- [ ] **Step 5: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add "app/(frontend)/products/[handle]/components/shared/ColorSwatches"* "app/(frontend)/products/[handle]/ProductDetail.tsx"
git commit -m "Add ColorSwatches component"
```

---

## Task 14: `<SizeSelector>` shared component

**Figma reference:** Closed state in node `11:3317` (single row showing selected size + price). Open state in node `32:14969` (panel above with rows of variants + Select button).

**Files:**
- Create: `app/(frontend)/products/[handle]/components/shared/SizeSelector.tsx`
- Create: `app/(frontend)/products/[handle]/components/shared/SizeSelector.module.scss`

- [ ] **Step 1: Component**

```tsx
// app/(frontend)/products/[handle]/components/shared/SizeSelector.tsx
'use client'
import {useState} from 'react'
import type {ColorSize} from '../../_types'
import s from './SizeSelector.module.scss'

interface Props {
  sizes: ColorSize[]
  selected: string | undefined
  currency: string
  onSelect: (label: string) => void
  className?: string
  productSubtitle?: string  // e.g. variant family label shown above the list in desktop
}

const FMT = new Intl.NumberFormat('es-ES', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})

export default function SizeSelector({sizes, selected, currency, onSelect, className, productSubtitle}: Props) {
  const [open, setOpen] = useState(false)
  const current = selected ? sizes.find((s) => s.label === selected) : undefined

  return (
    <div className={[s.wrap, className].filter(Boolean).join(' ')}>
      <button type="button" className={s.trigger} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={s.label}>Size:</span>
        {current ? (
          <>
            <span className={s.value}>{current.label}</span>
            <span className={s.price}>{currency === 'EUR' ? FMT.format(current.price) : `${current.price} ${currency}`}</span>
          </>
        ) : (
          <span className={s.placeholder}>Please select a size</span>
        )}
        <span className={[s.caret, open ? s.caretOpen : ''].join(' ')} aria-hidden>▾</span>
      </button>
      {open && (
        <div className={s.panel} role="listbox">
          {productSubtitle && <div className={s.subtitle}>{productSubtitle}</div>}
          {sizes.map((sz) => (
            <div key={sz.variantId} className={[s.row, !sz.availableForSale ? s.rowDisabled : ''].join(' ')}>
              <span className={s.rowLabel}>{sz.label}</span>
              <span className={s.rowPrice}>{currency === 'EUR' ? FMT.format(sz.price) : `${sz.price} ${currency}`}</span>
              <button
                type="button"
                className={s.selectBtn}
                disabled={!sz.availableForSale}
                onClick={() => {
                  onSelect(sz.label)
                  setOpen(false)
                }}
              >
                {sz.availableForSale ? 'Select' : 'Sold out'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: SCSS**

```scss
// SizeSelector.module.scss
.wrap {
  position: relative;
  width: 100%;
}

.trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 40px;
  background: #f7f7f7;
  border: none;
  padding: 0 10px;
  font-size: 11px;
  letter-spacing: 0.5px;
  cursor: pointer;
}

.label { color: black; font-size: 9px; }
.value { color: black; }
.price { margin-left: auto; }
.placeholder { color: #a4a4a4; }

.caret { margin-left: 8px; transition: transform 0.2s; }
.caretOpen { transform: rotate(180deg); }

.panel {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #f0f0f0;
  z-index: 10;
}

.subtitle {
  padding: 10px;
  font-size: 11px;
  letter-spacing: 0.5px;
  background: #f7f7f7;
}

.row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child { border-bottom: none; }
}

.rowDisabled {
  opacity: 0.4;
}

.rowLabel, .rowPrice { font-size: 11px; }

.selectBtn {
  background: #f0f0f0;
  border: none;
  padding: 6px 14px;
  font-size: 11px;
  letter-spacing: 0.5px;
  cursor: pointer;

  &:disabled { cursor: not-allowed; }
}
```

- [ ] **Step 3: Wire into `ProductDetail` for visual check**

```tsx
import SizeSelector from './components/shared/SizeSelector'

// inside the return, after ColorSwatches:
<SizeSelector
  sizes={currentColor.sizes}
  selected={selectedSize}
  currency={view.currency}
  onSelect={setSelectedSize}
/>
```

- [ ] **Step 4: Browser smoke test**

Open PDP. Click size trigger → panel opens above with rows. Click "Select" on a size → panel closes, URL gets `?size=...`. Switch color → if new color lacks the size, the trigger resets to "Please select a size".

- [ ] **Step 5: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add "app/(frontend)/products/[handle]/components/shared/SizeSelector"* "app/(frontend)/products/[handle]/ProductDetail.tsx"
git commit -m "Add SizeSelector component"
```

---

## Task 15: `<ProductInfoPanel>` shared component

**Figma reference:** Expanded panel in node `2024:8302` showing 4 tabs (1. Descripción / 2. Propiedades del material / 3. Recomendaciones de lavado / 4. Uso recomendado) with PortableText content + "Close Information" button.

**Files:**
- Create: `app/(frontend)/products/[handle]/components/shared/ProductInfoPanel.tsx`
- Create: `app/(frontend)/products/[handle]/components/shared/ProductInfoPanel.module.scss`

- [ ] **Step 1: Verify PortableText renderer exists in the project**

```bash
grep -rn "PortableText\|portabletext" components/ app/ 2>/dev/null | head -10
```

If a wrapper component exists (e.g. `components/Common/PortableTextRenderer.tsx`), use it. If not, use `@portabletext/react` directly. The project's `superpowers:portabletext-renderer` skill may be applicable. Document the chosen approach inline in the file.

- [ ] **Step 2: Component**

```tsx
// app/(frontend)/products/[handle]/components/shared/ProductInfoPanel.tsx
'use client'
import {useState, useEffect} from 'react'
import {PortableText} from '@portabletext/react'
import type {ProductEditorial} from '../../_types'
import s from './ProductInfoPanel.module.scss'

interface Props {
  open: boolean
  onClose: () => void
  editorial: ProductEditorial
}

type TabKey = keyof ProductEditorial

const TABS: {key: TabKey; label: string; num: number}[] = [
  {key: 'descripcion', label: 'Descripción', num: 1},
  {key: 'propiedadesMaterial', label: 'Propiedades del material', num: 2},
  {key: 'recomendacionesLavado', label: 'Recomendaciones de lavado', num: 3},
  {key: 'usoRecomendado', label: 'Uso recomendado', num: 4},
]

export default function ProductInfoPanel({open, onClose, editorial}: Props) {
  const availableTabs = TABS.filter((t) => Array.isArray(editorial[t.key]) && (editorial[t.key] as unknown[]).length > 0)
  const [activeTab, setActiveTab] = useState<TabKey>(availableTabs[0]?.key ?? 'descripcion')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || availableTabs.length === 0) return null

  const content = editorial[activeTab] as unknown[] | null

  return (
    <>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={s.panel} role="dialog" aria-modal="true" aria-label="Product information">
        <aside className={s.sidebar}>
          {TABS.map((t) => {
            const isAvailable = availableTabs.some((a) => a.key === t.key)
            const isActive = t.key === activeTab
            return (
              <button
                key={t.key}
                type="button"
                disabled={!isAvailable}
                className={[s.tab, isActive ? s.tabActive : ''].filter(Boolean).join(' ')}
                onClick={() => setActiveTab(t.key)}
              >
                {t.num}. {t.label}
              </button>
            )
          })}
        </aside>
        <div className={s.content}>
          <button type="button" className={s.close} onClick={onClose} aria-label="Close">×</button>
          {content && <PortableText value={content as never} />}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: SCSS**

```scss
// ProductInfoPanel.module.scss
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 50;
}

.panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  top: 80px;
  background: white;
  z-index: 51;
  display: flex;
}

.sidebar {
  width: 280px;
  border-right: 1px solid #f0f0f0;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
}

.tab {
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px 20px;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: #a4a4a4;
  cursor: pointer;

  &:disabled { color: #d4d4d4; cursor: not-allowed; }
}

.tabActive { color: black; font-weight: bold; }

.content {
  flex: 1;
  padding: 30px 40px;
  position: relative;
  overflow-y: auto;
  font-size: 11px;
  line-height: 1.6;
}

.close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .panel {
    top: 0;
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid #f0f0f0;
    padding: 0;
  }
  .tab { white-space: nowrap; padding: 14px 16px; }
}
```

- [ ] **Step 4: Wire into `ProductDetail`**

```tsx
import ProductInfoPanel from './components/shared/ProductInfoPanel'

// in JSX:
<ProductInfoPanel open={isInfoOpen} onClose={() => setIsInfoOpen(false)} editorial={view.editorial} />
```

- [ ] **Step 5: Browser smoke test**

Toggle the test "Toggle info" button. Panel slides in. Tabs work. ESC closes. Backdrop click closes.

- [ ] **Step 6: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add "app/(frontend)/products/[handle]/components/shared/ProductInfoPanel"* "app/(frontend)/products/[handle]/ProductDetail.tsx"
git commit -m "Add ProductInfoPanel with tabbed editorial content"
```

---

## Task 16: `<ImageLightbox>` shared component (dynamic import)

**Figma reference:** Node `11:3360` shows the fullscreen state — single image centered, X close top-right.

**Files:**
- Create: `app/(frontend)/products/[handle]/components/shared/ImageLightbox.tsx`
- Create: `app/(frontend)/products/[handle]/components/shared/ImageLightbox.module.scss`

- [ ] **Step 1: Component**

```tsx
// app/(frontend)/products/[handle]/components/shared/ImageLightbox.tsx
'use client'
import {useEffect, useState} from 'react'
import {LazyImage} from '@/components/Common'
import type {GalleryImage} from '../../_types'
import s from './ImageLightbox.module.scss'

interface Props {
  open: boolean
  images: GalleryImage[]
  index: number
  onClose: () => void
  onIndexChange: (i: number) => void
}

export default function ImageLightbox({open, images, index, onClose, onIndexChange}: Props) {
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    if (!open) {
      setZoomed(false)
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onIndexChange(Math.max(0, index - 1))
      if (e.key === 'ArrowRight') onIndexChange(Math.min(images.length - 1, index + 1))
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, index, images.length, onClose, onIndexChange])

  if (!open || images.length === 0) return null
  const img = images[Math.max(0, Math.min(index, images.length - 1))]

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label="Image viewer">
      <button type="button" className={s.close} onClick={onClose} aria-label="Close">×</button>
      {index > 0 && (
        <button type="button" className={[s.nav, s.navPrev].join(' ')} onClick={() => onIndexChange(index - 1)} aria-label="Previous">‹</button>
      )}
      {index < images.length - 1 && (
        <button type="button" className={[s.nav, s.navNext].join(' ')} onClick={() => onIndexChange(index + 1)} aria-label="Next">›</button>
      )}
      <div
        className={[s.imageWrap, zoomed ? s.imageWrapZoomed : ''].join(' ')}
        onClick={() => setZoomed((v) => !v)}
        style={{touchAction: 'pinch-zoom'}}
      >
        <LazyImage
          src={img.url}
          alt={img.altText ?? ''}
          fill
          sizes="100vw"
          className={s.image}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: SCSS**

```scss
// ImageLightbox.module.scss
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.95);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: white;
  border: none;
  width: 35px;
  height: 35px;
  font-size: 20px;
  cursor: pointer;
  z-index: 1;
}

.nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.8);
  border: none;
  width: 40px;
  height: 60px;
  font-size: 24px;
  cursor: pointer;
}

.navPrev { left: 16px; }
.navNext { right: 16px; }

.imageWrap {
  position: relative;
  width: 90vw;
  height: 90vh;
  cursor: zoom-in;
  transition: transform 0.3s;
  overflow: hidden;
}

.imageWrapZoomed {
  cursor: zoom-out;
  transform: scale(1.8);
}

.image {
  object-fit: contain;
}
```

- [ ] **Step 3: Wire into `ProductDetail` via dynamic import**

In `ProductDetail.tsx`:

```tsx
import dynamic from 'next/dynamic'

const ImageLightbox = dynamic(() => import('./components/shared/ImageLightbox'), {
  ssr: false,
})

// in JSX:
<ImageLightbox
  open={lightbox.open}
  images={currentColor.images}
  index={lightbox.index}
  onClose={() => setLightbox({open: false, index: 0})}
  onIndexChange={(i) => setLightbox({open: true, index: i})}
/>
```

Add a test button:

```tsx
<button onClick={() => setLightbox({open: true, index: 0})}>Open lightbox (test)</button>
```

- [ ] **Step 4: Browser smoke test**

Click "Open lightbox" → fullscreen overlay opens with the first image. Arrow keys navigate. Click image → zoom toggle. ESC closes.

- [ ] **Step 5: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add "app/(frontend)/products/[handle]/components/shared/ImageLightbox"* "app/(frontend)/products/[handle]/ProductDetail.tsx"
git commit -m "Add ImageLightbox with pan/zoom and keyboard navigation"
```

---

## Task 17: `<RelatedMiniCard>` shared component

**Figma reference:** Mini card pattern in node `11:3317` (related products inline) and in mobile `11:3365` (2-col grid). Card has image + title + price range, NO color swatches.

**Files:**
- Create: `app/(frontend)/products/[handle]/components/shared/RelatedMiniCard.tsx`
- Create: `app/(frontend)/products/[handle]/components/shared/RelatedMiniCard.module.scss`

- [ ] **Step 1: Component**

```tsx
// app/(frontend)/products/[handle]/components/shared/RelatedMiniCard.tsx
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import PriceLabel from './PriceLabel'
import type {ProductMiniCard} from '../../_types'
import s from './RelatedMiniCard.module.scss'

interface Props {
  product: ProductMiniCard
  currency: string
}

export default function RelatedMiniCard({product, currency}: Props) {
  return (
    <Link href={`/products/${product.handle}`} className={s.card}>
      <div className={s.image}>
        {product.imageUrl ? (
          <LazyImage src={product.imageUrl} alt={product.imageAlt ?? product.title} fill sizes="(min-width: 768px) 25vw, 50vw" />
        ) : (
          <div className={s.imagePlaceholder} />
        )}
      </div>
      <div className={s.body}>
        <div className={s.title}>{product.title}</div>
        {product.minPrice !== undefined && (
          <div className={s.price}>
            <PriceLabel min={product.minPrice} max={product.maxPrice} currency={currency} />
          </div>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: SCSS**

```scss
// RelatedMiniCard.module.scss
.card {
  display: flex;
  flex-direction: column;
  gap: 9px;
  text-decoration: none;
  color: inherit;
}

.image {
  position: relative;
  aspect-ratio: 268 / 357;
  background: #f0f0f0;
  overflow: hidden;
}

.imagePlaceholder {
  background: #f0f0f0;
  width: 100%;
  height: 100%;
}

.body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title {
  font-size: 11px;
  letter-spacing: 0.5px;
}

.price {
  font-size: 11px;
}
```

- [ ] **Step 3: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add "app/(frontend)/products/[handle]/components/shared/RelatedMiniCard"*
git commit -m "Add RelatedMiniCard for PDP related products"
```

---

## Task 18: `<DesktopToolbar>` component

**Figma reference:** Fixed bottom toolbar in node `11:3317`. Four columns: Title/Price block | Size dropdown + Color swatches (stacked) | Product Information block | CTA + Favorite button.

**Files:**
- Create: `app/(frontend)/products/[handle]/components/Desktop/DesktopToolbar.tsx`
- Create: `app/(frontend)/products/[handle]/components/Desktop/DesktopToolbar.module.scss`

- [ ] **Step 1: Component**

```tsx
// app/(frontend)/products/[handle]/components/Desktop/DesktopToolbar.tsx
'use client'
import PriceLabel from '../shared/PriceLabel'
import ColorSwatches from '../shared/ColorSwatches'
import SizeSelector from '../shared/SizeSelector'
import type {ProductView, ProductColor} from '../../_types'
import s from './DesktopToolbar.module.scss'

interface Props {
  view: ProductView
  currentColor: ProductColor
  selectedColor: string
  selectedSize: string | undefined
  onSelectColor: (slug: string) => void
  onSelectSize: (label: string) => void
  onToggleInfo: () => void
  isInfoOpen: boolean
  onAddToCart: () => void
}

export default function DesktopToolbar({
  view, currentColor, selectedColor, selectedSize,
  onSelectColor, onSelectSize, onToggleInfo, isInfoOpen, onAddToCart,
}: Props) {
  const canAddToCart = !!selectedSize && currentColor.sizes.find((s) => s.label === selectedSize)?.availableForSale
  return (
    <div className={s.toolbar}>
      <div className={s.titleBlock}>
        <div className={s.title}>{view.title}</div>
        <div className={s.priceBg}>
          <PriceLabel min={view.minPrice} max={view.maxPrice} currency={view.currency} />
        </div>
      </div>

      <div className={s.variantBlock}>
        <SizeSelector
          sizes={currentColor.sizes}
          selected={selectedSize}
          currency={view.currency}
          onSelect={onSelectSize}
        />
        <ColorSwatches colors={view.colors} selected={selectedColor} onSelect={onSelectColor} />
      </div>

      <button type="button" className={s.infoBlock} onClick={onToggleInfo}>
        <div className={s.infoTitle}>{isInfoOpen ? 'Close Information' : 'Product Information'}</div>
        <div className={s.infoMeta}>
          Estimated delivery : 1-3 November<br />
          Complimentary gift wrapping<br />
          30-day returns
        </div>
      </button>

      <button
        type="button"
        className={[s.cta, canAddToCart ? s.ctaActive : s.ctaInactive].join(' ')}
        onClick={onAddToCart}
        disabled={!canAddToCart}
      >
        {canAddToCart ? 'Add to Cart' : 'Please Select Size'}
      </button>

      <button type="button" className={s.favorite} aria-label="Add to favorites" aria-disabled="true">
        ♡
      </button>
    </div>
  )
}
```

- [ ] **Step 2: SCSS**

```scss
// DesktopToolbar.module.scss
.toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  display: flex;
  align-items: stretch;
  border-top: 1px solid #f0f0f0;
  z-index: 20;
  height: 80px;
}

.titleBlock {
  display: flex;
  flex-direction: column;
  width: 306px;
  flex-shrink: 0;
}

.title, .priceBg {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 10px;
  font-size: 11px;
  letter-spacing: 0.5px;
}
.title { background: white; }
.priceBg { background: #f0f0f0; }

.variantBlock {
  flex: 1 0 0;
  display: flex;
  flex-direction: column;
}

.infoBlock {
  width: 184px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
  border: none;
  cursor: pointer;
}

.infoTitle {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 10px;
  font-size: 11px;
  letter-spacing: 0.5px;
  text-align: left;
  background: white;
}

.infoMeta {
  flex: 1;
  padding: 10px;
  background: #f0f0f0;
  font-size: 9px;
  line-height: 11px;
  text-align: left;
}

.cta {
  width: 296px;
  height: 80px;
  border: none;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: white;
  cursor: pointer;
}

.ctaActive { background: black; }
.ctaInactive { background: #a4a4a4; cursor: not-allowed; }

.favorite {
  width: 25px;
  background: black;
  color: white;
  border: none;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 10px 0;
}
```

- [ ] **Step 3: Typecheck + lint**

```bash
npm run typecheck && npm run lint
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(frontend)/products/[handle]/components/Desktop/DesktopToolbar"*
git commit -m "Add DesktopToolbar with variant selectors and CTA"
```

---

## Task 19: `<GalleryHorizontal>` component

**Figma reference:** The 4028px-wide carousel in node `11:3317`. Each product image is ~676px wide with a small "+" button overlay at center-right for zoom. Related products appear inline at the end (mini cards).

**Files:**
- Create: `app/(frontend)/products/[handle]/components/Desktop/GalleryHorizontal.tsx`
- Create: `app/(frontend)/products/[handle]/components/Desktop/GalleryHorizontal.module.scss`

- [ ] **Step 1: Component**

```tsx
// app/(frontend)/products/[handle]/components/Desktop/GalleryHorizontal.tsx
'use client'
import {LazyImage} from '@/components/Common'
import RelatedMiniCard from '../shared/RelatedMiniCard'
import type {GalleryImage, ProductMiniCard} from '../../_types'
import s from './GalleryHorizontal.module.scss'

interface Props {
  images: GalleryImage[]
  related: ProductMiniCard[]
  currency: string
  onZoom: (index: number) => void
}

export default function GalleryHorizontal({images, related, currency, onZoom}: Props) {
  return (
    <div className={s.scroller}>
      {images.map((img, i) => (
        <div key={i} className={s.imageTile}>
          <LazyImage
            src={img.url}
            alt={img.altText ?? ''}
            fill
            sizes="676px"
            priority={i === 0}
          />
          <button type="button" className={s.zoomBtn} onClick={() => onZoom(i)} aria-label="Zoom image">
            +
          </button>
        </div>
      ))}
      {related.length > 0 && (
        <>
          <div className={s.relatedHeading}>Related products</div>
          {related.map((p) => (
            <div key={p.handle} className={s.relatedTile}>
              <RelatedMiniCard product={p} currency={currency} />
            </div>
          ))}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: SCSS**

```scss
// GalleryHorizontal.module.scss
.scroller {
  display: flex;
  align-items: stretch;
  gap: 1px;
  height: calc(100vh - 160px);  // header + toolbar approx
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
}

.imageTile {
  position: relative;
  width: 676px;
  flex-shrink: 0;
  scroll-snap-align: start;
}

.zoomBtn {
  position: absolute;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  background: black;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.relatedHeading {
  display: flex;
  align-items: center;
  font-size: 18px;
  padding: 0 40px;
  flex-shrink: 0;
  height: 100%;
  font-family: 'Helvetica Neue', sans-serif;
}

.relatedTile {
  width: 268px;
  flex-shrink: 0;
  align-self: center;
}
```

- [ ] **Step 3: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add "app/(frontend)/products/[handle]/components/Desktop/GalleryHorizontal"*
git commit -m "Add GalleryHorizontal for desktop PDP"
```

---

## Task 20: `<DesktopLayout>` assembly

**Files:**
- Create: `app/(frontend)/products/[handle]/components/Desktop/DesktopLayout.tsx`
- Create: `app/(frontend)/products/[handle]/components/Desktop/DesktopLayout.module.scss`

- [ ] **Step 1: Component**

```tsx
// app/(frontend)/products/[handle]/components/Desktop/DesktopLayout.tsx
'use client'
import GalleryHorizontal from './GalleryHorizontal'
import DesktopToolbar from './DesktopToolbar'
import type {ProductView, ProductColor} from '../../_types'
import s from './DesktopLayout.module.scss'

interface Props {
  view: ProductView
  currentColor: ProductColor
  selectedColor: string
  selectedSize: string | undefined
  onSelectColor: (slug: string) => void
  onSelectSize: (label: string) => void
  onToggleInfo: () => void
  isInfoOpen: boolean
  onAddToCart: () => void
  onZoom: (index: number) => void
}

export default function DesktopLayout(props: Props) {
  return (
    <div className={s.layout}>
      <GalleryHorizontal
        images={props.currentColor.images}
        related={props.view.related}
        currency={props.view.currency}
        onZoom={props.onZoom}
      />
      <DesktopToolbar {...props} />
    </div>
  )
}
```

- [ ] **Step 2: SCSS (hide on mobile)**

```scss
// DesktopLayout.module.scss
.layout {
  display: none;

  @media (min-width: 768px) {
    display: block;
  }
}
```

- [ ] **Step 3: Wire into `ProductDetail`**

Replace the test buttons / placeholder UI in `ProductDetail.tsx` with `<DesktopLayout>`:

```tsx
import DesktopLayout from './components/Desktop/DesktopLayout'

const currentColor = view.colors.find((c) => c.slug === selectedColor) ?? view.colors[0]

function addToCart() {
  // placeholder — will be implemented in Task 25
  // eslint-disable-next-line no-console
  console.log('add to cart', {color: selectedColor, size: selectedSize})
}

return (
  <>
    <DesktopLayout
      view={view}
      currentColor={currentColor}
      selectedColor={selectedColor}
      selectedSize={selectedSize}
      onSelectColor={changeColor}
      onSelectSize={setSelectedSize}
      onToggleInfo={() => setIsInfoOpen((v) => !v)}
      isInfoOpen={isInfoOpen}
      onAddToCart={addToCart}
      onZoom={(i) => setLightbox({open: true, index: i})}
    />
    <ProductInfoPanel open={isInfoOpen} onClose={() => setIsInfoOpen(false)} editorial={view.editorial} />
    <ImageLightbox
      open={lightbox.open}
      images={currentColor.images}
      index={lightbox.index}
      onClose={() => setLightbox({open: false, index: 0})}
      onIndexChange={(i) => setLightbox({open: true, index: i})}
    />
  </>
)
```

Remove any leftover test buttons and `<pre>` debug from previous tasks.

- [ ] **Step 4: Browser smoke test (desktop viewport)**

Open `/products/funda-nordica-algodon-organico-blanc-de-blanc` on desktop. Verify:
- Horizontal scroll gallery shows images of the default color.
- Toolbar fixed at bottom shows title, price, size selector, color swatches, info block, CTA.
- Color change swaps gallery + updates URL.
- Size open + select works.
- "+" zoom button opens lightbox at correct image.
- "Product Information" toggle opens panel.

- [ ] **Step 5: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add "app/(frontend)/products/[handle]/components/Desktop/DesktopLayout"* "app/(frontend)/products/[handle]/ProductDetail.tsx"
git commit -m "Wire DesktopLayout into PDP"
```

---

## Task 21: `<GallerySwiper>` mobile component

**Figma reference:** Mobile gallery in node `11:3567`. Single image full-width with prev/next chevron arrows and a "+" zoom button at bottom-right.

**Files:**
- Create: `app/(frontend)/products/[handle]/components/Mobile/GallerySwiper.tsx`
- Create: `app/(frontend)/products/[handle]/components/Mobile/GallerySwiper.module.scss`

- [ ] **Step 1: Component (touch swipe via touchstart/touchend, no library)**

```tsx
// app/(frontend)/products/[handle]/components/Mobile/GallerySwiper.tsx
'use client'
import {useRef, useState} from 'react'
import {LazyImage} from '@/components/Common'
import type {GalleryImage} from '../../_types'
import s from './GallerySwiper.module.scss'

interface Props {
  images: GalleryImage[]
  onZoom: (index: number) => void
}

const SWIPE_THRESHOLD = 50

export default function GallerySwiper({images, onZoom}: Props) {
  const [index, setIndex] = useState(0)
  const startX = useRef<number | null>(null)

  if (images.length === 0) return null

  function go(delta: number) {
    setIndex((i) => Math.max(0, Math.min(images.length - 1, i + delta)))
  }

  return (
    <div
      className={s.swiper}
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (startX.current === null) return
        const dx = e.changedTouches[0].clientX - startX.current
        if (Math.abs(dx) > SWIPE_THRESHOLD) go(dx > 0 ? -1 : 1)
        startX.current = null
      }}
    >
      <LazyImage
        src={images[index].url}
        alt={images[index].altText ?? ''}
        fill
        sizes="100vw"
        priority={index === 0}
      />
      {index > 0 && (
        <button type="button" className={[s.nav, s.navPrev].join(' ')} onClick={() => go(-1)} aria-label="Previous">‹</button>
      )}
      {index < images.length - 1 && (
        <button type="button" className={[s.nav, s.navNext].join(' ')} onClick={() => go(1)} aria-label="Next">›</button>
      )}
      <button type="button" className={s.zoomBtn} onClick={() => onZoom(index)} aria-label="Zoom">+</button>
    </div>
  )
}
```

- [ ] **Step 2: SCSS**

```scss
// GallerySwiper.module.scss
.swiper {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: #f0f0f0;
  overflow: hidden;
}

.nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.8);
  border: none;
  width: 30px;
  height: 50px;
  font-size: 22px;
  cursor: pointer;
}

.navPrev { left: 0; }
.navNext { right: 0; }

.zoomBtn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 25px;
  height: 25px;
  background: black;
  color: white;
  border: none;
  cursor: pointer;
}
```

- [ ] **Step 3: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add "app/(frontend)/products/[handle]/components/Mobile/GallerySwiper"*
git commit -m "Add GallerySwiper for mobile PDP"
```

---

## Task 22: `<MobileToolbar>` component

**Figma reference:** Node `11:3365` inline toolbar block. Stacked rows: size dropdown trigger → color swatches row → "Product Information" button. Each row collapses/expands as needed.

**Files:**
- Create: `app/(frontend)/products/[handle]/components/Mobile/MobileToolbar.tsx`
- Create: `app/(frontend)/products/[handle]/components/Mobile/MobileToolbar.module.scss`

- [ ] **Step 1: Component**

```tsx
// app/(frontend)/products/[handle]/components/Mobile/MobileToolbar.tsx
'use client'
import PriceLabel from '../shared/PriceLabel'
import ColorSwatches from '../shared/ColorSwatches'
import SizeSelector from '../shared/SizeSelector'
import type {ProductView, ProductColor} from '../../_types'
import s from './MobileToolbar.module.scss'

interface Props {
  view: ProductView
  currentColor: ProductColor
  selectedColor: string
  selectedSize: string | undefined
  onSelectColor: (slug: string) => void
  onSelectSize: (label: string) => void
  onToggleInfo: () => void
  isInfoOpen: boolean
}

export default function MobileToolbar({
  view, currentColor, selectedColor, selectedSize,
  onSelectColor, onSelectSize, onToggleInfo, isInfoOpen,
}: Props) {
  return (
    <div className={s.wrap}>
      <div className={s.titleBlock}>
        <div className={s.title}>{view.title}</div>
        <div className={s.price}>
          <PriceLabel min={view.minPrice} max={view.maxPrice} currency={view.currency} />
        </div>
        <div className={s.delivery}>
          Estimated delivery : 1-3 November<br />
          Complimentary gift wrapping<br />
          30- day returns
        </div>
      </div>

      <div className={s.section}>
        <SizeSelector
          sizes={currentColor.sizes}
          selected={selectedSize}
          currency={view.currency}
          onSelect={onSelectSize}
        />
      </div>

      <div className={s.section}>
        <div className={s.label}>Please select a color:</div>
        <ColorSwatches colors={view.colors} selected={selectedColor} onSelect={onSelectColor} />
      </div>

      <button type="button" className={s.infoToggle} onClick={onToggleInfo}>
        <span>{isInfoOpen ? 'Close Information' : 'Product Information'}</span>
        <span>{isInfoOpen ? '×' : '▾'}</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: SCSS**

```scss
// MobileToolbar.module.scss
.wrap {
  padding: 0 10px;
}

.titleBlock {
  padding: 12px 0;
}

.title {
  font-size: 13px;
  margin-bottom: 4px;
}

.price {
  font-size: 12px;
  margin-bottom: 12px;
}

.delivery {
  font-size: 9px;
  line-height: 11px;
  background: #f0f0f0;
  padding: 10px;
}

.section {
  padding: 10px 0;
}

.label {
  font-size: 11px;
  margin-bottom: 8px;
}

.infoToggle {
  display: flex;
  justify-content: space-between;
  width: 100%;
  background: white;
  border: none;
  border-top: 1px solid #f0f0f0;
  padding: 14px 0;
  font-size: 11px;
  cursor: pointer;
}
```

- [ ] **Step 3: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add "app/(frontend)/products/[handle]/components/Mobile/MobileToolbar"*
git commit -m "Add MobileToolbar with inline variant selectors"
```

---

## Task 23: `<RelatedGrid>` mobile component

**Figma reference:** Node `11:3365`. 2-col grid below the inline toolbar.

**Files:**
- Create: `app/(frontend)/products/[handle]/components/Mobile/RelatedGrid.tsx`
- Create: `app/(frontend)/products/[handle]/components/Mobile/RelatedGrid.module.scss`

- [ ] **Step 1: Component (server-friendly since no interactivity)**

```tsx
// app/(frontend)/products/[handle]/components/Mobile/RelatedGrid.tsx
import RelatedMiniCard from '../shared/RelatedMiniCard'
import type {ProductMiniCard} from '../../_types'
import s from './RelatedGrid.module.scss'

interface Props {
  products: ProductMiniCard[]
  currency: string
}

export default function RelatedGrid({products, currency}: Props) {
  if (products.length === 0) return null
  return (
    <section className={s.section}>
      <h3 className={s.heading}>Related Products</h3>
      <div className={s.grid}>
        {products.map((p) => (
          <RelatedMiniCard key={p.handle} product={p} currency={currency} />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: SCSS**

```scss
// RelatedGrid.module.scss
.section {
  padding: 20px 10px;
}

.heading {
  font-size: 13px;
  margin-bottom: 12px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(frontend)/products/[handle]/components/Mobile/RelatedGrid"*
git commit -m "Add RelatedGrid for mobile PDP"
```

---

## Task 24: `<StickyCTA>` mobile component

**Figma reference:** Node `11:3567` bottom-fixed CTA "Please Select Size".

**Files:**
- Create: `app/(frontend)/products/[handle]/components/Mobile/StickyCTA.tsx`
- Create: `app/(frontend)/products/[handle]/components/Mobile/StickyCTA.module.scss`

- [ ] **Step 1: Component**

```tsx
// app/(frontend)/products/[handle]/components/Mobile/StickyCTA.tsx
'use client'
import s from './StickyCTA.module.scss'

interface Props {
  canAddToCart: boolean
  onAddToCart: () => void
}

export default function StickyCTA({canAddToCart, onAddToCart}: Props) {
  return (
    <button
      type="button"
      className={[s.cta, canAddToCart ? s.ctaActive : s.ctaInactive].join(' ')}
      onClick={onAddToCart}
      disabled={!canAddToCart}
    >
      {canAddToCart ? 'Add to Cart' : 'Please Select Size'}
    </button>
  )
}
```

- [ ] **Step 2: SCSS**

```scss
// StickyCTA.module.scss
.cta {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  border: none;
  color: white;
  font-size: 12px;
  letter-spacing: 0.5px;
  z-index: 20;
  cursor: pointer;
}

.ctaActive { background: black; }
.ctaInactive { background: #a4a4a4; cursor: not-allowed; }
```

- [ ] **Step 3: Commit**

```bash
git add "app/(frontend)/products/[handle]/components/Mobile/StickyCTA"*
git commit -m "Add StickyCTA for mobile PDP"
```

---

## Task 25: `<MobileLayout>` assembly + wire into `ProductDetail`

**Files:**
- Create: `app/(frontend)/products/[handle]/components/Mobile/MobileLayout.tsx`
- Create: `app/(frontend)/products/[handle]/components/Mobile/MobileLayout.module.scss`
- Modify: `app/(frontend)/products/[handle]/ProductDetail.tsx`

- [ ] **Step 1: MobileLayout component**

```tsx
// app/(frontend)/products/[handle]/components/Mobile/MobileLayout.tsx
'use client'
import GallerySwiper from './GallerySwiper'
import MobileToolbar from './MobileToolbar'
import RelatedGrid from './RelatedGrid'
import StickyCTA from './StickyCTA'
import type {ProductView, ProductColor} from '../../_types'
import s from './MobileLayout.module.scss'

interface Props {
  view: ProductView
  currentColor: ProductColor
  selectedColor: string
  selectedSize: string | undefined
  onSelectColor: (slug: string) => void
  onSelectSize: (label: string) => void
  onToggleInfo: () => void
  isInfoOpen: boolean
  onAddToCart: () => void
  onZoom: (index: number) => void
}

export default function MobileLayout(props: Props) {
  const canAddToCart =
    !!props.selectedSize &&
    !!props.currentColor.sizes.find((s) => s.label === props.selectedSize)?.availableForSale
  return (
    <div className={s.layout}>
      <GallerySwiper images={props.currentColor.images} onZoom={props.onZoom} />
      <MobileToolbar {...props} />
      <RelatedGrid products={props.view.related} currency={props.view.currency} />
      <StickyCTA canAddToCart={canAddToCart} onAddToCart={props.onAddToCart} />
    </div>
  )
}
```

- [ ] **Step 2: SCSS (show only below md)**

```scss
// MobileLayout.module.scss
.layout {
  padding-bottom: 60px;  // space for StickyCTA

  @media (min-width: 768px) {
    display: none;
  }
}
```

- [ ] **Step 3: Add `<MobileLayout>` to `ProductDetail`**

```tsx
import MobileLayout from './components/Mobile/MobileLayout'

// in JSX, alongside DesktopLayout:
<MobileLayout {/* same props as DesktopLayout */} />
```

- [ ] **Step 4: Browser smoke test (mobile viewport via DevTools)**

Set viewport to 375x812. Verify:
- Single image with arrows visible. Swipe works.
- Title + price + delivery info inline below.
- Size dropdown opens inline.
- Color swatches row below.
- "Product Information" toggle opens panel (fullscreen on mobile).
- Related grid 2-col below.
- Sticky CTA at bottom.

- [ ] **Step 5: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add "app/(frontend)/products/[handle]/components/Mobile/MobileLayout"* "app/(frontend)/products/[handle]/ProductDetail.tsx"
git commit -m "Wire MobileLayout into PDP"
```

---

## Task 26: Cart drawer integration (or fallback)

**Files:**
- Modify: `app/(frontend)/products/[handle]/ProductDetail.tsx`
- (Possibly modify) `context/shopContext.js`

- [ ] **Step 1: Discovery — check if cart drawer exists**

```bash
grep -rn "drawer\|Drawer\|isCartOpen\|setCartOpen" context/ components/Layout/ 2>/dev/null | head -20
```

Document findings:
- If a cart drawer exists with an open/close API → use it.
- If not → fallback to redirect to `/cart`.

- [ ] **Step 2: Wire `addToCart`**

Replace the placeholder `addToCart` in `ProductDetail.tsx` with the real implementation. Import the shopContext hook:

```tsx
import {useShop} from '@/context/shopContext'
import {findVariant} from '@/lib/product/findEquivalentSize'
import {useRouter} from 'next/navigation'

// in component:
const {addToCart, openCart} = useShop()  // adjust per actual API
const router = useRouter()

async function handleAddToCart() {
  const variant = findVariant(view, selectedColor, selectedSize)
  if (!variant) return
  await addToCart(
    {store: {gid: variant.variantId}},
    1,
    view.id,
    view.title,
    currentColor.images[0]?.url,
  )
  if (typeof openCart === 'function') {
    openCart()
  } else {
    router.push('/cart')
  }
}
```

> **Adapt the API call shape to whatever `context/shopContext.js` exposes.** Check the file before writing the call.

- [ ] **Step 3: Browser smoke test**

Select color + size, click Add to Cart. Expected:
- Cart count in header updates.
- Drawer opens OR redirects to `/cart`.

- [ ] **Step 4: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add "app/(frontend)/products/[handle]/ProductDetail.tsx"
git commit -m "Wire PDP add-to-cart via shopContext"
```

---

## Task 27: SEO `generateMetadata`

**Files:**
- Modify: `app/(frontend)/products/[handle]/page.tsx`

- [ ] **Step 1: Add `generateMetadata`**

In `page.tsx`, above the default export:

```tsx
import type {Metadata} from 'next'
import {BASE_URL, siteTitle} from '@/utils/seoHelper'

function extractPlainText(blocks: unknown[] | null): string {
  if (!Array.isArray(blocks)) return ''
  const out: string[] = []
  for (const b of blocks) {
    if (b && typeof b === 'object' && 'children' in b) {
      const children = (b as {children: unknown[]}).children
      for (const c of children) {
        if (c && typeof c === 'object' && 'text' in c) {
          out.push((c as {text: string}).text)
        }
      }
    }
  }
  return out.join(' ').trim()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{handle: string}>
}): Promise<Metadata> {
  const {handle} = await params
  const [sanityDoc, shopifyProduct] = await Promise.all([
    getSanityProduct(handle),
    getProductDetail(handle),
  ])
  if (!shopifyProduct) return {title: `Product not found | ${siteTitle}`}

  const desc =
    extractPlainText(sanityDoc?.descripcion ?? null).slice(0, 160) ||
    shopifyProduct.seo?.description ||
    shopifyProduct.title

  return {
    title: `${shopifyProduct.title} | ${siteTitle}`,
    description: desc,
    alternates: {canonical: `${BASE_URL}/products/${handle}`},
    openGraph: {
      title: shopifyProduct.title,
      description: desc,
      url: `${BASE_URL}/products/${handle}`,
      images: shopifyProduct.featuredImage?.url
        ? [{url: shopifyProduct.featuredImage.url, alt: shopifyProduct.featuredImage.altText ?? shopifyProduct.title}]
        : undefined,
    },
  }
}
```

- [ ] **Step 2: Confirm exports of `BASE_URL` and `siteTitle`**

```bash
grep -n "BASE_URL\|siteTitle" utils/seoHelper.ts
```

Adjust import paths or names if different.

- [ ] **Step 3: Verify in browser**

Reload `/products/funda-nordica-algodon-organico-blanc-de-blanc`. Inspect `<head>` — title and meta description should reflect the product.

- [ ] **Step 4: Typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add "app/(frontend)/products/[handle]/page.tsx"
git commit -m "Add PDP metadata (title, description, canonical, OG)"
```

---

## Task 28: `loading.tsx` skeleton

**Files:**
- Create: `app/(frontend)/products/[handle]/loading.tsx`

- [ ] **Step 1: Component**

```tsx
// app/(frontend)/products/[handle]/loading.tsx
export default function Loading() {
  return (
    <div style={{padding: 40, textAlign: 'center', fontSize: 11, letterSpacing: 0.5, color: '#a4a4a4'}}>
      Loading…
    </div>
  )
}
```

> A more elaborate skeleton (gallery placeholder + toolbar placeholder) can be added later. This minimal version satisfies the Next.js streaming contract.

- [ ] **Step 2: Commit**

```bash
git add "app/(frontend)/products/[handle]/loading.tsx"
git commit -m "Add PDP loading state"
```

---

## Task 29: `error.tsx` error boundary

**Files:**
- Create: `app/(frontend)/products/[handle]/error.tsx`

- [ ] **Step 1: Component**

```tsx
// app/(frontend)/products/[handle]/error.tsx
'use client'

export default function ProductError({reset}: {reset: () => void}) {
  return (
    <div style={{padding: 40, textAlign: 'center'}}>
      <h2 style={{fontSize: 13, marginBottom: 10}}>Something went wrong</h2>
      <p style={{fontSize: 11, marginBottom: 20}}>
        We could not load this product. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        style={{padding: '10px 20px', background: 'black', color: 'white', border: 'none', cursor: 'pointer', fontSize: 11}}
      >
        Retry
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(frontend)/products/[handle]/error.tsx"
git commit -m "Add PDP error boundary"
```

---

## Task 30: Edge case verification

**No files to create.** This is a verification pass.

- [ ] **Step 1: Test handle not in Shopify**

Navigate to `/products/this-handle-does-not-exist`. Expected: Next.js 404 page.

- [ ] **Step 2: Test product in Shopify with no Sanity doc**

Identify a Shopify product without a corresponding Sanity document (or temporarily unpublish one). Navigate to it. Expected:
- Page renders.
- `<ProductInfoPanel>` button hidden (since `hasEditorial` is false).

- [ ] **Step 3: Test product without Color option**

Identify or create a Shopify product without a Color option. Navigate to it. Expected:
- Color swatches hidden (or only 1 "default" swatch).
- Gallery uses `product.featuredImage`.

- [ ] **Step 4: Test sold-out variant**

Identify a product where the default color has at least one sold-out size. Open the size selector → the sold-out row is dimmed and the "Select" button is disabled.

- [ ] **Step 5: Test URL with invalid color**

Navigate to `/products/funda-nordica-algodon-organico-blanc-de-blanc?color=fake-color`. Expected: fallback to `defaultColorSlug`, URL gets cleaned by client.

- [ ] **Step 6: Test URL with invalid size**

Navigate to `?color=cardon-seed&size=999X999`. Expected: size ignored, CTA "Please Select Size".

- [ ] **Step 7: Test no related products**

Identify a product whose Sanity doc has an empty `relatedProducts` array (or no doc). Verify the "Related products" section is hidden on both desktop and mobile.

- [ ] **Step 8: Test color change resets size when incompatible**

Pick color A, select size 240X220. Switch to color B which doesn't offer 240X220. Expected: size resets, CTA returns to "Please Select Size".

- [ ] **Step 9: Final typecheck + lint + build**

```bash
npm run typecheck && npm run lint && npm run build
```

Expected: all clean. Build succeeds.

- [ ] **Step 10: No commit (verification only)**

---

## Final structure check

After all tasks, the PDP directory should look like:

```
app/(frontend)/products/[handle]/
├── _types.ts
├── ProductDetail.tsx
├── error.tsx
├── loading.tsx
├── page.tsx
└── components/
    ├── Desktop/
    │   ├── DesktopLayout.tsx + .module.scss
    │   ├── DesktopToolbar.tsx + .module.scss
    │   └── GalleryHorizontal.tsx + .module.scss
    ├── Mobile/
    │   ├── GallerySwiper.tsx + .module.scss
    │   ├── MobileLayout.tsx + .module.scss
    │   ├── MobileToolbar.tsx + .module.scss
    │   ├── RelatedGrid.tsx + .module.scss
    │   └── StickyCTA.tsx + .module.scss
    └── shared/
        ├── Breadcrumb.tsx + .module.scss
        ├── ColorSwatches.tsx + .module.scss
        ├── ImageLightbox.tsx + .module.scss
        ├── PriceLabel.tsx
        ├── ProductInfoPanel.tsx + .module.scss
        ├── RelatedMiniCard.tsx + .module.scss
        └── SizeSelector.tsx + .module.scss

lib/product/
├── buildProductView.ts
├── findEquivalentSize.ts
└── resolveInitialState.ts

sanity/queries/queries/
└── product.ts (new)

(modified)
lib/shopify.js
sanity/schemas/documents/product.tsx
```

After execution, polish styling against Figma node IDs using the `superpowers:pixel-perfect` / `figma-maquetador` skill. The structure and behavior should be complete; visual fidelity is a follow-up pass.
