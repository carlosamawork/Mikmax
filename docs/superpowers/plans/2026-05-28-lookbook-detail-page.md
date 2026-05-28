# Lookbook Detail Page (`/looks/[slug]`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the look detail page at `/looks/[slug]` — editorial gallery + per-piece size selector + bundle add-to-cart with a Shopify discount code, summing live Shopify variant prices.

**Architecture:** Mirrors the existing PDP (`app/(frontend)/products/[handle]`). A Sanity `look` doc supplies editorial content + components (each a `productVariant` ref with `availableSizes`); for each component we fetch the parent product live from Shopify (`getProductDetail`) to resolve the sibling size variants (price/GID/stock). A server-side `buildLookView` merges both into a `LookView`; a client `LookDetail` holds per-component size state, computes the summed (and discounted-for-display) total, and adds all pieces as individual cart lines + applies the look's discount code.

**Tech Stack:** Next.js 15 App Router (Server + Client Components), Sanity v3 (GROQ), Shopify Storefront API (graphql-request), SCSS modules, TypeScript strict.

> **No unit-test framework in this repo.** Verification is `npm run typecheck`, `npm run lint`, `npm run build`, and manual browser checks. Do NOT introduce Jest/Vitest — it's out of scope.

> **Pixel-perfect styling:** all `.module.scss` for the new visual components must be extracted from Figma with the **`figma-maquetador`** skill using the node IDs below. JSX structure, props, and state logic are fully specified here; exact spacing/typography/colors come from Figma.
> File: `u92pryF41Lr42YVpq1Qxsn` · Desktop sin selector `11-4591` · Desktop con selector `31-13533` · Mobile sin selector `11-4411` · Mobile con selector `11-4179`.

> **Skills to use during implementation:** `sanity-schema-builder` (Task 1), `figma-maquetador` (Tasks 8–11), `shopify-storefront` (Tasks 5–6).

---

## File Structure

**Create:**
- `sanity/queries/queries/look.ts` — `getLook`, `getLookSlugs`, `getLookSEO`; exports `SanityLookDoc`.
- `types/look.ts` — frontend view types (`LookView`, `LookComponentView`, `LookSizeOption`).
- `lib/look/buildLookView.ts` — merges Sanity look + Shopify product details → `LookView`.
- `app/(frontend)/looks/[slug]/page.tsx` — route + `generateStaticParams` + `generateMetadata`.
- `app/(frontend)/looks/[slug]/loading.tsx`
- `app/(frontend)/looks/[slug]/error.tsx`
- `components/Look/LookDetail.tsx` (+ `.module.scss`) — client orchestrator.
- `components/Look/LookSelector.tsx` (+ `.module.scss`) — per-piece size rows (bar/panel desktop, accordion mobile).
- `components/Look/LookPrice.tsx` (+ `.module.scss`) — range → discounted total.
- `components/Look/index.ts` — barrel export.

**Modify:**
- `sanity/schemas/documents/look.tsx` — pricing/discount fields + `relatedProducts`.
- `lib/shopify.js` — `cartLinesAddMultiple`, multi-line `cartCreateMultiple`, `cartDiscountCodesUpdate`.
- `context/shopContext.js` — `addLookToCart`.
- `app/api/revalidate/route.ts` — register `look` / `look:{slug}` tags.
- `CLAUDE.md` — register the new revalidation tags.

**Reuse (no change, read their props):**
- `components/Product/Desktop/GalleryHorizontal.tsx`, `components/Product/Mobile/GallerySwiper.tsx`, `components/Product/shared/ImageLightbox.tsx`
- `components/Product/Mobile/RelatedGrid.tsx`, `components/Product/shared/RelatedMiniCard.tsx`, `components/Product/shared/ProductInfoPanel.tsx`
- `components/Common` (`LazyImage`)

---

## Task 1: Update `look` schema (pricing model + related products)

**Files:**
- Modify: `sanity/schemas/documents/look.tsx`

Use the **`sanity-schema-builder`** skill. The new pricing model: total = sum of component variant prices (live from Shopify); optional display discount via `discountStrategy`/`discountValue`; checkout discount via a Shopify `discountCode`.

- [ ] **Step 1: Edit the schema fields**

In `sanity/schemas/documents/look.tsx`:

1. **Remove** the `priceFixed` field entirely.
2. **Remove** the `priceCompareAt` field entirely.
3. **Replace** the `discountStrategy` field with:

```ts
defineField({
  name: 'discountStrategy',
  title: 'Estrategia de descuento',
  type: 'string',
  options: {
    list: [
      {title: 'Sin descuento', value: 'none'},
      {title: 'Resta cantidad fija (€) a la suma', value: 'sumMinusFixed'},
      {title: 'Resta % a la suma', value: 'sumMinusPercent'},
    ],
    layout: 'radio',
  },
  initialValue: 'none',
  validation: (Rule) => Rule.required(),
  group: 'pricing',
}),
```

