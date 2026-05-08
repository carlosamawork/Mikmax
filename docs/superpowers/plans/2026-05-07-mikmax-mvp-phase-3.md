# Mikmax MVP — Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the Sanity-driven Home page through a `<PageBuilder>` dispatcher that maps each `_type` to a server component. Ship 4 of the 5 server-side blocks from spec §10 L3 (`block.heroCampaign`, `block.campaignImageVideo`, `block.featuredSection`, `block.richText`); the 5th — `block.bannerDescuento` — was already retired during Phase 2 (now lives as the `AnnouncementBanner` in Settings).

**Architecture:**
- `getHome()` projects the `pageBuilder` array with one GROQ branch per `_type`, resolving Sanity image refs (via the existing `image` fragment) and returning a typed array.
- `<PageBuilder>` is a server component with a `switch (block._type)` dispatcher: known blocks render their server component, unknown blocks return `null` (forward-compatible with `productModule`/`lookModule`/`setModule` planned for L4).
- A shared `<PortableText>` renderer handles all rich-text rendering: heading styles, lists, the `textBlack`/`textGray` decorators added in Phase 2, and the three annotation types (`annotationProduct`, `annotationLinkExternal`, `annotationLinkEmail`).
- Block components live in `components/PageBuilder/blocks/<Name>/` co-located with their `.module.scss`. Each is mobile-first per the existing project rule, using `$MonumentGrotesk` and the `from()` mixin.

**Tech stack:** Next.js 15 App Router (server components), TypeScript strict, SCSS modules, `@portabletext/react@^3.2.4` (already installed), `next-sanity` GROQ client, `LazyImage` from `@/components/Common`.

**Out of scope (deferred to L4):** `ProductCard`, `ProductModule`, `LookModule`, `SetModule`, `<HeroHome>` (deprecated, removed), pagination/scroll, animations.

---

## File Structure (Phase 3)

### Types (Sanity → frontend)

- `sanity/types/objects/blocks/heroCampaign.ts` — `HeroCampaignSlide`, `HeroCampaignBlock`
- `sanity/types/objects/blocks/campaignImageVideo.ts` — `CampaignImageVideoBlock`
- `sanity/types/objects/blocks/featuredSection.ts` — `FeaturedSectionBlock`
- `sanity/types/objects/blocks/richText.ts` — `RichTextBlock`
- `sanity/types/objects/blocks/index.ts` — barrel + `PageBuilderBlock` union
- `sanity/types/objects/index.ts` — export `./blocks`
- `sanity/types/singletons/home.ts` — add `pageBuilder?: PageBuilderBlock[]` to `HomeData`

### GROQ

- `sanity/queries/queries/home.ts` — replace stub `pageBuilder` with full projection

### Components

- `components/PageBuilder/index.ts` — barrel export
- `components/PageBuilder/PageBuilder.tsx` — server dispatcher
- `components/PageBuilder/PortableText/PortableText.tsx` — shared renderer
- `components/PageBuilder/PortableText/PortableText.module.scss`
- `components/PageBuilder/blocks/HeroCampaign/HeroCampaign.tsx`
- `components/PageBuilder/blocks/HeroCampaign/HeroCampaign.module.scss`
- `components/PageBuilder/blocks/CampaignImageVideo/CampaignImageVideo.tsx`
- `components/PageBuilder/blocks/CampaignImageVideo/CampaignImageVideo.module.scss`
- `components/PageBuilder/blocks/RichText/RichText.tsx`
- `components/PageBuilder/blocks/RichText/RichText.module.scss`
- `components/PageBuilder/blocks/FeaturedSection/FeaturedSection.tsx`
- `components/PageBuilder/blocks/FeaturedSection/FeaturedSection.module.scss`

### Page

- `app/(frontend)/page.tsx` — drop `<Landing />`, mount `<PageBuilder>` + `getHome()`

### Spec

- `docs/superpowers/specs/2026-05-05-mikmax-arquitectura-mvp-design.md` — append "Close de Phase 3 (YYYY-MM-DD)" note in §12

---

## Phase 3 — Day L3

### Task 3.1: Add TypeScript types for the 4 page-builder blocks

**Files:**
- Create: `sanity/types/objects/blocks/heroCampaign.ts`
- Create: `sanity/types/objects/blocks/campaignImageVideo.ts`
- Create: `sanity/types/objects/blocks/featuredSection.ts`
- Create: `sanity/types/objects/blocks/richText.ts`
- Create: `sanity/types/objects/blocks/index.ts`
- Modify: `sanity/types/objects/index.ts`
- Modify: `sanity/types/singletons/home.ts`

- [ ] **Step 1: Create `heroCampaign.ts`**

