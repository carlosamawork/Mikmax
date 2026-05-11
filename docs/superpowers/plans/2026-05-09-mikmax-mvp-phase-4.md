# Mikmax MVP — Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the three product-driven home blocks (`ProductModule`, `LookModule`, `SetModule`) and replace the temporary product cell in `ImageWithProduct` with a real `ProductCard`. After this phase the entire populated home renders as designed; no more `null` slots in the dispatcher and no more placeholders.

**Architecture:**
- A small reusable `<PriceDisplay>` component handles every price string (single, range, compare-at strikethrough). Both `<ProductCard>` and `<BundleCard>` use it.
- `<ProductCard>` is a server component that takes a flat data shape projected from `store.*` fields and renders the `default` Figma variant (image + optional "Novedades" tag + title + price). The other 3 variants from the spec (`mini`, `hover`, `set`) are deferred — none of the populated home modules need them today.
- `<BundleCard>` is a server component shared by `LookModule` and `SetModule` since both use the same shape (editorial image + title + fixed price + optional compare-at). Sets pass an extra `colorLocked` line.
- The three module blocks have schemas that already exist (Phase 1). Phase 4 adds their TS types, GROQ projections, components, and dispatcher cases. We support **one** layout per block in this phase: `grid-4col` for ProductModule, `row-wide` for LookModule, `row-mini` for SetModule. Other schema layouts fall back to the implemented one.
- `ImageWithProduct` swaps its inline `ProductCell` placeholder for `<ProductCard />`, reusing the same product GROQ projection so the data shape stays consistent across blocks.

**Tech stack:** Next.js 15 App Router (server components), TypeScript strict, SCSS modules, `next-sanity` GROQ client, `LazyImage` from `@/components/Common`. No new dependencies.

**Out of scope:**
- ProductCard `mini`/`hover`/`set` variants.
- `FichaButton` + `FichaModal` (quick-view).
- ProductModule `carousel` and `grid-mixed`, LookModule `grid-2col`, SetModule `grid` layouts.
- `/shop/product/[handle]`, `/looks/[slug]`, `/sets/[slug]` route pages.

---

## File Structure (Phase 4)

### Types
- `sanity/types/objects/cards.ts` — shared `ProductCardData`, `BundleCardData`
- `sanity/types/objects/blocks/productModule.ts`
- `sanity/types/objects/blocks/lookModule.ts`
- `sanity/types/objects/blocks/setModule.ts`
- `sanity/types/objects/blocks/index.ts` (modify — add to barrel + union)
- `sanity/types/objects/index.ts` (modify — export `./cards`)

### GROQ
- `sanity/queries/fragments/cards.ts` — `productCardProjection`, `bundleCardProjection`
- `sanity/queries/queries/home.ts` (modify — 3 new `_type` branches + update `imageWithProduct.product`)

### Components
- `components/PageBuilder/PriceDisplay/PriceDisplay.tsx` + `.module.scss`
- `components/PageBuilder/ProductCard/ProductCard.tsx` + `.module.scss`
- `components/PageBuilder/BundleCard/BundleCard.tsx` + `.module.scss`
- `components/PageBuilder/blocks/ProductModule/ProductModule.tsx` + `.module.scss`
- `components/PageBuilder/blocks/LookModule/LookModule.tsx` + `.module.scss`
- `components/PageBuilder/blocks/SetModule/SetModule.tsx` + `.module.scss`
- `components/PageBuilder/PageBuilder.tsx` (modify — 3 dispatcher cases)
- `components/PageBuilder/blocks/ImageWithProduct/ImageWithProduct.tsx` (modify — use `<ProductCard />`)

### Spec
- `docs/superpowers/specs/2026-05-05-mikmax-arquitectura-mvp-design.md` (modify — append Phase 4 close note)

---

## Phase 4 — Day L4

### Task 4.1: Build `<PriceDisplay>` shared component

**Files:**
- Create: `components/PageBuilder/PriceDisplay/PriceDisplay.tsx`
- Create: `components/PageBuilder/PriceDisplay/PriceDisplay.module.scss`

- [ ] **Step 1: Create the SCSS module**

```scss
// components/PageBuilder/PriceDisplay/PriceDisplay.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.root {
  display: inline-flex;
  align-items: baseline;
  gap: px(8);
  font-family: $MonumentGrotesk;
  font-size: px(11);
  line-height: px(15);
  letter-spacing: 0.5px;
  color: map-get($colors, 'darker');
  margin: 0;
}

.compare {
  text-decoration: line-through;
  color: map-get($colors, 'gray');
}
```

- [ ] **Step 2: Create the component**