4. Keep `discountValue` but update its description:

```ts
defineField({
  name: 'discountValue',
  title: 'Valor de descuento',
  description:
    'Solo para mostrar en la página. "sumMinusFixed": € a restar. "sumMinusPercent": número 0-100. El cobro real lo impone el código de descuento de Shopify, manténlos alineados.',
  type: 'number',
  validation: (Rule) => Rule.min(0),
  group: 'pricing',
}),
```

5. **Add** after `discountValue`:

```ts
defineField({
  name: 'discountCode',
  title: 'Código de descuento de Shopify',
  description:
    'Código que se aplica al carrito al añadir el look (cartDiscountCodesUpdate). Debe coincidir con discountStrategy/discountValue.',
  type: 'string',
  group: 'pricing',
}),
```

6. **Add** a `relatedProducts` field to the `editorial` group (after `components`):

```ts
defineField({
  name: 'relatedProducts',
  title: 'Productos relacionados',
  type: 'array',
  of: [{type: 'reference', to: [{type: 'product'}]}],
  group: 'editorial',
}),
```

7. Update the `prepare` in `preview` to not reference `priceFixed`:

```ts
preview: {
  select: {title: 'title', media: 'editorialImages.0.image'},
  prepare({title, media}) {
    return {title, subtitle: 'Look Book', media}
  },
},
```

8. Remove the `priceDesc` ordering (it referenced `priceFixed`); keep `titleAsc`.

- [ ] **Step 2: Migrate existing look docs (Studio)**

For each existing `look` document in the Studio: set `discountStrategy` to `none` (or the intended value) so the required validation passes; the now-removed `priceFixed`/`priceCompareAt` values are dropped automatically on next publish. Document this manual step; there are few looks. If there are many, write a migration script per the `sanity-schema-builder` skill.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (schema is `.tsx`, type-checked).

- [ ] **Step 4: Commit**

```bash
git add sanity/schemas/documents/look.tsx
git commit -m "feat(sanity): rework look pricing (sum + discount code) and add relatedProducts"
```

---

## Task 2: GROQ query `getLook`

**Files:**
- Create: `sanity/queries/queries/look.ts`

- [ ] **Step 1: Write the query file**

```ts
// sanity/queries/queries/look.ts
import {groq} from 'next-sanity'
import {client} from '..'
import {image} from '../fragments/image'
import {seo} from '../fragments/seo'

export const LOOK_BY_SLUG_QUERY = groq`
  *[_type == "look"
     && slug.current == $slug
     && !(_id in path('drafts.**'))][0] {
    _id,
    title,
    "slug": slug.current,
    description,
    "seo": seo{ ${seo} },
    editorialImages[]{
      ${image},
      "alt": alt
    },
    "components": components[]{
      label,
      availableSizes,
      "variantGid": productVariant->store.gid,
      "productGid": productVariant->store.productGid,
      "productHandle": *[_type == "product" && store.gid == ^.productVariant->store.productGid][0].store.slug.current,
      "previewImageUrl": productVariant->store.previewImageUrl,
      "variantTitle": productVariant->store.title
    },
    discountStrategy,
    discountValue,
    discountCode,
    "relatedProducts": relatedProducts[]->{
      "handle": store.slug.current
    }
  }
`

export type SanityLookComponent = {
  label: string | null
  availableSizes: string[] | null
  variantGid: string | null
  productGid: string | null
  productHandle: string | null
  previewImageUrl: string | null
  variantTitle: string | null
}

export type SanityLookDoc = {
  _id: string
  title: string
  slug: string
  description: string | null
  seo: unknown
  editorialImages: Array<Record<string, unknown>> | null
  components: SanityLookComponent[] | null
  discountStrategy: 'none' | 'sumMinusFixed' | 'sumMinusPercent' | null
  discountValue: number | null
  discountCode: string | null
  relatedProducts: Array<{handle: string | null}> | null
}

export async function getLook(slug: string): Promise<SanityLookDoc | null> {
  const doc = await client.fetch<SanityLookDoc | null>(
    LOOK_BY_SLUG_QUERY,
    {slug},
    {next: {tags: ['look', `look:${slug}`], revalidate: 3600}},
  )
  return doc ?? null
}

export async function getLookSlugs(): Promise<string[]> {
  const slugs = await client.fetch<string[]>(
    groq`*[_type == "look" && defined(slug.current) && !(_id in path('drafts.**'))].slug.current`,
    {},
    {next: {tags: ['look'], revalidate: 3600}},
  )
  return slugs ?? []
}

export async function getLookSEO(slug: string) {
  return client.fetch(
    groq`*[_type == "look" && slug.current == $slug][0]{ "seo": seo{ ${seo} }, title }`,
    {slug},
    {next: {tags: ['look', `look:${slug}`], revalidate: 3600}},
  )
}
```

- [ ] **Step 2: Verify the `seo` fragment shape**