```ts
// sanity/types/objects/blocks/heroCampaign.ts
import type {PortableTextBlock} from '@portabletext/types'

export type SanityImageRef = {
  imageUrl?: string
  alt?: string
  caption?: string
  ref?: string
  hotspot?: {x: number; y: number; height: number; width: number}
  crop?: {top: number; right: number; bottom: number; left: number}
  metadata?: {dimensions?: {width: number; height: number; aspectRatio?: number}}
  filename?: string
}

export type SanityVideo = {
  src?: string
  posterAlt?: string
  poster?: SanityImageRef
}

export type HeroCampaignSlide = {
  _key: string
  mediaType?: 'image' | 'video'
  image?: SanityImageRef
  video?: SanityVideo
  title?: string
  url?: string
}

export type HeroCampaignBlock = {
  _key: string
  _type: 'block.heroCampaign'
  slides?: HeroCampaignSlide[]
}

export type {PortableTextBlock}
```

- [ ] **Step 2: Create `campaignImageVideo.ts`**

```ts
// sanity/types/objects/blocks/campaignImageVideo.ts
import type {SanityImageRef, SanityVideo} from './heroCampaign'

export type CampaignAspectRatio = '16:9' | '4:5' | '1:1' | '3:4' | '21:9'

export type CampaignImageVideoBlock = {
  _key: string
  _type: 'block.campaignImageVideo'
  mediaType?: 'image' | 'video'
  image?: SanityImageRef
  video?: SanityVideo
  headline?: string
  url?: string
  aspectRatio?: CampaignAspectRatio
  fullBleed?: boolean
}
```

- [ ] **Step 3: Create `featuredSection.ts`**

```ts
// sanity/types/objects/blocks/featuredSection.ts
import type {PortableTextBlock, SanityImageRef} from './heroCampaign'

export type FeaturedSectionCta = {
  label?: string
  url?: string
}

export type FeaturedSectionBlock = {
  _key: string
  _type: 'block.featuredSection'
  image?: SanityImageRef
  headline?: string
  body?: PortableTextBlock[]
  cta?: FeaturedSectionCta
  mediaPosition?: 'left' | 'right'
}
```

- [ ] **Step 4: Create `richText.ts`**

```ts
// sanity/types/objects/blocks/richText.ts
import type {PortableTextBlock} from './heroCampaign'

export type RichTextBlock = {
  _key: string
  _type: 'block.richText'
  body?: PortableTextBlock[]
}
```

- [ ] **Step 5: Create barrel `blocks/index.ts`**

```ts
// sanity/types/objects/blocks/index.ts
export * from './heroCampaign'
export * from './campaignImageVideo'
export * from './featuredSection'
export * from './richText'

import type {HeroCampaignBlock} from './heroCampaign'
import type {CampaignImageVideoBlock} from './campaignImageVideo'
import type {FeaturedSectionBlock} from './featuredSection'
import type {RichTextBlock} from './richText'

export type PageBuilderBlock =
  | HeroCampaignBlock
  | CampaignImageVideoBlock
  | FeaturedSectionBlock
  | RichTextBlock
  | {_key: string; _type: string} // forward-compat for unimplemented types (productModule, lookModule, setModule)
```

- [ ] **Step 6: Re-export from `objects/index.ts`**

Open `sanity/types/objects/index.ts` and append:

```ts
export * from './blocks'
```

- [ ] **Step 7: Add `pageBuilder` to `HomeData`**

Open `sanity/types/singletons/home.ts`. If it doesn't exist, create it. If it does, ensure it looks like:

```ts
// sanity/types/singletons/home.ts
import type {SEO} from '../objects/seo'
import type {PageBuilderBlock} from '../objects/blocks'

export type HomeData = {
  _id?: string
  pageBuilder?: PageBuilderBlock[]
  seo?: SEO
}
```

If the file already exists, only add the `pageBuilder?:` line and the import for `PageBuilderBlock`.

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (`PageBuilderBlock` should be importable.)

- [ ] **Step 9: Commit**

```bash
git add sanity/types/objects/blocks/ sanity/types/objects/index.ts sanity/types/singletons/home.ts
git commit -m "Add TS types for page-builder blocks"
```

---

### Task 3.2: Project the `pageBuilder` array in `getHome()`

**Files:**
- Modify: `sanity/queries/queries/home.ts`

- [ ] **Step 1: Replace the stub query**

Open `sanity/queries/queries/home.ts` and replace its contents with:

```ts
// sanity/queries/queries/home.ts
import {groq} from 'next-sanity'
import {client} from '..'
import type {HomeData} from '@/sanity/types'
import {seo} from '../fragments/seo'
import {image} from '../fragments/image'

// Projection for one image+video slot (used by heroCampaign and campaignImageVideo)
const mediaProjection = `
  mediaType,
  image{
    ${image},
    "alt": alt
  },
  video{
    src,
    posterAlt,
    poster{
      ${image}
    }
  }