```tsx
// components/PageBuilder/PriceDisplay/PriceDisplay.tsx
import s from './PriceDisplay.module.scss'

interface Props {
  min?: number
  max?: number
  compareAt?: number
  className?: string
}

const formatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
})

function format(n: number): string {
  return formatter.format(n)
}

export default function PriceDisplay({min, max, compareAt, className}: Props) {
  if (typeof min !== 'number') return null

  const range = typeof max === 'number' && max > min ? `${format(min)} – ${format(max)}` : format(min)
  const showCompare = typeof compareAt === 'number' && compareAt > min

  return (
    <p className={`${s.root} ${className ?? ''}`.trim()}>
      <span>{range}</span>
      {showCompare && <span className={s.compare}>{format(compareAt!)}</span>}
    </p>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/PageBuilder/PriceDisplay/
git commit -m "Add PriceDisplay component (single price, range, compare-at)"
```

---

### Task 4.2: Build `<ProductCard>` (default variant) + GROQ fragment + types

**Files:**
- Create: `sanity/types/objects/cards.ts`
- Create: `sanity/queries/fragments/cards.ts`
- Create: `components/PageBuilder/ProductCard/ProductCard.tsx`
- Create: `components/PageBuilder/ProductCard/ProductCard.module.scss`
- Modify: `sanity/types/objects/index.ts` (add `export * from './cards'`)

- [ ] **Step 1: Create shared card types**

```ts
// sanity/types/objects/cards.ts
import type {SanityImageRef} from './blocks/heroCampaign'

export type ProductCardData = {
  _id: string
  title?: string
  handle?: string
  imageUrl?: string
  minPrice?: number
  maxPrice?: number
  compareAtPrice?: number
  tags?: string
}

export type BundleCardData = {
  _id: string
  title?: string
  slug?: string
  image?: SanityImageRef
  priceFixed?: number
  priceCompareAt?: number
  colorLocked?: string
}
```

- [ ] **Step 2: Re-export from objects barrel**

Open `sanity/types/objects/index.ts` and append:

```ts
export * from './cards'
```

- [ ] **Step 3: Create the GROQ projection fragments**

```ts
// sanity/queries/fragments/cards.ts
import {groq} from 'next-sanity'
import {image} from './image'

// Projects fields from a `product` document for ProductCard rendering.
// Use as: `manualProducts[]->{${productCardProjection}}` etc.
export const productCardProjection = groq`
  _id,
  "title": store.title,
  "handle": store.slug.current,
  "imageUrl": store.previewImageUrl,
  "minPrice": store.priceRange.minVariantPrice,
  "maxPrice": store.priceRange.maxVariantPrice,
  "compareAtPrice": store.compareAtPrice,
  "tags": store.tags
`

// Projects fields from a `look` or `set` document for BundleCard rendering.
// Use as: `looks[]->{${bundleCardProjection}}` etc.
export const bundleCardProjection = groq`
  _id,
  title,
  "slug": slug.current,
  "image": editorialImages[0].image{
    ${image},
    "alt": alt
  },
  priceFixed,
  priceCompareAt,
  colorLocked
`
```

- [ ] **Step 4: Create the ProductCard SCSS**

```scss
// components/PageBuilder/ProductCard/ProductCard.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.card {
  display: flex;
  flex-direction: column;
  width: 100%;
  text-decoration: none;
  color: inherit;
}

.media {
  position: relative;
  width: 100%;
  aspect-ratio: 357 / 476;
  overflow: hidden;
  background: map-get($colors, 'gray');

  // LazyImage wrapper specificity boost (same pattern as siblings).
  > :global(.wrapper),
  > div {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
}

.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tag {
  position: absolute;
  top: px(16);
  left: px(10);
  margin: 0;
  font-family: $HelveticaNeue, $MonumentGrotesk;
  font-size: px(8);
  line-height: px(12);
  letter-spacing: 0;
  color: #2e2e2e;
  text-transform: uppercase;
  z-index: 1;
}

.info {
  display: flex;
  flex-direction: column;
  gap: px(8);
  padding: px(10) px(10) px(30);
}

.title {
  margin: 0;
  font-family: $MonumentGrotesk;
  font-size: px(11);
  line-height: px(15);
  letter-spacing: 0.5px;
  color: map-get($colors, 'darker');
}
```

- [ ] **Step 5: Create the ProductCard component**

```tsx
// components/PageBuilder/ProductCard/ProductCard.tsx
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import PriceDisplay from '../PriceDisplay/PriceDisplay'
import type {ProductCardData} from '@/sanity/types'
import s from './ProductCard.module.scss'

interface Props {
  product: ProductCardData
  className?: string
  // Optional override: when the dispatcher already projects compareAt, use it.
  showTag?: boolean
}

function hasNovedadTag(tags?: string): boolean {
  if (!tags) return false
  return tags
    .toLowerCase()
    .split(',')
    .map((t) => t.trim())
    .some((t) => t === 'novedad' || t === 'novedades' || t === 'new')
}

export default function ProductCard({product, className, showTag = true}: Props) {
  const href = product.handle ? `/shop/product/${product.handle}` : '#'
  const tag = showTag && hasNovedadTag(product.tags) ? 'Novedades' : null

  return (
    <Link href={href} className={`${s.card} ${className ?? ''}`.trim()}>
      <div className={s.media}>
        {product.imageUrl && (
          <LazyImage
            src={product.imageUrl}
            alt={product.title ?? ''}
            width={357}
            height={476}
            className={s.img}
          />
        )}
        {tag && <p className={s.tag}>{tag}</p>}
      </div>
      <div className={s.info}>
        {product.title && <p className={s.title}>{product.title}</p>}
        <PriceDisplay
          min={product.minPrice}
          max={product.maxPrice}
          compareAt={product.compareAtPrice}
        />
      </div>
    </Link>
  )
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add sanity/types/objects/cards.ts sanity/types/objects/index.ts sanity/queries/fragments/cards.ts components/PageBuilder/ProductCard/ components/PageBuilder/PriceDisplay/PriceDisplay.tsx
git commit -m "Add ProductCard (default variant) + shared card projections"
```