Run: `cat sanity/queries/fragments/seo.ts`
Confirm `seo` exports a GROQ string usable as `seo{ ${seo} }`. If its shape differs (e.g. it already includes the `seo{}` wrapper), adjust the projections above to match the PDP/legal usage.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add sanity/queries/queries/look.ts
git commit -m "feat(sanity): add getLook GROQ query for look detail page"
```

---

## Task 3: Frontend view types

**Files:**
- Create: `types/look.ts`

- [ ] **Step 1: Write the types**

```ts
// types/look.ts

export type LookSizeOption = {
  size: string
  variantGid: string
  price: number
  compareAtPrice?: number
  availableForSale: boolean
}

export type LookComponentView = {
  label: string
  imageUrl?: string
  sizes: LookSizeOption[]
}

export type LookGalleryImage = {
  url: string
  altText?: string
  width?: number
  height?: number
}

export type LookRelatedCard = {
  handle: string
  title: string
  imageUrl?: string
  imageAlt?: string
  minPrice: number
  maxPrice: number
}

export type LookView = {
  id: string
  title: string
  slug: string
  description: string | null
  currency: string
  images: LookGalleryImage[]
  components: LookComponentView[]
  discountStrategy: 'none' | 'sumMinusFixed' | 'sumMinusPercent'
  discountValue: number
  discountCode: string | null
  related: LookRelatedCard[]
  // Pre-computed price range across all components (cheapest → most expensive size each)
  minTotal: number
  maxTotal: number
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add types/look.ts
git commit -m "feat(types): add LookView frontend types"
```

---

## Task 4: `buildLookView` (merge Sanity + Shopify)

**Files:**
- Create: `lib/look/buildLookView.ts`

Resolution rule (mirrors `lib/product/buildProductView.ts`): the **color** option is `name === 'color'` (option1 by store convention); the **size** option is the first option whose name is not `color`. For each component, lock to the referenced variant's color and emit one `LookSizeOption` per `availableSizes` value that exists as a sibling variant.

- [ ] **Step 1: Write the builder**

```ts
// lib/look/buildLookView.ts
import type {SanityLookDoc, SanityLookComponent} from '@/sanity/queries/queries/look'
import type {
  LookView,
  LookComponentView,
  LookSizeOption,
  LookGalleryImage,
  LookRelatedCard,
} from '@/types/look'

type ShopifyVariant = {
  id: string
  availableForSale: boolean
  price: {amount: string; currencyCode: string}
  compareAtPrice?: {amount: string} | null
  selectedOptions: {name: string; value: string}[]
}

type ShopifyProductDetail = {
  handle: string
  options?: {name: string; values: string[]}[]
  priceRange: {minVariantPrice: {currencyCode: string}}
  variants: {nodes: ShopifyVariant[]}
} | null

type RelatedShopifyCard = {
  handle: string
  title: string
  featuredImage?: {url: string; altText?: string | null} | null
  priceRange: {minVariantPrice: {amount: string}; maxVariantPrice: {amount: string}}
}

function colorOf(v: ShopifyVariant): string | undefined {
  return v.selectedOptions.find((o) => o.name.toLowerCase() === 'color')?.value
}

function sizeOf(v: ShopifyVariant, sizeOptionName: string | undefined): string | undefined {
  if (!sizeOptionName) return undefined
  return v.selectedOptions.find((o) => o.name === sizeOptionName)?.value
}

// Resolve one component's selectable sizes from its Shopify product detail.
function resolveComponentSizes(
  comp: SanityLookComponent,
  detail: ShopifyProductDetail,
): LookSizeOption[] {
  if (!detail) return []
  const variants = detail.variants?.nodes ?? []
  const sizeOptionName = detail.options?.find((o) => o.name.toLowerCase() !== 'color')?.name
  // Locked color = the referenced variant's color.
  const ref = variants.find((v) => v.id === comp.variantGid)
  const lockedColor = ref ? colorOf(ref) : undefined
  const allowed = new Set((comp.availableSizes ?? []).map((s) => s.trim().toLowerCase()))

  const out: LookSizeOption[] = []
  for (const v of variants) {
    if (lockedColor && colorOf(v) !== lockedColor) continue
    const size = sizeOf(v, sizeOptionName) ?? 'Default'
    // If availableSizes is set, only include those sizes; otherwise include all.
    if (allowed.size > 0 && !allowed.has(size.trim().toLowerCase())) continue
    out.push({
      size,
      variantGid: v.id,
      price: Number(v.price.amount),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice.amount) : undefined,
      availableForSale: v.availableForSale,
    })
  }
  // Preserve the editor's availableSizes order when present.
  if (allowed.size > 0 && comp.availableSizes) {
    const order = comp.availableSizes.map((s) => s.trim().toLowerCase())
    out.sort((a, b) => order.indexOf(a.size.trim().toLowerCase()) - order.indexOf(b.size.trim().toLowerCase()))
  }
  return out
}