`

export async function getHome(): Promise<HomeData> {
  const result = await client.fetch<HomeData | null>(
    groq`*[_type == "home"][0]{
      _id,
      pageBuilder[]{
        _key,
        _type,
        _type == "block.heroCampaign" => {
          slides[]{
            _key,
            ${mediaProjection},
            title,
            url
          }
        },
        _type == "block.campaignImageVideo" => {
          ${mediaProjection},
          headline,
          url,
          aspectRatio,
          fullBleed
        },
        _type == "block.featuredSection" => {
          image{
            ${image},
            "alt": alt
          },
          headline,
          body,
          cta{
            label,
            url
          },
          mediaPosition
        },
        _type == "block.richText" => {
          body
        }
      }
    }`,
    {},
    {next: {tags: ['home'], revalidate: 3600}},
  )
  return result ?? {}
}

export async function getHomeSEO() {
  return client.fetch(
    groq`*[_type == "home"][0]{
      seo{
        ${seo}
      }
    }`,
    {},
    {next: {tags: ['home'], revalidate: 3600}},
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add sanity/queries/queries/home.ts
git commit -m "Project pageBuilder array with per-_type GROQ branches"
```

---

### Task 3.3: Create the `<PageBuilder>` server dispatcher

**Files:**
- Create: `components/PageBuilder/PageBuilder.tsx`
- Create: `components/PageBuilder/index.ts`

- [ ] **Step 1: Create the dispatcher**

```tsx
// components/PageBuilder/PageBuilder.tsx
import type {PageBuilderBlock} from '@/sanity/types'

interface PageBuilderProps {
  blocks?: PageBuilderBlock[]
}

export default function PageBuilder({blocks}: PageBuilderProps) {
  if (!blocks?.length) return null

  return (
    <>
      {blocks.map((block) => {
        switch (block._type) {
          // Block components are wired in Tasks 3.6–3.9.
          // Until then every case returns null so the home renders empty
          // but does not crash with populated data.
          case 'block.heroCampaign':
          case 'block.campaignImageVideo':
          case 'block.featuredSection':
          case 'block.richText':
          default:
            return null
        }
      })}
    </>
  )
}
```

- [ ] **Step 2: Create barrel**

```ts
// components/PageBuilder/index.ts
export {default as PageBuilder} from './PageBuilder'
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/PageBuilder/
git commit -m "Add PageBuilder dispatcher scaffolding"
```

---

### Task 3.4: Wire `<PageBuilder>` into the home route

**Files:**
- Modify: `app/(frontend)/page.tsx`

- [ ] **Step 1: Convert the page to async + replace `<Landing>` with the dispatcher**

The current `app/(frontend)/page.tsx` is a sync default export rendering `<Landing />` plus three JSON-LD `<script>` tags. Make these surgical edits and leave everything else (the `revalidate` constant, the `generateMetadata` function, and the three JSON-LD schema constants — `organizationSchema`, `webSiteSchema`, `webPageSchema` — including their existing `<script>` tags) untouched:

1. Add at the top of the file, after the `import` for `seoHelper`:

```ts
import {PageBuilder} from '@/components/PageBuilder'
import {getHome} from '@/sanity/queries/queries/home'
```

2. Remove the existing `import Landing from '@/components/Landing'` line.

3. Change the function signature from:

```tsx
export default function Home() {
```

to:

```tsx
export default async function Home() {
  const data = await getHome()
```

4. In the returned JSX, leave the three JSON-LD `<script>` tags as they were and replace the `<Landing />` line with:

```tsx
      <PageBuilder blocks={data?.pageBuilder} />
```

5. Update the `organizationSchema.logo` field — currently it points to `buildUrl('/mikmax-logo.svg')` (a leftover from the old logo). Change it to:

```ts
  logo: buildUrl('/icons/mikmax.svg'),
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Smoke test**

Run: `npm run dev`. Open `http://localhost:3000/`.
Expected: page loads. Header + announcement banner + footer visible. The body between header and footer is empty (PageBuilder renders `null` for every block type until Tasks 3.6–3.9 wire them up). No console errors.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/\(frontend\)/page.tsx
git commit -m "Replace Landing placeholder with PageBuilder + getHome"
```

---

### Task 3.5: Build the shared `<PortableText>` renderer

**Files:**
- Create: `components/PageBuilder/PortableText/PortableText.tsx`
- Create: `components/PageBuilder/PortableText/PortableText.module.scss`

- [ ] **Step 1: Create the SCSS module**

```scss
// components/PageBuilder/PortableText/PortableText.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.root {
  font-family: $MonumentGrotesk;
  font-size: px(13);
  line-height: px(17);
  letter-spacing: 0.5px;
  color: map-get($colors, 'darker');

  p {
    margin: 0 0 px(8);
    &:last-child { margin-bottom: 0; }
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: $MonumentGrotesk;
    font-weight: 400;
    line-height: 1.1;
    letter-spacing: -0.01em;
    margin: px(24) 0 px(8);
    &:first-child { margin-top: 0; }
  }

  h1 { font-size: px(40); }
  h2 { font-size: px(32); }
  h3 { font-size: px(24); }
  h4 { font-size: px(20); }
  h5 { font-size: px(16); }
  h6 { font-size: px(13); }

  ul, ol {
    margin: 0 0 px(8);
    padding-left: px(20);
  }

  blockquote {
    margin: px(16) 0;
    padding-left: px(16);
    border-left: 2px solid map-get($colors, 'lightgray-bg');
    color: map-get($colors, 'darker');
  }

  a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
    &:hover { text-decoration-thickness: 2px; }
  }

  strong { font-weight: 600; }
  em { font-style: italic; }
}