---

### Task 4.3: Build `<BundleCard>` for looks and sets

**Files:**
- Create: `components/PageBuilder/BundleCard/BundleCard.tsx`
- Create: `components/PageBuilder/BundleCard/BundleCard.module.scss`

- [ ] **Step 1: Create the SCSS module**

```scss
// components/PageBuilder/BundleCard/BundleCard.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.card {
  display: flex;
  flex-direction: column;
  width: 100%;
  text-decoration: none;
  color: inherit;
}

.media {
  position: relative;
  width: 100%;
  aspect-ratio: 357 / 476;
  overflow: hidden;
  background: map-get($colors, 'gray');

  > :global(.wrapper),
  > div {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
}

.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.info {
  display: flex;
  flex-direction: column;
  gap: px(4);
  padding: px(10) px(10) px(30);
  text-align: center;
}

.title {
  margin: 0;
  font-family: $MonumentGrotesk;
  font-size: px(11);
  line-height: px(15);
  letter-spacing: 0.5px;
  color: map-get($colors, 'darker');
}

.color {
  margin: 0;
  font-family: $MonumentGrotesk;
  font-size: px(11);
  line-height: px(15);
  letter-spacing: 0.5px;
  color: map-get($colors, 'gray');
}
```

- [ ] **Step 2: Create the component**

```tsx
// components/PageBuilder/BundleCard/BundleCard.tsx
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import PriceDisplay from '../PriceDisplay/PriceDisplay'
import type {BundleCardData} from '@/sanity/types'
import s from './BundleCard.module.scss'

interface Props {
  bundle: BundleCardData
  // 'look' or 'set' decides the route prefix.
  kind: 'look' | 'set'
  className?: string
}

export default function BundleCard({bundle, kind, className}: Props) {
  const route = kind === 'look' ? '/looks' : '/sets'
  const href = bundle.slug ? `${route}/${bundle.slug}` : '#'
  const w = bundle.image?.metadata?.dimensions?.width ?? 357
  const h = bundle.image?.metadata?.dimensions?.height ?? 476

  return (
    <Link href={href} className={`${s.card} ${className ?? ''}`.trim()}>
      <div className={s.media}>
        {bundle.image?.imageUrl && (
          <LazyImage
            src={bundle.image.imageUrl}
            alt={bundle.image.alt ?? bundle.title ?? ''}
            width={w}
            height={h}
            className={s.img}
          />
        )}
      </div>
      <div className={s.info}>
        {bundle.title && <p className={s.title}>{bundle.title}</p>}
        {bundle.colorLocked && <p className={s.color}>{bundle.colorLocked}</p>}
        <PriceDisplay min={bundle.priceFixed} compareAt={bundle.priceCompareAt} />
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/PageBuilder/BundleCard/
git commit -m "Add BundleCard component (shared by Look and Set modules)"
```

---

### Task 4.4: ProductModule block (type + GROQ + component + dispatcher)

**Files:**
- Create: `sanity/types/objects/blocks/productModule.ts`
- Create: `components/PageBuilder/blocks/ProductModule/ProductModule.tsx`
- Create: `components/PageBuilder/blocks/ProductModule/ProductModule.module.scss`
- Modify: `sanity/types/objects/blocks/index.ts` (add to barrel + union)
- Modify: `sanity/queries/queries/home.ts` (add `block.productModule` branch)
- Modify: `components/PageBuilder/PageBuilder.tsx` (wire dispatcher case)

- [ ] **Step 1: Create the type**

```ts
// sanity/types/objects/blocks/productModule.ts
import type {ProductCardData} from '../cards'

export type ProductModuleLayout = 'carousel' | 'grid-4col' | 'grid-mixed'
export type ProductModuleSource = 'manual' | 'collection'

export type ProductModuleBlock = {
  _key: string
  _type: 'block.productModule'
  title?: string
  layout?: ProductModuleLayout
  source?: ProductModuleSource
  // Resolved by GROQ from manualProducts or collection.
  products?: ProductCardData[]
}
```

- [ ] **Step 2: Add to barrel + union**

Open `sanity/types/objects/blocks/index.ts` and modify so the file is:

```ts
// sanity/types/objects/blocks/index.ts
export * from './heroCampaign'
export * from './campaignImageVideo'
export * from './featuredSection'
export * from './imageWithProduct'
export * from './productModule'
export * from './richText'

import type {HeroCampaignBlock} from './heroCampaign'
import type {CampaignImageVideoBlock} from './campaignImageVideo'
import type {FeaturedSectionBlock} from './featuredSection'
import type {ImageWithProductBlock} from './imageWithProduct'
import type {ProductModuleBlock} from './productModule'
import type {RichTextBlock} from './richText'

export type PageBuilderBlock =
  | HeroCampaignBlock
  | CampaignImageVideoBlock
  | FeaturedSectionBlock
  | ImageWithProductBlock
  | ProductModuleBlock
  | RichTextBlock
  | {_key: string; _type: string} // forward-compat for unimplemented types (lookModule, setModule)
```

- [ ] **Step 3: Add GROQ branch in `home.ts`**

Open `sanity/queries/queries/home.ts`. Add the import for the new fragment near the other imports:

```ts
import {productCardProjection} from '../fragments/cards'
```

Then inside the `pageBuilder[]{ … }` projection, after the `block.imageWithProduct` branch and before the `block.richText` branch, insert:

```groq
        _type == "block.productModule" => {
          title,
          layout,
          source,
          source == "manual" => {
            "products": manualProducts[]->{ ${productCardProjection} }
          },
          source == "collection" => {
            "products": *[
              _type == "product" &&
              !store.isDeleted &&
              ^.collection._ref in store.collections[]._ref
            ] | order(coalesce(orderRank, store.title) asc)[0...coalesce(^.limit, 8)]{
              ${productCardProjection}
            }
          }
        },
```