export function buildLookView(
  look: SanityLookDoc,
  details: Record<string, ShopifyProductDetail>, // keyed by productHandle
  relatedCards: RelatedShopifyCard[],
  urlForImage: (img: Record<string, unknown>) => string | null,
): LookView {
  const components: LookComponentView[] = (look.components ?? [])
    .map((comp) => {
      const detail = comp.productHandle ? details[comp.productHandle] ?? null : null
      const sizes = resolveComponentSizes(comp, detail)
      return {
        label: comp.label ?? comp.variantTitle ?? 'Pieza',
        imageUrl: comp.previewImageUrl ?? undefined,
        sizes,
      }
    })
    .filter((c) => c.sizes.length > 0)

  // Price range: sum of cheapest / most expensive size per component.
  let minTotal = 0
  let maxTotal = 0
  for (const c of components) {
    const prices = c.sizes.map((s) => s.price)
    minTotal += Math.min(...prices)
    maxTotal += Math.max(...prices)
  }

  const currency =
    Object.values(details).find((d) => d)?.priceRange.minVariantPrice.currencyCode ?? 'EUR'

  const images: LookGalleryImage[] = (look.editorialImages ?? [])
    .map((img) => {
      const url = urlForImage(img)
      if (!url) return null
      const alt = (img.alt as string | undefined) ?? look.title
      return {url, altText: alt}
    })
    .filter((x): x is LookGalleryImage => x !== null)

  const related: LookRelatedCard[] = relatedCards.map((c) => ({
    handle: c.handle,
    title: c.title,
    imageUrl: c.featuredImage?.url,
    imageAlt: c.featuredImage?.altText ?? undefined,
    minPrice: Number(c.priceRange.minVariantPrice.amount),
    maxPrice: Number(c.priceRange.maxVariantPrice.amount),
  }))

  return {
    id: look._id,
    title: look.title,
    slug: look.slug,
    description: look.description,
    currency,
    images,
    components,
    discountStrategy: look.discountStrategy ?? 'none',
    discountValue: look.discountValue ?? 0,
    discountCode: look.discountCode ?? null,
    related,
    minTotal,
    maxTotal,
  }
}

// Display helper: apply the discount to a summed total.
export function applyLookDiscount(
  sum: number,
  strategy: LookView['discountStrategy'],
  value: number,
): number {
  if (strategy === 'sumMinusFixed') return Math.max(0, sum - value)
  if (strategy === 'sumMinusPercent') return Math.max(0, sum * (1 - value / 100))
  return sum
}
```

- [ ] **Step 2: Confirm `urlFor` signature**

Run: `grep -n "urlFor" sanity/queries/index.tsx`
The page will pass `(img) => urlFor(img).url()`. Confirm `urlFor` accepts the image object shape produced by the `image` fragment. Adjust the `urlForImage` call site in Task 7 if needed.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/look/buildLookView.ts
git commit -m "feat(look): add buildLookView merging Sanity look with Shopify variants"
```

---

## Task 5: Shopify cart functions (multi-line + discount code)

**Files:**
- Modify: `lib/shopify.js`

Use the **`shopify-storefront`** skill. The existing `CART_LINES_FRAGMENT` returns `id checkoutUrl lines{...}`. Add discount codes to the returned fragment so the context can read applied state.

- [ ] **Step 1: Extend `CART_LINES_FRAGMENT`**

In `lib/shopify.js`, update the fragment (around line 27) to also return discount codes:

```js
const CART_LINES_FRAGMENT = `
  id
  checkoutUrl
  discountCodes { code applicable }
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
          }
        }
      }
    }
  }
`
```

- [ ] **Step 2: Add multi-line create + add + discount mutations**

Append after `cartLinesRemove` (around line 119):

```js
export async function cartCreateMultiple(lines) {
  const query = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { ${CART_LINES_FRAGMENT} }
        userErrors { field message }
      }
    }
  `
  try {
    const data = await shopifyData(query, {
      input: {
        lines: lines.map((l) => ({merchandiseId: l.merchandiseId, quantity: l.quantity})),
      },
    })
    return data.cartCreate.cart ?? null
  } catch (err) {
    return {error: err}
  }
}