.textBlack { color: #000; }
.textGray { color: map-get($colors, 'gray'); }
```

- [ ] **Step 2: Create the renderer**

```tsx
// components/PageBuilder/PortableText/PortableText.tsx
import {PortableText as RawPortableText, type PortableTextComponents} from '@portabletext/react'
import type {PortableTextBlock} from '@portabletext/types'
import Link from 'next/link'
import s from './PortableText.module.scss'

interface Props {
  value?: PortableTextBlock[]
  className?: string
}

const components: PortableTextComponents = {
  marks: {
    textBlack: ({children}) => <span className={s.textBlack}>{children}</span>,
    textGray: ({children}) => <span className={s.textGray}>{children}</span>,
    annotationLinkExternal: ({value, children}) => (
      <a
        href={value?.url ?? '#'}
        target={value?.newWindow ? '_blank' : undefined}
        rel={value?.newWindow ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),
    annotationLinkEmail: ({value, children}) => (
      <a href={value?.email ? `mailto:${value.email}` : '#'}>{children}</a>
    ),
    annotationProduct: ({value, children}) => {
      const handle = value?.productWithVariant?.product?.store?.slug?.current
      if (!handle) return <>{children}</>
      return <Link href={`/shop/product/${handle}`}>{children}</Link>
    },
  },
}

export default function PortableText({value, className}: Props) {
  if (!value?.length) return null
  return (
    <div className={`${s.root} ${className ?? ''}`.trim()}>
      <RawPortableText value={value} components={components} />
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/PageBuilder/PortableText/
git commit -m "Add shared PortableText renderer with color marks and link annotations"
```

---

### Task 3.6: Build the `<HeroCampaign>` block

**Files:**
- Create: `components/PageBuilder/blocks/HeroCampaign/HeroCampaign.tsx`
- Create: `components/PageBuilder/blocks/HeroCampaign/HeroCampaign.module.scss`
- Modify: `components/PageBuilder/PageBuilder.tsx`

- [ ] **Step 1: Create the SCSS module**

```scss
// components/PageBuilder/blocks/HeroCampaign/HeroCampaign.module.scss
@use '../../../../styles/common/variables' as *;
@use '../../../../styles/common/tokens' as *;
@use '../../../../styles/mixins/mixins' as *;

.hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  width: 100%;

  @include from(md) {
    &.cols2 { grid-template-columns: 1fr 1fr; }
  }
}

.slide {
  position: relative;
  display: block;
  overflow: hidden;
  background: map-get($colors, 'gray');
  aspect-ratio: 720 / 960;
}

.media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.mediaImg, .mediaVideo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.title {
  position: absolute;
  left: px(15);
  bottom: px(15);
  margin: 0;
  font-family: $MonumentGrotesk;
  font-size: px(13);
  line-height: px(20);
  letter-spacing: 0.5px;
  color: map-get($colors, 'white');
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
  z-index: 1;
}
```

- [ ] **Step 2: Create the component**

```tsx
// components/PageBuilder/blocks/HeroCampaign/HeroCampaign.tsx
import Link from 'next/link'
import {LazyImage, LazyVideo} from '@/components/Common'
import type {HeroCampaignBlock, HeroCampaignSlide} from '@/sanity/types'
import s from './HeroCampaign.module.scss'

interface Props {
  block: HeroCampaignBlock
}

function SlideMedia({slide}: {slide: HeroCampaignSlide}) {
  if (slide.mediaType === 'video' && slide.video?.src) {
    return (
      <LazyVideo
        src={slide.video.src}
        poster={slide.video.poster?.imageUrl}
        posterAlt={slide.video.posterAlt}
        className={s.media}
        autoPlay
        muted
        loop
        playsInline
      />
    )
  }
  if (slide.image?.imageUrl) {
    const w = slide.image.metadata?.dimensions?.width ?? 1440
    const h = slide.image.metadata?.dimensions?.height ?? 1920
    return (
      <LazyImage
        src={slide.image.imageUrl}
        alt={slide.image.alt ?? ''}
        width={w}
        height={h}
        className={s.mediaImg}
        wrapperClassName={s.media}
        priority
      />
    )
  }
  return null
}

function Slide({slide}: {slide: HeroCampaignSlide}) {
  const inner = (
    <>
      <SlideMedia slide={slide} />
      {slide.title && <p className={s.title}>{slide.title}</p>}
    </>
  )

  if (!slide.url) {
    return <div className={s.slide}>{inner}</div>
  }
  if (slide.url.startsWith('/')) {
    return (
      <Link href={slide.url} className={s.slide}>
        {inner}
      </Link>
    )
  }
  return (
    <a href={slide.url} className={s.slide} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  )
}

export default function HeroCampaign({block}: Props) {
  const slides = block.slides ?? []
  if (slides.length === 0) return null
  const cols = slides.length >= 2 ? s.cols2 : ''
  return (
    <section className={`${s.hero} ${cols}`.trim()}>
      {slides.slice(0, 2).map((slide) => (
        <Slide key={slide._key} slide={slide} />
      ))}
    </section>
  )
}
```

- [ ] **Step 3: Wire into the dispatcher**

Open `components/PageBuilder/PageBuilder.tsx` and replace its contents with:

```tsx
import type {PageBuilderBlock, HeroCampaignBlock} from '@/sanity/types'
import HeroCampaign from './blocks/HeroCampaign/HeroCampaign'

interface PageBuilderProps {
  blocks?: PageBuilderBlock[]
}

export default function PageBuilder({blocks}: PageBuilderProps) {
  if (!blocks?.length) return null

  return (
    <>
      {blocks.map((block) => {
        switch (block._type) {
          case 'block.heroCampaign':
            return <HeroCampaign key={block._key} block={block as HeroCampaignBlock} />
          case 'block.campaignImageVideo':
          case 'block.featuredSection':
          case 'block.richText':
          default:
            return null
        }
      })}
    </>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Smoke test**

Run: `npm run dev`. Open `http://localhost:3000/`.
Expected: the home shows the HeroCampaign you populated in Sanity (one or two slides side by side, each with title overlay bottom-left, clickable if URL set). Compare visually with Figma `11:1990` (desktop) and `11:2095` (mobile). Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add components/PageBuilder/
git commit -m "Implement HeroCampaign block (1–2 slides, image/video, title overlay, link)"
```

---

### Task 3.7: Build the `<CampaignImageVideo>` block

**Files:**
- Create: `components/PageBuilder/blocks/CampaignImageVideo/CampaignImageVideo.tsx`
- Create: `components/PageBuilder/blocks/CampaignImageVideo/CampaignImageVideo.module.scss`
- Modify: `components/PageBuilder/PageBuilder.tsx`

- [ ] **Step 1: Create the SCSS module**

```scss
// components/PageBuilder/blocks/CampaignImageVideo/CampaignImageVideo.module.scss
@use '../../../../styles/common/variables' as *;
@use '../../../../styles/common/tokens' as *;
@use '../../../../styles/mixins/mixins' as *;

.wrap {
  position: relative;
  width: 100%;
  display: block;

  &.bleed { /* 100% width already */ }
  &.contained {
    padding: px(50) px(15);
    @include from(md) {
      padding: px(80) px(30);
    }
  }
}

.media {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: map-get($colors, 'gray');
}

.r-16-9 { aspect-ratio: 16 / 9; }
.r-4-5 { aspect-ratio: 4 / 5; }
.r-1-1 { aspect-ratio: 1 / 1; }
.r-3-4 { aspect-ratio: 3 / 4; }
.r-21-9 { aspect-ratio: 21 / 9; }

.img, .video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.headline {
  position: absolute;
  left: px(15);
  bottom: px(15);
  margin: 0;
  font-family: $MonumentGrotesk;
  font-size: px(13);
  line-height: px(17);
  letter-spacing: 0.5px;
  color: map-get($colors, 'white');
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
}
```

- [ ] **Step 2: Create the component**

```tsx
// components/PageBuilder/blocks/CampaignImageVideo/CampaignImageVideo.tsx
import Link from 'next/link'
import {LazyImage, LazyVideo} from '@/components/Common'
import type {CampaignImageVideoBlock} from '@/sanity/types'
import s from './CampaignImageVideo.module.scss'

interface Props {
  block: CampaignImageVideoBlock
}

const ratioClass: Record<string, string> = {
  '16:9': 'r-16-9',
  '4:5': 'r-4-5',
  '1:1': 'r-1-1',
  '3:4': 'r-3-4',
  '21:9': 'r-21-9',
}

export default function CampaignImageVideo({block}: Props) {
  const ratio = block.aspectRatio ?? '16:9'
  const ratioCls = s[ratioClass[ratio]] ?? s['r-16-9']
  const wrapCls = block.fullBleed ? s.bleed : s.contained

  const media = (() => {
    if (block.mediaType === 'video' && block.video?.src) {
      return (
        <LazyVideo
          src={block.video.src}
          poster={block.video.poster?.imageUrl}
          posterAlt={block.video.posterAlt}
          className={s.video}
          autoPlay
          muted
          loop
          playsInline
        />
      )
    }
    if (block.image?.imageUrl) {
      const w = block.image.metadata?.dimensions?.width ?? 1440
      const h = block.image.metadata?.dimensions?.height ?? 810
      return (
        <LazyImage
          src={block.image.imageUrl}
          alt={block.image.alt ?? ''}
          width={w}
          height={h}
          className={s.img}
        />
      )
    }
    return null
  })()

  const inner = (
    <div className={`${s.media} ${ratioCls}`}>
      {media}
      {block.headline && <p className={s.headline}>{block.headline}</p>}
    </div>
  )

  if (!block.url) {
    return <section className={`${s.wrap} ${wrapCls}`}>{inner}</section>
  }
  if (block.url.startsWith('/')) {
    return (
      <section className={`${s.wrap} ${wrapCls}`}>
        <Link href={block.url}>{inner}</Link>
      </section>
    )
  }
  return (
    <section className={`${s.wrap} ${wrapCls}`}>
      <a href={block.url} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    </section>
  )
}
```

- [ ] **Step 3: Wire into the dispatcher**

In `components/PageBuilder/PageBuilder.tsx`, add the import at the top:

```tsx
import CampaignImageVideo from './blocks/CampaignImageVideo/CampaignImageVideo'
```

And add `CampaignImageVideoBlock` to the existing type import line:

```tsx
import type {PageBuilderBlock, HeroCampaignBlock, CampaignImageVideoBlock} from '@/sanity/types'
```

Then replace the line `case 'block.campaignImageVideo':` (which currently falls through to `default`) with:

```tsx
          case 'block.campaignImageVideo':
            return (
              <CampaignImageVideo
                key={block._key}
                block={block as CampaignImageVideoBlock}
              />
            )
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Smoke test**

Run: `npm run dev`. Open `/`. Verify any `campaignImageVideo` block you populated renders with its aspect ratio and headline. Stop dev.

- [ ] **Step 6: Commit**

```bash
git add components/PageBuilder/
git commit -m "Implement CampaignImageVideo block (image/video + aspect ratio + url)"
```

---

### Task 3.8: Build the `<RichText>` block

**Files:**
- Create: `components/PageBuilder/blocks/RichText/RichText.tsx`
- Create: `components/PageBuilder/blocks/RichText/RichText.module.scss`
- Modify: `components/PageBuilder/PageBuilder.tsx`

- [ ] **Step 1: Create the SCSS module**

```scss
// components/PageBuilder/blocks/RichText/RichText.module.scss
@use '../../../../styles/common/variables' as *;
@use '../../../../styles/common/tokens' as *;
@use '../../../../styles/mixins/mixins' as *;

.section {
  width: 100%;
  padding: px(50) px(15);
  max-width: px(800);
  margin: 0 auto;

  @include from(md) {
    padding: px(80) px(30);
  }
}
```

- [ ] **Step 2: Create the component**

```tsx
// components/PageBuilder/blocks/RichText/RichText.tsx
import PortableText from '../../PortableText/PortableText'
import type {RichTextBlock} from '@/sanity/types'
import s from './RichText.module.scss'

interface Props {
  block: RichTextBlock
}

export default function RichText({block}: Props) {
  if (!block.body?.length) return null
  return (
    <section className={s.section}>
      <PortableText value={block.body} />
    </section>
  )
}
```

- [ ] **Step 3: Wire into the dispatcher**

In `components/PageBuilder/PageBuilder.tsx`, add the import:

```tsx
import RichText from './blocks/RichText/RichText'
```

And add `RichTextBlock` to the existing type import line.

Replace `case 'block.richText':` (currently fallthrough) with:

```tsx
          case 'block.richText':
            return <RichText key={block._key} block={block as RichTextBlock} />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Smoke test**

Run: `npm run dev`. Verify any populated `richText` block renders with proper typography. Confirm a fragment marked with the `Negro` decorator renders pure black, and `Gris` renders gray. Stop dev.

- [ ] **Step 6: Commit**

```bash
git add components/PageBuilder/
git commit -m "Implement RichText block (PortableText with color marks)"
```

---

### Task 3.9: Build the `<FeaturedSection>` block

**Files:**
- Create: `components/PageBuilder/blocks/FeaturedSection/FeaturedSection.tsx`
- Create: `components/PageBuilder/blocks/FeaturedSection/FeaturedSection.module.scss`
- Modify: `components/PageBuilder/PageBuilder.tsx`

- [ ] **Step 1: Create the SCSS module**

```scss
// components/PageBuilder/blocks/FeaturedSection/FeaturedSection.module.scss
@use '../../../../styles/common/variables' as *;
@use '../../../../styles/common/tokens' as *;
@use '../../../../styles/mixins/mixins' as *;

.section {
  display: grid;
  grid-template-columns: 1fr;
  gap: px(20);
  padding: px(50) px(15);

  @include from(md) {
    grid-template-columns: 1fr 1fr;
    gap: px(40);
    padding: px(80) px(30);
    align-items: center;
  }
}

.right {
  @include from(md) {
    .copy { order: 1; }
    .media { order: 2; }
  }
}

.media {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: map-get($colors, 'gray');
}

.img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.copy {
  display: flex;
  flex-direction: column;
  gap: px(20);
}

.headline {
  margin: 0;
  font-family: $MonumentGrotesk;
  font-size: px(28);
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: map-get($colors, 'darker');

  @include from(md) {
    font-size: px(40);
  }
}

.cta {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  height: px(40);
  padding: 0 px(16);
  background: map-get($colors, 'darker');
  color: map-get($colors, 'white');
  font-family: $MonumentGrotesk;
  font-size: px(13);
  line-height: px(17);
  letter-spacing: 0.5px;
  text-decoration: none;
  border: 0;

  &:hover { opacity: 0.9; }
}
```

- [ ] **Step 2: Create the component**

```tsx
// components/PageBuilder/blocks/FeaturedSection/FeaturedSection.tsx
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import PortableText from '../../PortableText/PortableText'
import type {FeaturedSectionBlock} from '@/sanity/types'
import s from './FeaturedSection.module.scss'

interface Props {
  block: FeaturedSectionBlock
}

function Cta({label, url}: {label?: string; url?: string}) {
  if (!label || !url) return null
  if (url.startsWith('/')) {
    return (
      <Link href={url} className={s.cta}>
        {label}
      </Link>
    )
  }
  return (
    <a href={url} className={s.cta} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  )
}

export default function FeaturedSection({block}: Props) {
  const sectionCls = `${s.section} ${block.mediaPosition === 'right' ? s.right : ''}`.trim()
  return (
    <section className={sectionCls}>
      <div className={s.media}>
        {block.image?.imageUrl && (
          <LazyImage
            src={block.image.imageUrl}
            alt={block.image.alt ?? ''}
            width={block.image.metadata?.dimensions?.width ?? 1200}
            height={block.image.metadata?.dimensions?.height ?? 1500}
            className={s.img}
          />
        )}
      </div>
      <div className={s.copy}>
        {block.headline && <h2 className={s.headline}>{block.headline}</h2>}
        {block.body?.length ? <PortableText value={block.body} /> : null}
        <Cta label={block.cta?.label} url={block.cta?.url} />
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Wire into the dispatcher**

In `components/PageBuilder/PageBuilder.tsx`, add the import:

```tsx
import FeaturedSection from './blocks/FeaturedSection/FeaturedSection'
```

And add `FeaturedSectionBlock` to the existing type import line.

Replace `case 'block.featuredSection':` (currently fallthrough) with:

```tsx
          case 'block.featuredSection':
            return (
              <FeaturedSection
                key={block._key}
                block={block as FeaturedSectionBlock}
              />
            )
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Smoke test**

Run: `npm run dev`. Verify any `featuredSection` block renders with image side-by-side with copy + CTA on desktop and stacked on mobile. Toggle `mediaPosition` between `left` and `right` in Sanity to confirm the order swap. Stop dev.

- [ ] **Step 6: Commit**

```bash
git add components/PageBuilder/
git commit -m "Implement FeaturedSection block (image + copy + CTA, mediaPosition L/R)"
```

---

### Task 3.10: Phase 3 verification + close

**Files:**
- Modify: `docs/superpowers/specs/2026-05-05-mikmax-arquitectura-mvp-design.md`

- [ ] **Step 1: Build the project**

Run: `npm run build`
Expected: build completes cleanly. The home page (`/`) prerenders without errors.

- [ ] **Step 2: TypeScript check**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: clean for the new files in `components/PageBuilder/`. Pre-existing lint warnings in unrelated files are fine.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`. On `/`:
- Resize to 1440 → all populated blocks render in their desktop layout (HeroCampaign 2-cols, FeaturedSection side-by-side).
- Resize to 375 → blocks stack (HeroCampaign 1-col, FeaturedSection image+copy stacked).
- Click a hero slide with a URL → navigates correctly.
- Reload while scrolled mid-page → no hydration mismatch warnings in console.

- [ ] **Step 5: Document the close state in the spec**

Open `docs/superpowers/specs/2026-05-05-mikmax-arquitectura-mvp-design.md` and append (replacing the date with today's date in `YYYY-MM-DD` format) just below the existing "Close de Phase 2" block:

```markdown
### Close de Phase 3 (YYYY-MM-DD)

PageBuilder dispatcher + 4 server-side blocks live on `feature/mvp-arquitectura`.
Typecheck and lint clean.

- `<PageBuilder>` server component dispatches `pageBuilder` array by `_type`.
- Block components: `HeroCampaign` (1–2 slides, image/video, title overlay, link), `CampaignImageVideo` (single media + headline + url + aspect ratio), `RichText` (PortableText with color decorators), `FeaturedSection` (image + copy + CTA, mediaPosition L/R).
- Shared `<PortableText>` renderer handles `textBlack`/`textGray` marks and the three annotation types (`annotationProduct`, `annotationLinkExternal`, `annotationLinkEmail`).
- Home (`app/(frontend)/page.tsx`) now consumes `getHome()` and renders `<PageBuilder>`; `<Landing>` placeholder removed from the route.
- Known follow-ups: `ProductModule`/`LookModule`/`SetModule` deferred to Phase 4 (need `<ProductCard>` first); `Landing` component still exists in `components/` but is unused — clean up at end of MVP.
```

- [ ] **Step 6: Commit if doc was edited**

```bash
git add docs/superpowers/specs/2026-05-05-mikmax-arquitectura-mvp-design.md
git commit -m "Document Phase 3 close state"
```

---

## Self-Review Checklist (run before handing off)

**Spec coverage (Phase 3, spec §10 L3):**
- ✅ "Reescribir `app/(frontend)/page.tsx` con `getHome()` + pageBuilder" → Task 3.4
- ✅ `BannerDescuento` removed from blocks list (was already moved to Settings → AnnouncementBanner during Phase 2; documented in this plan's intro)
- ✅ `HeroCampaign` → Task 3.6
- ✅ `CampaignImageVideo` → Task 3.7
- ✅ `FeaturedSection` → Task 3.9
- ✅ `RichText` → Task 3.8
- ✅ "PageBuilder dispatcher" → Task 3.3 (scaffold) + 3.6/3.7/3.8/3.9 (each task wires its case)
- ⚠️ `ProductModule`/`LookModule`/`SetModule` deliberately deferred to Phase 4 (require `<ProductCard>` from L4)

**Placeholder scan:** No "TBD"/"TODO"/"implement later" text in the plan. Every step has runnable code or commands.

**Type/method consistency:**
- `HeroCampaignBlock`, `CampaignImageVideoBlock`, `FeaturedSectionBlock`, `RichTextBlock` are defined in Task 3.1 and consumed by Tasks 3.6–3.9.
- `PortableTextBlock` is re-exported from `heroCampaign.ts` (single source) and consumed by `featuredSection.ts`, `richText.ts`, and `PortableText.tsx`.
- `SanityImageRef` and `SanityVideo` are defined once in `heroCampaign.ts` and reused by `campaignImageVideo.ts` and `featuredSection.ts`.
- The dispatcher in Task 3.3 uses `default: return null` and unimplemented cases fall through — Tasks 3.6/3.7/3.8/3.9 each replace one case in turn without restructuring the file.
- `getHome()` returns `Promise<HomeData>` (Task 3.2), home page reads `data?.pageBuilder` (Task 3.4), `PageBuilder` accepts `blocks?: PageBuilderBlock[]` (Task 3.3) — types align.

**Out of scope (stays out):** Cart drawer, MobileMenu enhancements, Search wiring, Shop listing, PDP, Lookbook listing, Set listing, ProductCard.

---

## Phase 3 Done Criteria

```
□ npm run build completes cleanly
□ npm run typecheck passes
□ npm run lint clean for new files in components/PageBuilder/
□ Home (/) renders all populated pageBuilder blocks
□ HeroCampaign supports 1 and 2 slides with image OR video
□ CampaignImageVideo respects aspectRatio and fullBleed
□ FeaturedSection swaps order based on mediaPosition L/R
□ RichText renders bullet/numbered lists, headings, and Negro/Gris color marks
□ PageBuilder dispatcher returns null silently for unknown block types
```

---

## Phase 4 onwards

Phase 4 (Day L4) plan will be written **after** Phase 3 closes. Scope per spec §10 L4:
`<ProductCard>` (4 variants), `<PriceDisplay>`, `<FichaButton>`, `<FichaModal>`, plus the three product-driven blocks (`ProductModule`, `LookModule`, `SetModule`). Once those exist, the dispatcher cases for `productModule`/`lookModule`/`setModule` are added in the same loop.