The `source == "collection"` branch uses `^.collection._ref` (the parent block's collection reference) to filter products whose `store.collections` contain it. The `[0...limit]` slice respects the `limit` field. If the product schema doesn't yet expose `store.collections[]._ref` you may need to fall back to manual mode initially — when the editor uses `manual` it works regardless.

- [ ] **Step 4: Create the SCSS**

```scss
// components/PageBuilder/blocks/ProductModule/ProductModule.module.scss
@use '../../../../styles/common/variables' as *;
@use '../../../../styles/common/tokens' as *;
@use '../../../../styles/mixins/mixins' as *;

.section {
  display: flex;
  flex-direction: column;
  gap: px(20);
  width: 100%;
}

.title {
  font-family: $MonumentGrotesk;
  font-size: px(13);
  line-height: px(20);
  letter-spacing: 0.5px;
  color: map-get($colors, 'darker');
  margin: 0 px(15);

  @include from(md) {
    margin: 0 px(15);
  }
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: px(1);

  @include from(md) {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

- [ ] **Step 5: Create the component**

```tsx
// components/PageBuilder/blocks/ProductModule/ProductModule.tsx
import ProductCard from '../../ProductCard/ProductCard'
import type {ProductModuleBlock} from '@/sanity/types'
import s from './ProductModule.module.scss'

interface Props {
  block: ProductModuleBlock
}

export default function ProductModule({block}: Props) {
  const products = block.products ?? []
  if (products.length === 0) return null

  return (
    <section className={s.section}>
      {block.title && <h2 className={s.title}>{block.title}</h2>}
      <div className={s.grid}>
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Wire dispatcher case**

Open `components/PageBuilder/PageBuilder.tsx`. Add to the type imports list:

```tsx
import type {
  PageBuilderBlock,
  HeroCampaignBlock,
  CampaignImageVideoBlock,
  RichTextBlock,
  FeaturedSectionBlock,
  ImageWithProductBlock,
  ProductModuleBlock,
} from '@/sanity/types'
```

Add the component import next to the others:

```tsx
import ProductModule from './blocks/ProductModule/ProductModule'
```

In the `switch (block._type)`, replace the `default: return null` block by inserting one new case **before** it:

```tsx
          case 'block.productModule':
            return (
              <ProductModule
                key={block._key}
                block={block as ProductModuleBlock}
              />
            )
          default:
            return null
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add sanity/types/objects/blocks/ sanity/queries/queries/home.ts components/PageBuilder/
git commit -m "Implement ProductModule block (grid-4col layout)"
```

---

### Task 4.5: LookModule block (type + GROQ + component + dispatcher)

**Files:**
- Create: `sanity/types/objects/blocks/lookModule.ts`
- Create: `components/PageBuilder/blocks/LookModule/LookModule.tsx`
- Create: `components/PageBuilder/blocks/LookModule/LookModule.module.scss`
- Modify: `sanity/types/objects/blocks/index.ts` (barrel + union)
- Modify: `sanity/queries/queries/home.ts` (add `block.lookModule` branch)
- Modify: `components/PageBuilder/PageBuilder.tsx` (wire dispatcher case)

- [ ] **Step 1: Create the type**

```ts
// sanity/types/objects/blocks/lookModule.ts
import type {BundleCardData} from '../cards'

export type LookModuleLayout = 'row-wide' | 'grid-2col'

export type LookModuleBlock = {
  _key: string
  _type: 'block.lookModule'
  title?: string
  layout?: LookModuleLayout
  // Resolved by GROQ from looks references.
  looks?: BundleCardData[]
}
```

- [ ] **Step 2: Add to barrel + union**

Open `sanity/types/objects/blocks/index.ts` and update so it now reads:

```ts
// sanity/types/objects/blocks/index.ts
export * from './heroCampaign'
export * from './campaignImageVideo'
export * from './featuredSection'
export * from './imageWithProduct'
export * from './productModule'
export * from './lookModule'
export * from './richText'

import type {HeroCampaignBlock} from './heroCampaign'
import type {CampaignImageVideoBlock} from './campaignImageVideo'
import type {FeaturedSectionBlock} from './featuredSection'
import type {ImageWithProductBlock} from './imageWithProduct'
import type {ProductModuleBlock} from './productModule'
import type {LookModuleBlock} from './lookModule'
import type {RichTextBlock} from './richText'

export type PageBuilderBlock =
  | HeroCampaignBlock
  | CampaignImageVideoBlock
  | FeaturedSectionBlock
  | ImageWithProductBlock
  | ProductModuleBlock
  | LookModuleBlock
  | RichTextBlock
  | {_key: string; _type: string} // forward-compat for unimplemented types (setModule)
```

- [ ] **Step 3: Add GROQ branch in `home.ts`**

Open `sanity/queries/queries/home.ts`. The `bundleCardProjection` was already imported in Task 4.4 — if not, add to the imports:

```ts
import {productCardProjection, bundleCardProjection} from '../fragments/cards'
```

Inside the `pageBuilder[]{ … }` projection, after the `block.productModule` branch and before `block.richText`, insert:

```groq
        _type == "block.lookModule" => {
          title,
          layout,
          "looks": looks[]->{ ${bundleCardProjection} }
        },
```

- [ ] **Step 4: Create the SCSS**

```scss
// components/PageBuilder/blocks/LookModule/LookModule.module.scss
@use '../../../../styles/common/variables' as *;
@use '../../../../styles/common/tokens' as *;
@use '../../../../styles/mixins/mixins' as *;

.section {
  display: flex;
  flex-direction: column;
  gap: px(20);
  width: 100%;
}

.title {
  margin: 0 px(15);
  font-family: $MonumentGrotesk;
  font-size: px(13);
  line-height: px(20);
  letter-spacing: 0.5px;
  color: map-get($colors, 'darker');
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: px(1);

  @include from(md) {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

- [ ] **Step 5: Create the component**

```tsx
// components/PageBuilder/blocks/LookModule/LookModule.tsx
import BundleCard from '../../BundleCard/BundleCard'
import type {LookModuleBlock} from '@/sanity/types'
import s from './LookModule.module.scss'

interface Props {
  block: LookModuleBlock
}

export default function LookModule({block}: Props) {
  const looks = block.looks ?? []
  if (looks.length === 0) return null

  return (
    <section className={s.section}>
      {block.title && <h2 className={s.title}>{block.title}</h2>}
      <div className={s.row}>
        {looks.map((look) => (
          <BundleCard key={look._id} bundle={look} kind="look" />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Wire dispatcher case**

In `components/PageBuilder/PageBuilder.tsx`, add `LookModuleBlock` to the type import line, add `import LookModule from './blocks/LookModule/LookModule'` near the others, and insert a case before `default`:

```tsx
          case 'block.lookModule':
            return (
              <LookModule
                key={block._key}
                block={block as LookModuleBlock}
              />
            )
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add sanity/types/objects/blocks/ sanity/queries/queries/home.ts components/PageBuilder/
git commit -m "Implement LookModule block (row-wide layout)"
```

---

### Task 4.6: SetModule block (type + GROQ + component + dispatcher)

**Files:**
- Create: `sanity/types/objects/blocks/setModule.ts`
- Create: `components/PageBuilder/blocks/SetModule/SetModule.tsx`
- Create: `components/PageBuilder/blocks/SetModule/SetModule.module.scss`
- Modify: `sanity/types/objects/blocks/index.ts` (barrel + union)
- Modify: `sanity/queries/queries/home.ts` (add `block.setModule` branch)
- Modify: `components/PageBuilder/PageBuilder.tsx` (wire dispatcher case)

- [ ] **Step 1: Create the type**

```ts
// sanity/types/objects/blocks/setModule.ts
import type {BundleCardData} from '../cards'

export type SetModuleLayout = 'row-mini' | 'grid'

export type SetModuleBlock = {
  _key: string
  _type: 'block.setModule'
  title?: string
  layout?: SetModuleLayout
  // Resolved by GROQ from sets references.
  sets?: BundleCardData[]
}
```

- [ ] **Step 2: Add to barrel + union**

Open `sanity/types/objects/blocks/index.ts` and update so it now reads:

```ts
// sanity/types/objects/blocks/index.ts
export * from './heroCampaign'
export * from './campaignImageVideo'
export * from './featuredSection'
export * from './imageWithProduct'
export * from './productModule'
export * from './lookModule'
export * from './setModule'
export * from './richText'

import type {HeroCampaignBlock} from './heroCampaign'
import type {CampaignImageVideoBlock} from './campaignImageVideo'
import type {FeaturedSectionBlock} from './featuredSection'
import type {ImageWithProductBlock} from './imageWithProduct'
import type {ProductModuleBlock} from './productModule'
import type {LookModuleBlock} from './lookModule'
import type {SetModuleBlock} from './setModule'
import type {RichTextBlock} from './richText'

export type PageBuilderBlock =
  | HeroCampaignBlock
  | CampaignImageVideoBlock
  | FeaturedSectionBlock
  | ImageWithProductBlock
  | ProductModuleBlock
  | LookModuleBlock
  | SetModuleBlock
  | RichTextBlock
  | {_key: string; _type: string} // forward-compat for any future block type
```

- [ ] **Step 3: Add GROQ branch in `home.ts`**

Inside the `pageBuilder[]{ … }` projection, after the `block.lookModule` branch, insert:

```groq
        _type == "block.setModule" => {
          title,
          layout,
          "sets": sets[]->{ ${bundleCardProjection} }
        },
```

- [ ] **Step 4: Create the SCSS**

```scss
// components/PageBuilder/blocks/SetModule/SetModule.module.scss
@use '../../../../styles/common/variables' as *;
@use '../../../../styles/common/tokens' as *;
@use '../../../../styles/mixins/mixins' as *;

.section {
  display: flex;
  flex-direction: column;
  gap: px(38);
  width: 100%;
  background: map-get($colors, 'lightgray-bg');
  padding: px(40) px(15);

  @include from(md) {
    padding: px(60) px(15);
  }
}

.title {
  margin: 0 px(15);
  font-family: $MonumentGrotesk;
  font-size: px(13);
  line-height: px(20);
  letter-spacing: 0.5px;
  color: map-get($colors, 'darker');
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: px(15);

  @include from(md) {
    grid-template-columns: repeat(4, 1fr);
    gap: px(20);
  }
}
```

- [ ] **Step 5: Create the component**

```tsx
// components/PageBuilder/blocks/SetModule/SetModule.tsx
import BundleCard from '../../BundleCard/BundleCard'
import type {SetModuleBlock} from '@/sanity/types'
import s from './SetModule.module.scss'

interface Props {
  block: SetModuleBlock
}

export default function SetModule({block}: Props) {
  const sets = block.sets ?? []
  if (sets.length === 0) return null

  return (
    <section className={s.section}>
      {block.title && <h2 className={s.title}>{block.title}</h2>}
      <div className={s.row}>
        {sets.map((set) => (
          <BundleCard key={set._id} bundle={set} kind="set" />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Wire dispatcher case**

In `components/PageBuilder/PageBuilder.tsx`, add `SetModuleBlock` to the type import line, add `import SetModule from './blocks/SetModule/SetModule'` near the others, and insert a case before `default`:

```tsx
          case 'block.setModule':
            return (
              <SetModule
                key={block._key}
                block={block as SetModuleBlock}
              />
            )
```

After this task the dispatcher renders all 7 page-builder block types (`heroCampaign`, `campaignImageVideo`, `featuredSection`, `imageWithProduct`, `productModule`, `lookModule`, `setModule`, `richText`).

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add sanity/types/objects/blocks/ sanity/queries/queries/home.ts components/PageBuilder/
git commit -m "Implement SetModule block (row-mini layout, grey background)"
```

---

### Task 4.7: Replace `<ImageWithProduct>` placeholder with real `<ProductCard>`

**Files:**
- Modify: `components/PageBuilder/blocks/ImageWithProduct/ImageWithProduct.tsx` (replace `ProductCell`)
- Modify: `sanity/queries/queries/home.ts` (extend `imageWithProduct.product` projection to include `compareAtPrice` and `tags` for the card)
- Modify: `sanity/types/objects/blocks/imageWithProduct.ts` (align `ImageWithProductProduct` with `ProductCardData`)

- [ ] **Step 1: Align the type with `ProductCardData`**

Open `sanity/types/objects/blocks/imageWithProduct.ts` and replace its contents with:

```ts
// sanity/types/objects/blocks/imageWithProduct.ts
import type {SanityImageRef} from './heroCampaign'
import type {ProductCardData} from '../cards'

export type ImageWithProductFeature = {
  image?: SanityImageRef
  title?: string
  url?: string
}

export type ImageWithProductBlock = {
  _key: string
  _type: 'block.imageWithProduct'
  feature?: ImageWithProductFeature
  product?: ProductCardData
  imagePosition?: 'left' | 'right'
}
```

(Removed: the inline `ImageWithProductProduct` type — we now reuse `ProductCardData`. Other types in `cards.ts` remain unchanged.)

- [ ] **Step 2: Update the GROQ projection in `home.ts`**

Open `sanity/queries/queries/home.ts`. The `block.imageWithProduct` branch currently projects 6 product fields directly. Replace that branch's `product` projection with the shared fragment so the data shape matches `ProductCardData` exactly:

Change:

```groq
        _type == "block.imageWithProduct" => {
          feature{
            image{
              ${image},
              "alt": alt
            },
            title,
            url
          },
          "product": product->{
            _id,
            "title": store.title,
            "handle": store.slug.current,
            "imageUrl": store.previewImageUrl,
            "price": store.priceRange.minVariantPrice,
            "compareAtPrice": store.priceRange.maxVariantPrice
          },
          imagePosition
        },
```

To:

```groq
        _type == "block.imageWithProduct" => {
          feature{
            image{
              ${image},
              "alt": alt
            },
            title,
            url
          },
          "product": product->{ ${productCardProjection} },
          imagePosition
        },
```

(Make sure `productCardProjection` is imported at the top of `home.ts`. It was added in Task 4.4.)

- [ ] **Step 3: Replace the inline `ProductCell` with `<ProductCard />`**

Open `components/PageBuilder/blocks/ImageWithProduct/ImageWithProduct.tsx` and replace its contents with:

```tsx
// components/PageBuilder/blocks/ImageWithProduct/ImageWithProduct.tsx
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import ProductCard from '../../ProductCard/ProductCard'
import type {
  ImageWithProductBlock,
  ImageWithProductFeature,
} from '@/sanity/types'
import s from './ImageWithProduct.module.scss'

interface Props {
  block: ImageWithProductBlock
}

function FeatureMedia({feature}: {feature: ImageWithProductFeature}) {
  if (!feature.image?.imageUrl) return null
  const w = feature.image.metadata?.dimensions?.width ?? 1440
  const h = feature.image.metadata?.dimensions?.height ?? 1920
  return (
    <LazyImage
      src={feature.image.imageUrl}
      alt={feature.image.alt ?? ''}
      width={w}
      height={h}
      className={s.mediaImg}
      wrapperClassName={s.media}
      priority
    />
  )
}

function FeatureCell({feature}: {feature: ImageWithProductFeature}) {
  const inner = (
    <>
      <FeatureMedia feature={feature} />
      {feature.title && <p className={s.title}>{feature.title}</p>}
    </>
  )

  if (!feature.url) {
    return <div className={s.featureCell}>{inner}</div>
  }
  if (feature.url.startsWith('/')) {
    return (
      <Link href={feature.url} className={s.featureCell}>
        {inner}
      </Link>
    )
  }
  return (
    <a
      href={feature.url}
      className={s.featureCell}
      target="_blank"
      rel="noopener noreferrer"
    >
      {inner}
    </a>
  )
}

export default function ImageWithProduct({block}: Props) {
  const {feature, product, imagePosition} = block
  if (!feature && !product) return null
  const sectionCls = `${s.section} ${imagePosition === 'right' ? s.imageRight : ''}`.trim()
  return (
    <section className={sectionCls}>
      {feature && <FeatureCell feature={feature} />}
      {product && (
        <div className={s.productCellWrap}>
          <ProductCard product={product} />
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Wrap the product side in a sized container**

Open `components/PageBuilder/blocks/ImageWithProduct/ImageWithProduct.module.scss`. Replace the `.productCell`, `.productImage`, `.productImageWrap`, `.productImageImg`, `.productInfo`, `.productTitle`, `.productPrice` rules (used by the old `ProductCell`) with a single `.productCellWrap` rule that controls only the column width — `<ProductCard />` brings its own internal styling:

```scss
.productCellWrap {
  width: px(199);

  @include from(md) {
    flex: 0 0 px(357);
    width: px(357);
    align-self: flex-start;
  }
}
```

Leave the rest of the file (`.section`, `.imageRight`, `.featureCell`, `.title`) untouched.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add sanity/types/objects/blocks/imageWithProduct.ts sanity/queries/queries/home.ts components/PageBuilder/blocks/ImageWithProduct/
git commit -m "Use ProductCard inside ImageWithProduct (drop placeholder ProductCell)"
```

---

### Task 4.8: Phase 4 verification + close

**Files:**
- Modify: `docs/superpowers/specs/2026-05-05-mikmax-arquitectura-mvp-design.md` (append close note)

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: clean for files added or modified in this phase. Pre-existing warnings elsewhere are fine.

- [ ] **Step 3: Build (best-effort)**

Run: `npm run build`
Expected: build completes. If it fails with `EACCES: permission denied` on `.next/server/...`, that's the same root-owned dev-server cache issue documented in Phase 3's close. Note in the report and proceed; it doesn't affect the code itself.

- [ ] **Step 4: Smoke test (best-effort)**

If the dev server can be started without the EACCES blocker, run `npm run dev` and verify on `http://localhost:3000/`:
- ProductModule renders 4 product cards in a grid (or 2 cols mobile).
- LookModule renders the look(s) in a row of cards.
- SetModule renders the set(s) on a grey-background row, including `colorLocked` text under each title.
- ImageWithProduct uses the same product card as ProductModule (no placeholder image+title+price strip).
- All cards link correctly: `/shop/product/<handle>`, `/looks/<slug>`, `/sets/<slug>` (404s are expected — those routes ship in L6 / L8).

If dev is blocked by env, skip and document.

- [ ] **Step 5: Append close-state note in the spec**

Open `docs/superpowers/specs/2026-05-05-mikmax-arquitectura-mvp-design.md` and append (replacing the date with today's date in `YYYY-MM-DD` format) just below the "Close de Phase 3" block:

```markdown
### Close de Phase 4 (YYYY-MM-DD)

Three product-driven home blocks + shared cards live on `feature/mvp-arquitectura`.
Typecheck and lint clean.

- `<PriceDisplay>` shared component (single price, range, compare-at strikethrough).
- `<ProductCard>` (default Figma variant) backed by `productCardProjection` GROQ fragment.
- `<BundleCard>` for both looks and sets (kind prop swaps the route prefix).
- `<ProductModule>` renders the manual-products or collection-sourced grid (grid-4col layout). Other layouts (`carousel`, `grid-mixed`) fall back to grid-4col for now.
- `<LookModule>` renders the `looks[]` references in a row (row-wide layout).
- `<SetModule>` renders the `sets[]` references in a row on a grey background, including `colorLocked` text per card (row-mini layout).
- `<ImageWithProduct>` no longer uses its inline placeholder; it composes `<ProductCard />` directly from the same projection.
- Known follow-ups: ProductCard `mini`/`hover`/`set` variants, `FichaButton`/`FichaModal` (quick-view), and the rest of the layout enums (carousel, grid-mixed, grid-2col, grid) deferred until needed.
```

- [ ] **Step 6: Commit if doc was edited**

```bash
git add docs/superpowers/specs/2026-05-05-mikmax-arquitectura-mvp-design.md
git commit -m "Document Phase 4 close state"
```

---

## Self-Review Checklist (run before handing off)

**Spec coverage (Phase 4, spec §10 L4):**
- ✅ `<ProductCard>` (default variant) → Task 4.2. Other variants intentionally deferred — documented in plan intro.
- ✅ `<PriceDisplay>` → Task 4.1.
- ⚠️ `<FichaButton>` + `<FichaModal>` deferred (no current home module triggers a quick-view; documented).
- ✅ `<ProductModule>` block → Task 4.4.
- ✅ `<LookModule>` block → Task 4.5.
- ✅ `<SetModule>` block → Task 4.6.
- ✅ Wired into the home dispatcher (3 new cases).
- ✅ ImageWithProduct uses real `<ProductCard />` (Task 4.7).

**Placeholder scan:** No "TBD"/"TODO"/"implement later" text. Every step has runnable code or commands.

**Type/method consistency:**
- `ProductCardData` is defined in Task 4.2 and reused as the shape of: `ProductModuleBlock.products`, `ImageWithProductBlock.product`, and the `<ProductCard>` `product` prop. Same shape end-to-end.
- `BundleCardData` defined in Task 4.2 and reused by `LookModuleBlock.looks` and `SetModuleBlock.sets`, plus the `<BundleCard>` `bundle` prop.
- `productCardProjection` and `bundleCardProjection` are defined once in `sanity/queries/fragments/cards.ts` and consumed by Tasks 4.4, 4.5, 4.6, 4.7.
- `BundleCard` discriminator (`kind: 'look' | 'set'`) cleanly separates the route prefixes (`/looks/<slug>` vs `/sets/<slug>`).
- `PageBuilderBlock` union grows monotonically: each task adds one type and removes the corresponding mention from the forward-compat fallback comment.

**Out of scope (stays out):** Cart drawer, MobileMenu enhancements, Search wiring, Shop listing, PDP, Lookbook listing, Set listing, ProductGallery, VariantSelector.

---

## Phase 4 Done Criteria

```
□ npm run typecheck passes
□ npm run lint clean for new files in components/PageBuilder/{ProductCard,BundleCard,PriceDisplay,blocks/ProductModule,blocks/LookModule,blocks/SetModule}
□ Home (/) renders all 4 populated module types (HeroCampaign, CampaignImageVideo, ImageWithProduct, FeaturedSection) plus any of ProductModule/LookModule/SetModule that are populated
□ ProductModule manual mode renders manualProducts as cards
□ LookModule renders looks[] as bundle cards with title + priceFixed
□ SetModule renders sets[] as bundle cards with title + colorLocked + priceFixed
□ ImageWithProduct renders the product side via <ProductCard /> (same component used elsewhere)
□ Cards link to their (currently 404) PDP routes correctly
□ PageBuilder dispatcher returns null silently for any unknown block type via the `default` arm
```

---

## Phase 5 onwards

Phase 5 (Day L5) plan will be written **after** Phase 4 closes. Per spec §10:
`/shop`, `/shop/[category]`. `<ProductGrid>` (Vista 1+3). `<Breadcrumb>`. `<FilterDrawer>` + `<FilterModal>` (categoría, color, talla, precio). Sync URL params.

The `<ProductCard>` built in Phase 4 is the building block; Phase 5 just composes it into the listing page.