export async function cartLinesAddMultiple(cartId, lines) {
  const query = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ${CART_LINES_FRAGMENT} }
        userErrors { field message }
      }
    }
  `
  try {
    const data = await shopifyData(query, {
      cartId,
      lines: lines.map((l) => ({merchandiseId: l.merchandiseId, quantity: l.quantity})),
    })
    return data.cartLinesAdd.cart ?? null
  } catch (err) {
    return {error: err}
  }
}

export async function cartDiscountCodesUpdate(cartId, codes) {
  const query = `
    mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
      cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
        cart { ${CART_LINES_FRAGMENT} }
        userErrors { field message }
      }
    }
  `
  try {
    const data = await shopifyData(query, {cartId, discountCodes: codes})
    return data.cartDiscountCodesUpdate.cart ?? null
  } catch (err) {
    return {error: err}
  }
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS (`lib/shopify.js` is JS; lint must pass).

- [ ] **Step 4: Commit**

```bash
git add lib/shopify.js
git commit -m "feat(shopify): add multi-line cart create/add and discount code mutations"
```

---

## Task 6: `addLookToCart` in cart context

**Files:**
- Modify: `context/shopContext.js`

Adds all look pieces as individual lines, then applies the discount code. Each line item carries the same shape existing cart code expects (`store.gid`, `title`, `image`, `variantQuantity`, `lineId`).

- [ ] **Step 1: Import the new functions**

Update the import at the top of `context/shopContext.js`:

```js
import {
  cartCreate,
  cartCreateMultiple,
  cartLinesAdd,
  cartLinesAddMultiple,
  cartLinesUpdate,
  cartLinesRemove,
  cartDiscountCodesUpdate,
} from '../lib/shopify'
```

- [ ] **Step 2: Add `addLookToCart`**

Add this function inside `ShopProvider`, after `addToCart` (around line 114). `lookLines` is an array of `{store:{gid}, title, image, productId, quantity}`.

```js
async function addLookToCart(lookLines, discountCode) {
  if (!Array.isArray(lookLines) || lookLines.length === 0) return
  setCartOpen(true)

  const apiLines = lookLines.map((l) => ({merchandiseId: l.store.gid, quantity: l.quantity ?? 1}))
  const itemsData = lookLines.map((l) => ({
    ...l,
    variantQuantity: l.quantity ?? 1,
  }))

  try {
    let apiCart
    let baseCart = cart

    if (cart.length === 0) {
      apiCart = await cartCreateMultiple(apiLines)
    } else {
      apiCart = await cartLinesAddMultiple(cartId, apiLines)
    }
    if (!apiCart || apiCart.error) return

    const currentCartId = apiCart.id ?? cartId

    if (discountCode) {
      const withDiscount = await cartDiscountCodesUpdate(currentCartId, [discountCode])
      if (withDiscount && !withDiscount.error) apiCart = withDiscount
    }

    const lines = apiCart.lines.edges.map((e) => e.node)
    // Merge new items into existing local cart, then sync line IDs by GID.
    const mergedLocal = [...baseCart]
    for (const item of itemsData) {
      const existing = mergedLocal.find((c) => c.store.gid === item.store.gid)
      if (existing) existing.variantQuantity += item.variantQuantity
      else mergedLocal.push(item)
    }
    const synced = syncLineIds(mergedLocal, lines)

    const meta = {id: currentCartId, checkoutUrl: apiCart.checkoutUrl ?? checkoutUrl}
    setCart(synced)
    setCartId(currentCartId)
    setCheckoutUrl(meta.checkoutUrl)
    saveToStorage(synced, meta)
  } catch (err) {
    console.error('addLookToCart failed', err)
  }
}
```

- [ ] **Step 3: Expose it in the context value**

Add `addLookToCart` to the `value={{ ... }}` object of `CartContext.Provider` (around line 154).

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add context/shopContext.js
git commit -m "feat(cart): add addLookToCart for bundle lines + discount code"
```

---

## Task 7: Route — `app/(frontend)/looks/[slug]/page.tsx`

**Files:**
- Create: `app/(frontend)/looks/[slug]/page.tsx`
- Create: `app/(frontend)/looks/[slug]/loading.tsx`
- Create: `app/(frontend)/looks/[slug]/error.tsx`

- [ ] **Step 1: Write `loading.tsx`**

```tsx
export default function Loading() {
  return <div style={{minHeight: '60vh'}} aria-busy="true" />
}
```

- [ ] **Step 2: Write `error.tsx`** (mirror `products/[handle]/error.tsx`)

```tsx
'use client'

export default function Error({reset}: {error: Error; reset: () => void}) {
  return (
    <div style={{padding: '4rem 1rem', textAlign: 'center'}}>
      <p>No se pudo cargar el look.</p>
      <button onClick={reset}>Reintentar</button>
    </div>
  )
}
```

- [ ] **Step 3: Write `page.tsx`**

```tsx
import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getLook, getLookSlugs, getLookSEO} from '@/sanity/queries/queries/look'
import {getProductDetail, getProductCards} from '@/lib/shopify'
import {buildLookView} from '@/lib/look/buildLookView'
import {urlFor} from '@/sanity/queries'
import {BASE_URL, siteTitle} from '@/utils/seoHelper'
import LookDetail from '@/components/Look/LookDetail'

export const revalidate = 300

export async function generateStaticParams() {
  const slugs = await getLookSlugs()
  return slugs.map((slug) => ({slug}))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{slug: string}>
}): Promise<Metadata> {
  const {slug} = await params
  const data = await getLookSEO(slug)
  if (!data) return {title: `Look not found | ${siteTitle}`}
  const seo = (data.seo ?? {}) as {title?: string; description?: string}
  const title = seo.title || data.title
  const canonical = `${BASE_URL.origin}/looks/${slug}`
  return {
    title: `${title} | ${siteTitle}`,
    description: seo.description,
    alternates: {canonical},
    openGraph: {title, description: seo.description, url: canonical},
  }
}

export default async function LookPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params
  const look = await getLook(slug)
  if (!look) notFound()

  // Unique product handles across components, fetched live from Shopify in parallel.
  const handles = Array.from(
    new Set((look.components ?? []).map((c) => c.productHandle).filter((h): h is string => !!h)),
  )
  const detailsList = await Promise.all(handles.map((h) => getProductDetail(h)))
  const details: Record<string, Awaited<ReturnType<typeof getProductDetail>>> = {}
  handles.forEach((h, i) => {
    details[h] = detailsList[i]
  })

  const relatedHandles = (look.relatedProducts ?? [])
    .map((r) => r.handle)
    .filter((h): h is string => !!h)
  const relatedCards = relatedHandles.length ? await getProductCards(relatedHandles) : []

  const view = buildLookView(look, details, relatedCards, (img) => {
    try {
      return urlFor(img).url()
    } catch {
      return null
    }
  })

  if (view.components.length === 0) notFound()

  return <LookDetail view={view} />
}
```

- [ ] **Step 4: Verify imports resolve**

Run: `grep -n "export" utils/seoHelper.ts | grep -E "BASE_URL|siteTitle"` and `grep -n "urlFor" sanity/queries/index.tsx`
Confirm `BASE_URL`, `siteTitle`, and `urlFor` are exported as used. Adjust import paths if the barrel differs.

- [ ] **Step 5: Typecheck + build**

Run: `npm run typecheck`
Expected: PASS (note: `LookDetail` import resolves only after Task 8; if running before Task 8, expect a missing-module error — proceed to Task 8 then re-run).

- [ ] **Step 6: Commit**

```bash
git add "app/(frontend)/looks/[slug]/page.tsx" "app/(frontend)/looks/[slug]/loading.tsx" "app/(frontend)/looks/[slug]/error.tsx"
git commit -m "feat(looks): add /looks/[slug] route with SSG, metadata, live Shopify resolution"
```

---

## Task 8: `LookDetail` client orchestrator

**Files:**
- Create: `components/Look/LookDetail.tsx`
- Create: `components/Look/LookDetail.module.scss` (styling via **figma-maquetador**, nodes `11-4591` / `11-4411`)
- Create: `components/Look/index.ts`

Holds per-component selected-size state; computes summed + discounted total; calls `addLookToCart`. Renders the gallery (reuse PDP `GalleryHorizontal` desktop / `GallerySwiper` mobile), `LookSelector`, `LookPrice`, `ProductInfoPanel`, and `RelatedGrid`.

- [ ] **Step 1: Write `index.ts`**

```ts
export {default} from './LookDetail'
export {default as LookDetail} from './LookDetail'
```

- [ ] **Step 2: Write `LookDetail.tsx`**

```tsx
'use client'

import {useContext, useMemo, useState} from 'react'
import {CartContext} from '@/context/shopContext'
import {applyLookDiscount} from '@/lib/look/buildLookView'
import type {LookView} from '@/types/look'
import LookSelector from './LookSelector'
import LookPrice from './LookPrice'
import s from './LookDetail.module.scss'

interface Props {
  view: LookView
}

export default function LookDetail({view}: Props) {
  const {addLookToCart} = useContext(CartContext)
  // selectedSize[componentIndex] = size string (or undefined until chosen)
  const [selected, setSelected] = useState<(string | undefined)[]>(
    () => view.components.map(() => undefined),
  )

  const allSelected = selected.every((sz) => sz !== undefined)

  const summedTotal = useMemo(() => {
    return view.components.reduce((sum, comp, i) => {
      const sz = selected[i]
      const opt = comp.sizes.find((o) => o.size === sz)
      return sum + (opt ? opt.price : 0)
    }, 0)
  }, [view.components, selected])

  const discountedTotal = applyLookDiscount(summedTotal, view.discountStrategy, view.discountValue)

  function handleSelect(componentIndex: number, size: string) {
    setSelected((prev) => {
      const next = [...prev]
      next[componentIndex] = size
      return next
    })
  }

  async function handleAddToCart() {
    if (!allSelected) return
    const lines = view.components.map((comp, i) => {
      const opt = comp.sizes.find((o) => o.size === selected[i])!
      return {
        store: {gid: opt.variantGid},
        title: comp.label,
        image: comp.imageUrl,
        productId: opt.variantGid,
        quantity: 1,
      }
    })
    await addLookToCart(lines, view.discountCode)
  }

  return (
    <article className={s.look}>
      {/* Gallery: reuse PDP GalleryHorizontal (desktop) / GallerySwiper (mobile).
          Pass view.images mapped to each component's expected prop shape — read
          components/Product/Desktop/GalleryHorizontal.tsx and
          components/Product/Mobile/GallerySwiper.tsx for exact props. */}

      <div className={s.body}>
        <h1 className={s.title}>{view.title}</h1>

        <LookPrice
          allSelected={allSelected}
          minTotal={view.minTotal}
          maxTotal={view.maxTotal}
          summedTotal={summedTotal}
          discountedTotal={discountedTotal}
          hasDiscount={view.discountStrategy !== 'none' && view.discountValue > 0}
          currency={view.currency}
        />

        <LookSelector
          components={view.components}
          selected={selected}
          onSelect={handleSelect}
          allSelected={allSelected}
          onAddToCart={handleAddToCart}
        />

        {/* Product Information: reuse components/Product/shared/ProductInfoPanel.tsx,
            passing view.description (read the component for its prop shape). */}
      </div>

      {/* Related Products: reuse components/Product/Mobile/RelatedGrid.tsx with
          view.related (read RelatedGrid + RelatedMiniCard for prop shapes). */}
    </article>
  )
}
```

- [ ] **Step 3: Wire the reused PDP components**

Read `GalleryHorizontal.tsx`, `GallerySwiper.tsx`, `ProductInfoPanel.tsx`, `RelatedGrid.tsx`, `RelatedMiniCard.tsx` and replace the three comment placeholders with real usage, mapping `view.images`, `view.description`, and `view.related` to each component's props. If a component's props don't fit the look data cleanly, prefer a thin adapter in `LookDetail` over modifying the shared component.

- [ ] **Step 4: Style with figma-maquetador**

Use the **figma-maquetador** skill on nodes `11-4591` (desktop) and `11-4411` (mobile) to produce `LookDetail.module.scss` (mobile-first, `min-width` breakpoints, nesting reflecting the JSX, per `CLAUDE.md`).

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/Look/LookDetail.tsx components/Look/LookDetail.module.scss components/Look/index.ts
git commit -m "feat(looks): add LookDetail client orchestrator with bundle add-to-cart"
```

---

## Task 9: `LookSelector` (per-piece size rows)

**Files:**
- Create: `components/Look/LookSelector.tsx`
- Create: `components/Look/LookSelector.module.scss` (figma-maquetador nodes `31-13533` desktop / `11-4179` mobile)

Desktop: sticky bottom bar that expands a panel; mobile: accordion. For this task, build the structural component (open/close state + per-piece size rows + add-to-cart CTA); the bar-vs-accordion responsive presentation is handled in SCSS via breakpoints.

- [ ] **Step 1: Write `LookSelector.tsx`**

```tsx
'use client'

import {useState} from 'react'
import {LazyImage} from '@/components/Common'
import type {LookComponentView} from '@/types/look'
import s from './LookSelector.module.scss'

interface Props {
  components: LookComponentView[]
  selected: (string | undefined)[]
  onSelect: (componentIndex: number, size: string) => void
  allSelected: boolean
  onAddToCart: () => void
}

export default function LookSelector({
  components,
  selected,
  onSelect,
  allSelected,
  onAddToCart,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <section className={s.selector}>
      <button
        type="button"
        className={s.toggle}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Select products and sizes
      </button>

      {open && (
        <div className={s.panel}>
          {components.map((comp, i) => (
            <div key={i} className={s.piece}>
              <div className={s.pieceHead}>
                <span className={s.pieceIndex}>{i + 1}</span>
                {comp.imageUrl && (
                  <LazyImage
                    src={comp.imageUrl}
                    alt={comp.label}
                    width={64}
                    height={84}
                    className={s.pieceThumb}
                  />
                )}
                <span className={s.pieceLabel}>{comp.label}</span>
              </div>

              <ul className={s.sizes}>
                {comp.sizes.map((opt) => {
                  const isSelected = selected[i] === opt.size
                  return (
                    <li key={opt.variantGid} className={s.sizeRow}>
                      <span className={s.sizeName}>{opt.size}</span>
                      <span className={s.sizePrice}>€{opt.price.toFixed(2)}</span>
                      <button
                        type="button"
                        className={`${s.sizeSelect} ${isSelected ? s.sizeSelectActive : ''}`}
                        disabled={!opt.availableForSale}
                        aria-pressed={isSelected}
                        onClick={() => onSelect(i, opt.size)}
                      >
                        {opt.availableForSale ? (isSelected ? 'Selected' : 'Select') : 'Sold out'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

          <button
            type="button"
            className={s.addToCart}
            disabled={!allSelected}
            onClick={onAddToCart}
          >
            {allSelected ? 'Add look to cart' : 'Select products and sizes'}
          </button>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Style with figma-maquetador**

Use the **figma-maquetador** skill on nodes `31-13533` (desktop panel from sticky bar) and `11-4179` (mobile accordion) to produce `LookSelector.module.scss`. Desktop: fixed bottom bar + expanding panel; mobile: inline accordion. Mobile-first with `min-width` breakpoints.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/Look/LookSelector.tsx components/Look/LookSelector.module.scss
git commit -m "feat(looks): add LookSelector with per-piece size selection"
```

---

## Task 10: `LookPrice` (range → discounted total)

**Files:**
- Create: `components/Look/LookPrice.tsx`
- Create: `components/Look/LookPrice.module.scss` (figma-maquetador)

- [ ] **Step 1: Write `LookPrice.tsx`**

```tsx
import s from './LookPrice.module.scss'

interface Props {
  allSelected: boolean
  minTotal: number
  maxTotal: number
  summedTotal: number
  discountedTotal: number
  hasDiscount: boolean
  currency: string
}

function fmt(n: number): string {
  return `€${n.toFixed(2)}`
}

export default function LookPrice({
  allSelected,
  minTotal,
  maxTotal,
  summedTotal,
  discountedTotal,
  hasDiscount,
}: Props) {
  if (!allSelected) {
    // Show the range until every piece has a size.
    const range = minTotal === maxTotal ? fmt(minTotal) : `${fmt(minTotal)} – ${fmt(maxTotal)}`
    return <p className={s.price}>{range}</p>
  }

  if (hasDiscount && discountedTotal < summedTotal) {
    return (
      <p className={s.price}>
        <span className={s.original}>{fmt(summedTotal)}</span>
        <span className={s.discounted}>{fmt(discountedTotal)}</span>
      </p>
    )
  }

  return <p className={s.price}>{fmt(summedTotal)}</p>
}
```

- [ ] **Step 2: Style with figma-maquetador**

Produce `LookPrice.module.scss` (struck-through `.original`, emphasized `.discounted`) from the price area in nodes `11-4591` / `11-4411`.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/Look/LookPrice.tsx components/Look/LookPrice.module.scss
git commit -m "feat(looks): add LookPrice with range and discounted-total display"
```

---

## Task 11: Register revalidation tags + docs

**Files:**
- Modify: `app/api/revalidate/route.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the `look` branch to the revalidate route**

In `app/api/revalidate/route.ts`, after the `collection` block (around line 35):

```ts
    if (body._type === 'look') {
      if (body.slug) tags.push(`look:${body.slug}`)
    }
```

- [ ] **Step 2: Update `CLAUDE.md` tags list**

In the "Tags activos hoy" line, append `look`, `look:{slug}`:

```
**Tags activos hoy:** `home`, `settings`, `legalPage`, `product`, `product:{handle}`, `products:ordered`, `look`, `look:{slug}`.
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/revalidate/route.ts CLAUDE.md
git commit -m "feat(revalidate): register look and look:{slug} cache tags"
```

---

## Task 12: Full build + manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: PASS — `/looks/[slug]` appears as a statically generated dynamic route; no type errors.

- [ ] **Step 2: Golden path (browser)**

Run `npm run dev`. In a real Sanity look, ensure it has ≥2 components (each a `productVariant` whose product has size variants) and `availableSizes` set. Visit `/looks/<slug>` and verify:
- Editorial gallery renders (desktop 2-up; mobile carousel + lightbox "+").
- Price shows a **range** before any selection.
- Opening the selector lists each piece with its sizes + prices + Select buttons.
- Selecting a size per piece updates the total; when all selected, the total is the exact sum (struck-through + discounted if a discount is configured).
- "Add look to cart" adds one line per piece to the cart drawer and (if `discountCode` set) the discount is reflected at checkout (`checkoutUrl`).

- [ ] **Step 3: Edge cases (browser)**

- A piece with a sold-out size → that size's button shows "Sold out" and is disabled.
- A look slug that doesn't exist → `/looks/does-not-exist` returns 404.
- A component whose product has no matching sizes → component is omitted; if none remain, the look 404s.
- Related Products grid renders the curated products (or is absent if none).

- [ ] **Step 4: Report**

Report which checks passed with evidence (screenshots / observed behavior). If the UI cannot be exercised (no seeded look data), state that explicitly rather than claiming success.

---

## Self-Review Notes (author)

- **Spec coverage:** route+SSG+metadata (T7), size→variant live resolution (T2/T4), price range + discount display (T4/T10), discount code at checkout (T5/T6), per-piece selector (T9), related products curated (T1/T2/T7/T8), schema rework (T1), revalidation (T11). All spec sections mapped.
- **Type consistency:** `SanityLookDoc`/`SanityLookComponent` (T2) consumed by `buildLookView` (T4); `LookView`/`LookComponentView`/`LookSizeOption` (T3) consumed by `LookDetail`/`LookSelector`/`LookPrice` (T8–10); `addLookToCart(lines, discountCode)` signature consistent (T6 ↔ T8). `applyLookDiscount` exported from T4, used in T8.
- **Known follow-ups (out of scope):** `/sets/[slug]`, `/looks` archive, cart grouping as "a look", automatic related-products derivation.
