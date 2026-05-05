# Mikmax MVP — Phase 1 + Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the schema + tokens foundation (Phase 1) and the layout chrome — Header/MegaMenu/MobileBottomNav/Footer/Newsletter (Phase 2) — needed for everything downstream.

**Architecture:** Sanity v3 page-builder schemas + new look/set documents + bundle component object. Layout chrome is server-first with thin client islands for interactivity (mega-menu hover, mobile bottom nav, newsletter form). All new SCSS uses the mobile-first `from()` mixin per CLAUDE.md.

**Tech Stack:** Next.js 15 (App Router) · Sanity v3 · TypeScript strict · SCSS Modules · graphql-request (Shopify Storefront, untouched in these phases) · sanity-plugin-orderable-document-list.

**Spec reference:** `docs/superpowers/specs/2026-05-05-mikmax-arquitectura-mvp-design.md` — Sections 4 (Schemas), 7.1–7.2 (Layout components), 8 (SCSS).

**Progressive plan:** This file covers Phase 1 (Day L1) and Phase 2 (Day L2) only. Phases 3–10 are written progressively as earlier ones complete.

---

## File Structure (Phases 1 + 2)

### Phase 1 — Setup + Schemas

**Modify:**
- `styles/main.scss` — add `@import 'common/tokens'`
- `styles/mixins/_mixins.scss` — add `from(bp)` mobile-first mixin
- `sanity/schemas/index.ts` — register new objects, blocks, documents
- `sanity/schemas/singletons/home.ts` — refactor to `pageBuilder`-only
- `sanity/schemas/documents/page.ts` — add `pageBuilder` array field
- `sanity/desk/index.ts` — register `look`/`set` in `hiddenDocTypes`

**Create:**
- `styles/common/_tokens.scss`
- `sanity/schemas/objects/bundle/bundleComponent.ts`
- `sanity/schemas/objects/blocks/bannerDescuento.ts`
- `sanity/schemas/objects/blocks/heroCampaign.ts`
- `sanity/schemas/objects/blocks/campaignImageVideo.ts`
- `sanity/schemas/objects/blocks/productModule.ts`
- `sanity/schemas/objects/blocks/lookModule.ts`
- `sanity/schemas/objects/blocks/setModule.ts`
- `sanity/schemas/objects/blocks/featuredSection.ts`
- `sanity/schemas/objects/blocks/richText.ts`
- `sanity/schemas/objects/blocks/index.ts` — re-export array of all blocks for reuse
- `sanity/schemas/documents/look.tsx`
- `sanity/schemas/documents/set.tsx`
- `sanity/desk/lookStructure.ts`
- `sanity/desk/setStructure.ts`

### Phase 2 — Layout chrome

**Modify:**
- `sanity/schemas/objects/global/menu.ts` — fix dangling reference to `menuLinks` (replace with concrete link types)
- `sanity/queries/common/settings.ts` — align field names (`menu` not `headerMenu`, `footer` not `footerMenu`)
- `sanity/queries/common/header.ts` — return shape from `settings.menu`
- `sanity/queries/common/footer.ts` — return shape from `settings.footer`
- `sanity/types/index.ts` (or create) — add `SettingsData`, `HeaderData`, `FooterData` types
- `app/(frontend)/layout.tsx` — render `<Header>` + `<Footer>` + `<MobileBottomNav>` + `<MobileMenu>` (placeholder until Phase 7)
- `styles/main.scss` (no change — confirm imports)

**Create:**
- `components/Layout/Header/Header.tsx` (server)
- `components/Layout/Header/Header.module.scss`
- `components/Layout/Header/HeaderClient.tsx` (client island for sticky/scroll state if needed)
- `components/Layout/MegaMenu/MegaMenu.tsx` (client)
- `components/Layout/MegaMenu/MegaMenu.module.scss`
- `components/Layout/MobileBottomNav/MobileBottomNav.tsx` (client)
- `components/Layout/MobileBottomNav/MobileBottomNav.module.scss`
- `components/Layout/Footer/Footer.tsx` (server)
- `components/Layout/Footer/Footer.module.scss`
- `components/Layout/Footer/NewsletterForm.tsx` (client)
- `components/Layout/Footer/NewsletterForm.module.scss`
- `components/Layout/index.ts` — barrel export
- `types/menu.ts`, `types/header.ts`, `types/footer.ts` — props types (frontend-side)

> **Note:** `Search` input in MobileMenu and the Cart slot in MobileMenu are **stubs** in Phase 2 — they get wired in Phases 7 and 9. The MobileMenu component itself is built in Phase 7 (alongside the cart drawer it shares).

---

## Phase 1 — Setup + Schemas (Day L1)

### Task 1.1: Add SCSS tokens file and `from()` mixin

**Files:**
- Create: `styles/common/_tokens.scss`
- Modify: `styles/mixins/_mixins.scss` (append `from()` mixin)
- Modify: `styles/main.scss` (add `@import 'common/tokens'`)

- [ ] **Step 1: Create `styles/common/_tokens.scss`**

```scss
// styles/common/_tokens.scss
// New token system layered on top of _variables.scss.
// All new components must use these tokens (CLAUDE.md mobile-first).

@use "sass:math";

// Spacing scale (8px base, mixed with 4 for fine grain)
$space-0:  0;
$space-1:  px(4);
$space-2:  px(8);
$space-3:  px(12);
$space-4:  px(16);
$space-5:  px(24);
$space-6:  px(32);
$space-7:  px(48);
$space-8:  px(64);
$space-9:  px(96);
$space-10: px(128);

// Z-index hierarchy — never hardcode numeric z-index in components
$z-base:           0;
$z-content:        1;
$z-sticky-header:  100;
$z-mobile-nav:     200;
$z-cart-drawer:    900;
$z-filter-drawer:  900;
$z-ficha-modal:    950;
$z-zoom-modal:     960;
$z-toast:          990;
$z-cookie-banner:  1000;

// Container widths
$container-mobile:  100%;
$container-tablet:  100%;
$container-desktop: px(1200);
$container-wide:    px(1440);
$gutter-mobile:     $space-4;
$gutter-desktop:    $space-6;

// Transitions (reuse $ease-* from _variables.scss)
$transition-fast:   200ms $ease-out-quad;
$transition-medium: 400ms $ease-out-quart;
$transition-slow:   600ms $ease-out-expo;
```

- [ ] **Step 2: Append `from()` mixin to `styles/mixins/_mixins.scss`**

Add at the bottom of the file (do not remove the existing `responsive()` mixin — legacy code still depends on it):

```scss
// Mobile-first mixin (CLAUDE.md compliant). Use this in ALL new components.
// Legacy `responsive()` (max-width) is kept only for components/Landing and
// components/Welcome until they get deleted at the end of the sprint.
@mixin from($bp) {
  @if      $bp == sm  { @media (min-width: 768px)  { @content; } }
  @else if $bp == md  { @media (min-width: 1024px) { @content; } }
  @else if $bp == lg  { @media (min-width: 1200px) { @content; } }
  @else if $bp == xl  { @media (min-width: 1440px) { @content; } }
  @else if $bp == xxl { @media (min-width: 1920px) { @content; } }
  @else               { @warn "from() supports: sm, md, lg, xl, xxl"; }
}
```

- [ ] **Step 3: Wire the new tokens partial in `styles/main.scss`**

Replace the file content (only adds one new line — keep existing imports order):

```scss
@charset 'UTF-8';

@import "mixins/mixins";

@import "common/reset";
@import "common/variables";
@import "common/tokens";

@import "common/typography";
@import "common/base";
@import "common/layout";
@import "common/fonts";
@import "common/helpers";
@import "common/link";
@import "common/forms";
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build completes without SCSS errors. (If there are unrelated TS errors that already existed, ignore them in this task.)

- [ ] **Step 5: Commit**

```bash
git add styles/common/_tokens.scss styles/mixins/_mixins.scss styles/main.scss
git commit -m "Add tokens partial and mobile-first from() mixin"
```

---

### Task 1.2: Verify Sanity Connect sync state

**Files:** None to modify. This is a verification task — without it, Phase 4 onwards may build on stale data.

- [ ] **Step 1: Open Sanity Studio**

Run: `npm run dev`
Expected: dev server starts; navigate to `http://localhost:3000/admin`.

- [ ] **Step 2: Confirm at least one synced product, one variant, one collection**

In Sanity Studio:
- Open `Products` list → ensure at least one product with `store.title`, `store.priceRange`, `store.variants` populated.
- Open `Collections` list → ensure at least one collection with `store.title`.
- Click any product → `Shopify sync` group should show data with `store.gid`, `store.handle`.

If no documents are present:
- Confirm Sanity Connect is installed in the Shopify admin (Apps).
- In Shopify Admin → Apps → Sanity Connect → Configure: ensure "Auto-publish to Sanity" is on for Products and Collections, and the connected dataset matches `NEXT_PUBLIC_SANITY_DATASET=production`.
- Trigger a manual sync (Save/republish a Shopify product).
- Wait 30–60s, refresh Studio.

- [ ] **Step 3: Document the sync state**

Append to `docs/superpowers/specs/2026-05-05-mikmax-arquitectura-mvp-design.md` (manual edit):
- Add a one-liner under section 12 (Riesgos) noting sync state at L1 (e.g. "Sync verified L1 — 47 products, 3 collections, 89 variants present").

- [ ] **Step 4: Commit (only if you edited the spec)**

```bash
git add docs/superpowers/specs/2026-05-05-mikmax-arquitectura-mvp-design.md
git commit -m "Document sync state at sprint start"
```

> Skip this commit if you didn't edit the spec.

---

### Task 1.3: Create `bundleComponent` object schema

**Files:**
- Create: `sanity/schemas/objects/bundle/bundleComponent.ts`
- Modify: `sanity/schemas/index.ts`

- [ ] **Step 1: Create the object schema**

```ts
// sanity/schemas/objects/bundle/bundleComponent.ts
import {ComponentIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'bundleComponent',
  title: 'Bundle component',
  type: 'object',
  icon: ComponentIcon,
  fields: [
    defineField({
      name: 'productVariant',
      title: 'Product variant',
      type: 'reference',
      to: [{type: 'productVariant'}],
      validation: (Rule) => Rule.required(),
      description:
        'Variante específica de Shopify. El color queda pre-bloqueado por la variante.',
    }),
    defineField({
      name: 'label',
      title: 'Label visible',
      type: 'string',
      description:
        'Override del título de la variante en la UI del bundle (ej. "Funda nórdica"). Si se deja vacío, usa el título de la variante.',
    }),
    defineField({
      name: 'availableSizes',
      title: 'Tallas disponibles',
      type: 'array',
      of: [{type: 'string'}],
      description:
        'Lista de tallas habilitadas para esta variante en el contexto del bundle.',
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'notes',
      title: 'Notas internas',
      type: 'string',
      description: 'Notas para editores. No se muestran en frontend.',
    }),
  ],
  preview: {
    select: {
      label: 'label',
      variantTitle: 'productVariant.store.title',
      sku: 'productVariant.store.sku',
    },
    prepare({label, variantTitle, sku}) {
      return {
        title: label || variantTitle || '(sin título)',
        subtitle: sku ? `SKU ${sku}` : 'Sin SKU sincronizado',
      }
    },
  },
})
```

- [ ] **Step 2: Register in `sanity/schemas/index.ts`**

Find the `// Object types` section and add the import + push the type into the `objects` array:

```ts
// near the top with other object imports
import bundleComponent from './objects/bundle/bundleComponent'

// inside the `objects` array (anywhere, but keep alphabetical-ish)
const objects = [
  // ...existing entries
  bundleComponent,
  // ...rest
]
```

- [ ] **Step 3: Verify Studio loads without errors**

Run: `npm run dev`
Open: `http://localhost:3000/admin`
Expected: Studio loads with no schema errors. The new type doesn't appear as a top-level document (it's an object, used inside arrays).

- [ ] **Step 4: TypeScript check**

Run: `npm run typecheck`
Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add sanity/schemas/objects/bundle/bundleComponent.ts sanity/schemas/index.ts
git commit -m "Add bundleComponent object schema"
```

---

### Task 1.4: Create the 8 page-builder block schemas

**Files:**
- Create: `sanity/schemas/objects/blocks/bannerDescuento.ts`
- Create: `sanity/schemas/objects/blocks/heroCampaign.ts`
- Create: `sanity/schemas/objects/blocks/campaignImageVideo.ts`
- Create: `sanity/schemas/objects/blocks/productModule.ts`
- Create: `sanity/schemas/objects/blocks/lookModule.ts`
- Create: `sanity/schemas/objects/blocks/setModule.ts`
- Create: `sanity/schemas/objects/blocks/featuredSection.ts`
- Create: `sanity/schemas/objects/blocks/richText.ts`
- Create: `sanity/schemas/objects/blocks/index.ts`
- Modify: `sanity/schemas/index.ts`

- [ ] **Step 1: Create `bannerDescuento.ts`**

```ts
// sanity/schemas/objects/blocks/bannerDescuento.ts
import {TagIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.bannerDescuento',
  title: 'Banner de descuento',
  type: 'object',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'text',
      title: 'Texto',
      type: 'string',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'link',
      title: 'Link (opcional)',
      type: 'array',
      of: [{type: 'linkInternal'}, {type: 'linkExternal'}],
      validation: (Rule) => Rule.max(1),
    }),
    defineField({
      name: 'colorTheme',
      title: 'Tema',
      type: 'reference',
      to: [{type: 'colorTheme'}],
    }),
  ],
  preview: {
    select: {text: 'text'},
    prepare({text}) {
      return {title: 'Banner descuento', subtitle: text}
    },
  },
})
```

- [ ] **Step 2: Create `heroCampaign.ts`**

```ts
// sanity/schemas/objects/blocks/heroCampaign.ts
import {ImagesIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.heroCampaign',
  title: 'Hero campaña',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'mediaType',
      title: 'Tipo de media',
      type: 'string',
      options: {
        list: [
          {title: 'Imagen', value: 'image'},
          {title: 'Vídeo', value: 'video'},
        ],
        layout: 'radio',
      },
      initialValue: 'image',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Imagen',
      type: 'image',
      options: {hotspot: true},
      hidden: ({parent}) => parent?.mediaType !== 'image',
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alt',
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'video',
      title: 'Vídeo',
      type: 'object',
      hidden: ({parent}) => parent?.mediaType !== 'video',
      fields: [
        defineField({name: 'src', title: 'URL (mp4 o .m3u8)', type: 'url'}),
        defineField({name: 'posterAlt', title: 'Alt del poster', type: 'string'}),
        defineField({name: 'poster', title: 'Poster', type: 'image'}),
      ],
    }),
    defineField({name: 'headline', title: 'Headline', type: 'string'}),
    defineField({name: 'subhead', title: 'Subheadline', type: 'text', rows: 2}),
    defineField({
      name: 'cta',
      title: 'CTA',
      type: 'object',
      fields: [
        defineField({name: 'label', type: 'string', title: 'Label'}),
        defineField({
          name: 'link',
          type: 'array',
          title: 'Link',
          of: [{type: 'linkInternal'}, {type: 'linkExternal'}],
          validation: (Rule) => Rule.max(1),
        }),
      ],
    }),
    defineField({
      name: 'colorTheme',
      title: 'Tema',
      type: 'reference',
      to: [{type: 'colorTheme'}],
    }),
  ],
  preview: {
    select: {headline: 'headline', media: 'image'},
    prepare({headline, media}) {
      return {title: 'Hero campaña', subtitle: headline || '(sin headline)', media}
    },
  },
})
```

- [ ] **Step 3: Create `campaignImageVideo.ts`**

```ts
// sanity/schemas/objects/blocks/campaignImageVideo.ts
import {PlayIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.campaignImageVideo',
  title: 'Imagen / vídeo de campaña',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'mediaType',
      type: 'string',
      options: {
        list: [
          {title: 'Imagen', value: 'image'},
          {title: 'Vídeo', value: 'video'},
        ],
        layout: 'radio',
      },
      initialValue: 'image',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      type: 'image',
      options: {hotspot: true},
      hidden: ({parent}) => parent?.mediaType !== 'image',
      fields: [defineField({name: 'alt', type: 'string', validation: (Rule) => Rule.required()})],
    }),
    defineField({
      name: 'video',
      type: 'object',
      hidden: ({parent}) => parent?.mediaType !== 'video',
      fields: [
        defineField({name: 'src', type: 'url'}),
        defineField({name: 'posterAlt', type: 'string'}),
        defineField({name: 'poster', type: 'image'}),
      ],
    }),
    defineField({name: 'headline', title: 'Headline (opc)', type: 'string'}),
    defineField({
      name: 'link',
      title: 'Link (opc)',
      type: 'array',
      of: [{type: 'linkInternal'}, {type: 'linkExternal'}],
      validation: (Rule) => Rule.max(1),
    }),
    defineField({
      name: 'aspectRatio',
      title: 'Aspect ratio',
      type: 'string',
      options: {
        list: ['16:9', '4:5', '1:1', '3:4', '21:9'],
        layout: 'radio',
      },
      initialValue: '16:9',
    }),
    defineField({name: 'fullBleed', title: 'Full-bleed', type: 'boolean', initialValue: false}),
  ],
  preview: {
    select: {headline: 'headline', media: 'image'},
    prepare({headline, media}) {
      return {title: 'Campaña imagen/vídeo', subtitle: headline || '(sin headline)', media}
    },
  },
})
```

- [ ] **Step 4: Create `productModule.ts`**

```ts
// sanity/schemas/objects/blocks/productModule.ts
import {PackageIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.productModule',
  title: 'Módulo de productos',
  type: 'object',
  icon: PackageIcon,
  fields: [
    defineField({name: 'title', title: 'Título', type: 'string'}),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          {title: 'Carrusel', value: 'carousel'},
          {title: 'Grid 4 columnas', value: 'grid-4col'},
          {title: 'Grid mixto', value: 'grid-mixed'},
        ],
        layout: 'radio',
      },
      initialValue: 'carousel',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'source',
      title: 'Origen',
      type: 'string',
      options: {
        list: [
          {title: 'Manual', value: 'manual'},
          {title: 'Colección Shopify', value: 'collection'},
        ],
        layout: 'radio',
      },
      initialValue: 'manual',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'manualProducts',
      title: 'Productos (manual)',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'product'}]}],
      hidden: ({parent}) => parent?.source !== 'manual',
    }),
    defineField({
      name: 'collection',
      title: 'Colección',
      type: 'reference',
      to: [{type: 'collection'}],
      hidden: ({parent}) => parent?.source !== 'collection',
    }),
    defineField({
      name: 'limit',
      title: 'Límite (sólo si la fuente es colección)',
      type: 'number',
      validation: (Rule) => Rule.min(1).max(48),
      initialValue: 8,
      hidden: ({parent}) => parent?.source !== 'collection',
    }),
  ],
  preview: {
    select: {title: 'title', layout: 'layout', source: 'source'},
    prepare({title, layout, source}) {
      return {title: title || 'Módulo de productos', subtitle: `${source} · ${layout}`}
    },
  },
})
```

- [ ] **Step 5: Create `lookModule.ts`**

```ts
// sanity/schemas/objects/blocks/lookModule.ts
import {StackIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.lookModule',
  title: 'Módulo Look Books',
  type: 'object',
  icon: StackIcon,
  fields: [
    defineField({name: 'title', type: 'string'}),
    defineField({
      name: 'looks',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'look'}]}],
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'layout',
      type: 'string',
      options: {
        list: [
          {title: 'Fila ancha', value: 'row-wide'},
          {title: 'Grid 2 columnas', value: 'grid-2col'},
        ],
        layout: 'radio',
      },
      initialValue: 'row-wide',
    }),
  ],
  preview: {
    select: {title: 'title', count: 'looks.length'},
    prepare({title, count}) {
      return {title: title || 'Módulo Looks', subtitle: `${count || 0} looks`}
    },
  },
})
```

- [ ] **Step 6: Create `setModule.ts`**

```ts
// sanity/schemas/objects/blocks/setModule.ts
import {LayersIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.setModule',
  title: 'Módulo Sets',
  type: 'object',
  icon: LayersIcon,
  fields: [
    defineField({name: 'title', type: 'string'}),
    defineField({
      name: 'sets',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'set'}]}],
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'layout',
      type: 'string',
      options: {
        list: [
          {title: 'Fila mini', value: 'row-mini'},
          {title: 'Grid', value: 'grid'},
        ],
        layout: 'radio',
      },
      initialValue: 'row-mini',
    }),
  ],
  preview: {
    select: {title: 'title', count: 'sets.length'},
    prepare({title, count}) {
      return {title: title || 'Módulo Sets', subtitle: `${count || 0} sets`}
    },
  },
})
```

- [ ] **Step 7: Create `featuredSection.ts`**

```ts
// sanity/schemas/objects/blocks/featuredSection.ts
import {StarIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.featuredSection',
  title: 'Sección destacada',
  type: 'object',
  icon: StarIcon,
  fields: [
    defineField({
      name: 'image',
      type: 'image',
      options: {hotspot: true},
      validation: (Rule) => Rule.required(),
      fields: [defineField({name: 'alt', type: 'string', validation: (Rule) => Rule.required()})],
    }),
    defineField({name: 'headline', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'body',
      type: 'array',
      of: [{type: 'block', styles: [{title: 'Normal', value: 'normal'}], lists: []}],
    }),
    defineField({
      name: 'cta',
      type: 'object',
      fields: [
        defineField({name: 'label', type: 'string'}),
        defineField({
          name: 'link',
          type: 'array',
          of: [{type: 'linkInternal'}, {type: 'linkExternal'}],
          validation: (Rule) => Rule.max(1),
        }),
      ],
    }),
    defineField({
      name: 'mediaPosition',
      type: 'string',
      options: {
        list: [
          {title: 'Izquierda', value: 'left'},
          {title: 'Derecha', value: 'right'},
        ],
        layout: 'radio',
      },
      initialValue: 'left',
    }),
  ],
  preview: {
    select: {headline: 'headline', media: 'image'},
    prepare({headline, media}) {
      return {title: 'Sección destacada', subtitle: headline, media}
    },
  },
})
```

- [ ] **Step 8: Create `richText.ts`**

```ts
// sanity/schemas/objects/blocks/richText.ts
import {DocumentTextIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.richText',
  title: 'Texto rico',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'body',
      type: 'body', // reuses existing block content schema
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {body: 'body'},
    prepare({body}) {
      const firstBlock = Array.isArray(body) ? body[0] : null
      const text =
        firstBlock?.children
          ?.map((c: {text?: string}) => c.text)
          .filter(Boolean)
          .join(' ') || ''
      return {title: 'Texto', subtitle: text.slice(0, 80) || '(vacío)'}
    },
  },
})
```

- [ ] **Step 9: Create `blocks/index.ts` barrel**

```ts
// sanity/schemas/objects/blocks/index.ts
import bannerDescuento from './bannerDescuento'
import campaignImageVideo from './campaignImageVideo'
import featuredSection from './featuredSection'
import heroCampaign from './heroCampaign'
import lookModule from './lookModule'
import productModule from './productModule'
import richText from './richText'
import setModule from './setModule'

export const blockSchemas = [
  bannerDescuento,
  heroCampaign,
  campaignImageVideo,
  productModule,
  lookModule,
  setModule,
  featuredSection,
  richText,
]

// Names used in pageBuilder array `of` config
export const blockTypeNames = blockSchemas.map((s) => ({type: s.name}))
```

- [ ] **Step 10: Register all blocks in `sanity/schemas/index.ts`**

Find the `// Object types` imports area and add at the top of the imports for objects:

```ts
import {blockSchemas} from './objects/blocks'
```

Then in the `objects` array spread the blocks (place near the end of the array, before the closing bracket):

```ts
const objects = [
  // ...existing entries
  bundleComponent,
  ...blockSchemas,
  // ...rest if any
]
```

- [ ] **Step 11: Verify Studio loads**

Run: `npm run dev`
Open: `http://localhost:3000/admin`
Expected: Studio loads with no schema errors. None of the new block types appear as standalone documents (they're objects).

- [ ] **Step 12: TypeScript check**

Run: `npm run typecheck`
Expected: No new errors.

- [ ] **Step 13: Commit**

```bash
git add sanity/schemas/objects/blocks/ sanity/schemas/index.ts
git commit -m "Add 8 page-builder block object schemas"
```

---

### Task 1.5: Create `look` document schema

**Files:**
- Create: `sanity/schemas/documents/look.tsx`
- Modify: `sanity/schemas/index.ts`
- Modify: `sanity/desk/index.ts` (add to `hiddenDocTypes`)
- Create: `sanity/desk/lookStructure.ts`

> Looks/Sets need ordering. The repo already has `sanity-plugin-orderable-document-list` patterns for `post` and `product`. We follow the same pattern.

- [ ] **Step 1: Inspect an existing orderable structure file as reference**

Read: `sanity/desk/orderProductStructure.ts` and `sanity/desk/productStructure.ts`. Note how they integrate with the orderable plugin. Use that as the model for `lookStructure.ts`.

- [ ] **Step 2: Create the `look` document schema**

```tsx
// sanity/schemas/documents/look.tsx
import {StackIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

const GROUPS = [
  {name: 'editorial', title: 'Editorial', default: true},
  {name: 'pricing', title: 'Pricing & Discount'},
  {name: 'theme', title: 'Theme'},
  {name: 'seo', title: 'SEO'},
]

export default defineType({
  name: 'look',
  title: 'Look Book',
  type: 'document',
  icon: StackIcon,
  groups: GROUPS,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      group: 'editorial',
    }),
    defineField({
      name: 'editorialImages',
      title: 'Imágenes editoriales',
      type: 'array',
      of: [{type: 'module.image'}],
      validation: (Rule) => Rule.min(1),
      group: 'editorial',
    }),
    defineField({
      name: 'components',
      title: 'Componentes (productos del look)',
      description:
        'Cada componente es una variante específica de Shopify. El usuario solo elige talla; el color queda pre-bloqueado por la variante.',
      type: 'array',
      of: [{type: 'bundleComponent'}],
      validation: (Rule) => Rule.min(2),
      group: 'editorial',
    }),
    defineField({
      name: 'priceFixed',
      title: 'Precio fijo (€)',
      type: 'number',
      description:
        'Precio del look completo. Es la base que cobra Shopify cuando no hay descuento de bundle aplicado.',
      validation: (Rule) => Rule.required().min(0),
      group: 'pricing',
    }),
    defineField({
      name: 'priceCompareAt',
      title: 'Precio "antes" tachado (€) — opcional',
      type: 'number',
      validation: (Rule) => Rule.min(0),
      group: 'pricing',
    }),
    defineField({
      name: 'discountStrategy',
      title: 'Estrategia de descuento',
      type: 'string',
      options: {
        list: [
          {title: 'Resta cantidad fija a la suma de componentes', value: 'sumMinusFixed'},
          {title: 'Resta % a la suma de componentes', value: 'sumMinusPercent'},
          {title: 'Override: total cerrado (ignora la suma)', value: 'overrideTotal'},
        ],
        layout: 'radio',
      },
      initialValue: 'overrideTotal',
      validation: (Rule) => Rule.required(),
      group: 'pricing',
    }),
    defineField({
      name: 'discountValue',
      title: 'Valor de descuento',
      description:
        'Si la estrategia es "sumMinusFixed": cantidad en €. Si es "sumMinusPercent": número entre 0 y 100. Si es "overrideTotal": no se usa (se ignora).',
      type: 'number',
      validation: (Rule) => Rule.min(0),
      group: 'pricing',
    }),
    defineField({
      name: 'colorTheme',
      title: 'Tema',
      type: 'reference',
      to: [{type: 'colorTheme'}],
      group: 'theme',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo.page',
      group: 'seo',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      price: 'priceFixed',
      media: 'editorialImages.0.image',
    },
    prepare({title, price, media}) {
      return {
        title,
        subtitle: price ? `€${price}` : 'Sin precio',
        media,
      }
    },
  },
  orderings: [
    {name: 'titleAsc', title: 'Título A-Z', by: [{field: 'title', direction: 'asc'}]},
    {name: 'priceDesc', title: 'Precio (mayor primero)', by: [{field: 'priceFixed', direction: 'desc'}]},
  ],
})
```

- [ ] **Step 3: Register in `sanity/schemas/index.ts`**

```ts
// near the document imports
import look from './documents/look'

// in the `documents` array
const documents = [collection, colorTheme, page, product, productVariant, post, look]
```

- [ ] **Step 4: Add to `hiddenDocTypes` in `sanity/desk/index.ts`**

In the `hiddenDocTypes` filter array, add `'look'` and `'orderable.look'`:

```ts
return ![
  'collection',
  'colorTheme',
  'home',
  'media.tag',
  'page',
  'product',
  'productVariant',
  'settings',
  'post',
  'category',
  'postTag',
  'orderable.post',
  'orderable.product',
  'look',
  'orderable.look',
].includes(id)
```

- [ ] **Step 5: Create `sanity/desk/lookStructure.ts`**

Mirror the existing `productStructure.ts` shape. (If unsure, read it first; the goal is a list pane titled "Looks" with the `look` document type filter.)

```ts
// sanity/desk/lookStructure.ts
import {StackIcon} from '@sanity/icons'
import type {StructureBuilder} from 'sanity/desk'

export default (S: StructureBuilder) =>
  S.listItem()
    .title('Looks')
    .icon(StackIcon)
    .child(
      S.documentTypeList('look').title('Looks').defaultOrdering([{field: 'title', direction: 'asc'}]),
    )
```

- [ ] **Step 6: Wire `lookStructure` into the desk root**

Modify `sanity/desk/index.ts`:

```ts
import look from './lookStructure'
// ...
export const structure: StructureResolver = (S, context) =>
  S.list()
    .title('Content')
    .items([
      home(S, context),
      pages(S, context),
      S.divider(),
      collections(S, context),
      products(S, context),
      orderProducts(S, context),
      look(S),
      S.divider(),
      // ...
    ])
```

- [ ] **Step 7: Verify Studio**

Run: `npm run dev`
Open `http://localhost:3000/admin`. Expected: a "Looks" entry appears in the Content sidebar. Click it → "Looks" list opens (empty initially). Click "+" → form with all groups (Editorial / Pricing / Theme / SEO). Required fields show validation.

- [ ] **Step 8: TypeScript check**

Run: `npm run typecheck`. Expected: no new errors.

- [ ] **Step 9: Commit**

```bash
git add sanity/schemas/documents/look.tsx sanity/schemas/index.ts \
        sanity/desk/index.ts sanity/desk/lookStructure.ts
git commit -m "Add look document schema and desk structure"
```

---

### Task 1.6: Create `set` document schema

**Files:**
- Create: `sanity/schemas/documents/set.tsx`
- Modify: `sanity/schemas/index.ts`
- Modify: `sanity/desk/index.ts`
- Create: `sanity/desk/setStructure.ts`

> Anatomy is identical to `look` plus a required `colorLocked` field.

- [ ] **Step 1: Create `sanity/schemas/documents/set.tsx`**

Copy `look.tsx` and adapt: change `name`, `title`, icon, and add `colorLocked` field after `components`. To save bytes, only the diff is shown:

```tsx
// sanity/schemas/documents/set.tsx
import {LayersIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

const GROUPS = [
  {name: 'editorial', title: 'Editorial', default: true},
  {name: 'pricing', title: 'Pricing & Discount'},
  {name: 'theme', title: 'Theme'},
  {name: 'seo', title: 'SEO'},
]

export default defineType({
  name: 'set',
  title: 'Set',
  type: 'document',
  icon: LayersIcon,
  groups: GROUPS,
  fields: [
    defineField({name: 'title', type: 'string', validation: (Rule) => Rule.required(), group: 'editorial'}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    defineField({name: 'description', type: 'text', rows: 3, group: 'editorial'}),
    defineField({
      name: 'editorialImages',
      type: 'array',
      of: [{type: 'module.image'}],
      validation: (Rule) => Rule.min(1),
      group: 'editorial',
    }),
    defineField({
      name: 'components',
      title: 'Componentes (productos del set)',
      type: 'array',
      of: [{type: 'bundleComponent'}],
      validation: (Rule) => Rule.min(2),
      group: 'editorial',
    }),
    defineField({
      name: 'colorLocked',
      title: 'Color cerrado del set',
      type: 'string',
      description:
        'Color común a todos los componentes (ej. "Azul", "Crudo"). Se muestra como subtítulo del set.',
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    defineField({name: 'priceFixed', title: 'Precio fijo (€)', type: 'number', validation: (Rule) => Rule.required().min(0), group: 'pricing'}),
    defineField({name: 'priceCompareAt', title: 'Precio "antes" (€)', type: 'number', validation: (Rule) => Rule.min(0), group: 'pricing'}),
    defineField({
      name: 'discountStrategy',
      type: 'string',
      options: {
        list: [
          {title: 'Resta cantidad fija a la suma', value: 'sumMinusFixed'},
          {title: 'Resta % a la suma', value: 'sumMinusPercent'},
          {title: 'Override: total cerrado', value: 'overrideTotal'},
        ],
        layout: 'radio',
      },
      initialValue: 'overrideTotal',
      validation: (Rule) => Rule.required(),
      group: 'pricing',
    }),
    defineField({name: 'discountValue', type: 'number', validation: (Rule) => Rule.min(0), group: 'pricing'}),
    defineField({name: 'colorTheme', type: 'reference', to: [{type: 'colorTheme'}], group: 'theme'}),
    defineField({name: 'seo', type: 'seo.page', group: 'seo'}),
  ],
  preview: {
    select: {title: 'title', color: 'colorLocked', price: 'priceFixed', media: 'editorialImages.0.image'},
    prepare({title, color, price, media}) {
      return {
        title,
        subtitle: [color, price ? `€${price}` : null].filter(Boolean).join(' · '),
        media,
      }
    },
  },
  orderings: [
    {name: 'titleAsc', title: 'Título A-Z', by: [{field: 'title', direction: 'asc'}]},
  ],
})
```

- [ ] **Step 2: Register in `sanity/schemas/index.ts`**

```ts
import set from './documents/set'

const documents = [collection, colorTheme, page, product, productVariant, post, look, set]
```

- [ ] **Step 3: Add `'set'` and `'orderable.set'` to `hiddenDocTypes` in `sanity/desk/index.ts`**

(Mirror what was done for `look` in Task 1.5 step 4.)

- [ ] **Step 4: Create `sanity/desk/setStructure.ts`**

```ts
// sanity/desk/setStructure.ts
import {LayersIcon} from '@sanity/icons'
import type {StructureBuilder} from 'sanity/desk'

export default (S: StructureBuilder) =>
  S.listItem()
    .title('Sets')
    .icon(LayersIcon)
    .child(S.documentTypeList('set').title('Sets'))
```

- [ ] **Step 5: Wire into desk root**

In `sanity/desk/index.ts`:

```ts
import set from './setStructure'
// ...
.items([
  home(S, context),
  pages(S, context),
  S.divider(),
  collections(S, context),
  products(S, context),
  orderProducts(S, context),
  look(S),
  set(S),
  S.divider(),
  // ...
])
```

- [ ] **Step 6: Verify Studio**

Run: `npm run dev`. Open `/admin`. Expected: "Sets" entry visible. Click "+" → form with `colorLocked` required.

- [ ] **Step 7: TypeScript check**

Run: `npm run typecheck`. No new errors.

- [ ] **Step 8: Commit**

```bash
git add sanity/schemas/documents/set.tsx sanity/schemas/index.ts \
        sanity/desk/index.ts sanity/desk/setStructure.ts
git commit -m "Add set document schema and desk structure"
```

---

### Task 1.7: Refactor `home` singleton to `pageBuilder`-only

**Files:**
- Modify: `sanity/schemas/singletons/home.ts`
- Modify: `sanity/queries/queries/home.ts` (the existing query references `hero.title` which we're removing — fix it minimally to keep the build green)

> User confirmed at brainstorming time that the `home` singleton has no published content. We refactor without migration.

- [ ] **Step 1: Replace `sanity/schemas/singletons/home.ts`**

```ts
// sanity/schemas/singletons/home.ts
import {HomeIcon} from '@sanity/icons'
import {defineField} from 'sanity'
import {blockTypeNames} from '../objects/blocks'

const TITLE = 'Home'

export default defineField({
  name: 'home',
  title: TITLE,
  type: 'document',
  icon: HomeIcon,
  groups: [
    {default: true, name: 'editorial', title: 'Editorial'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'pageBuilder',
      title: 'Page builder',
      description: 'Bloques que componen la home, en orden.',
      type: 'array',
      of: blockTypeNames,
      group: 'editorial',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo.home',
      group: 'seo',
    }),
  ],
  preview: {
    prepare() {
      return {subtitle: 'Index', title: TITLE}
    },
  },
})
```

- [ ] **Step 2: Update `sanity/queries/queries/home.ts` to a non-broken stub**

The full pageBuilder GROQ comes in Phase 3; here we just keep the build green:

```ts
// sanity/queries/queries/home.ts
import { groq } from 'next-sanity'
import { client } from '..'
import { seo } from '../fragments/seo'

export async function getHome() {
  return client.fetch(
    groq`*[_type == "home"][0]{
      _id,
      pageBuilder
    }`,
    {},
    {next: {tags: ['home'], revalidate: 3600}},
  )
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

- [ ] **Step 3: Verify Studio**

Run: `npm run dev`. Open `/admin → Home`. Expected: only `Page builder` (empty) and `SEO` group are visible. The old `hero/destacados/importantes/modulos` are gone.

- [ ] **Step 4: TypeScript check**

Run: `npm run typecheck`. Expected: no new errors. (If the old query in `app/(frontend)/page.tsx` referenced `hero` etc., note the breakage and fix in Phase 3 — the `getHome` return shape changed.)

- [ ] **Step 5: Commit**

```bash
git add sanity/schemas/singletons/home.ts sanity/queries/queries/home.ts
git commit -m "Refactor home singleton to pageBuilder-only"
```

---

### Task 1.8: Add `pageBuilder` array to `page` schema

**Files:**
- Modify: `sanity/schemas/documents/page.ts`

- [ ] **Step 1: Add `pageBuilder` field**

Open `sanity/schemas/documents/page.ts` and add the `pageBuilder` field after the existing `body` field:

```ts
import {blockTypeNames} from '../objects/blocks'

// ... after the existing `body` field defineField:
defineField({
  name: 'pageBuilder',
  title: 'Page builder',
  type: 'array',
  of: blockTypeNames,
  group: 'editorial',
  description:
    'Bloques modulares para esta página (Our Story, B2B, landings). Si la página solo necesita texto plano, usa "Body" en su lugar.',
}),
```

> Keep the existing `body` field in place. Pages can use either `body` (PortableText long-form) or `pageBuilder` (modular), or both.

- [ ] **Step 2: Verify Studio**

Run: `npm run dev`. Open `/admin → Pages → New`. Expected: "Page builder" array field appears alongside "Body".

- [ ] **Step 3: TypeScript check**

Run: `npm run typecheck`. No new errors.

- [ ] **Step 4: Commit**

```bash
git add sanity/schemas/documents/page.ts
git commit -m "Add pageBuilder array field to page schema"
```

---

### Task 1.9: Phase 1 verification + lint

**Files:** None.

- [ ] **Step 1: Build the project**

Run: `npm run build`
Expected: Build completes. Studio routes build. There may be runtime errors if the existing Home page tries to render the now-defunct `hero` field — that's expected and fixed in Phase 3.

- [ ] **Step 2: Lint pass**

Run: `npm run lint`
Expected: No new errors introduced by the new files. Pre-existing warnings can be ignored.

- [ ] **Step 3: TypeScript pass**

Run: `npm run typecheck`
Expected: No new errors.

- [ ] **Step 4: Final commit if anything was fixed**

```bash
git status                                              # confirm clean tree
git log --oneline -10                                   # confirm Phase 1 commits
```

If clean, no commit needed.

---

## Phase 2 — Layout chrome (Day L2)

> **Caveat for executors:** the existing `sanity/schemas/objects/global/menu.ts` references `type: 'menuLinks'` which **does not exist** in the schema index. Either it was renamed or never created. Fix this before fetching menu data — Tasks 2.1 and 2.2 fix the schema first.

### Task 2.1: Fix `menuSettings` schema

**Files:**
- Modify: `sanity/schemas/objects/global/menu.ts`

> Replace the broken `menuLinks` reference with concrete link types.

- [ ] **Step 1: Replace the file content**

```ts
// sanity/schemas/objects/global/menu.ts
import {defineField} from 'sanity'

export default defineField({
  name: 'menuSettings',
  title: 'Menu',
  type: 'object',
  options: {collapsed: false, collapsible: true},
  fields: [
    defineField({
      name: 'links',
      title: 'Links principales',
      type: 'array',
      of: [
        {type: 'linkInternal'},
        {type: 'linkExternal'},
        // Mega-menu group: a labeled column of sub-links + optional featured product
        {
          name: 'menuGroup',
          type: 'object',
          title: 'Grupo (mega-menú)',
          fields: [
            defineField({
              name: 'label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'items',
              type: 'array',
              of: [{type: 'linkInternal'}, {type: 'linkExternal'}],
              validation: (Rule) => Rule.min(1),
            }),
            defineField({
              name: 'featuredProduct',
              type: 'reference',
              to: [{type: 'product'}],
              description: 'Producto destacado mostrado en el slot del mega-menú.',
            }),
          ],
          preview: {
            select: {title: 'label', count: 'items.length'},
            prepare({title, count}) {
              return {title: title || '(sin label)', subtitle: `${count || 0} items`}
            },
          },
        },
      ],
    }),
  ],
})
```

- [ ] **Step 2: Verify Studio**

Run: `npm run dev`. Open `/admin → Settings → Menu`. Expected: schema loads. The `Links` array allows adding internal/external/menuGroup. No console errors about missing `menuLinks`.

- [ ] **Step 3: TypeScript check**

Run: `npm run typecheck`. No new errors.

- [ ] **Step 4: Commit**

```bash
git add sanity/schemas/objects/global/menu.ts
git commit -m "Fix menuSettings schema: replace dangling menuLinks with concrete types"
```

---

### Task 2.2: Align `getSettings` query with the actual schema field names

**Files:**
- Modify: `sanity/queries/common/settings.ts`
- Modify: `sanity/queries/common/header.ts`
- Modify: `sanity/queries/common/footer.ts`
- Create or modify: `sanity/types/index.ts`

> The existing query references `headerMenu`/`footerMenu` but the schema uses `menu`/`footer`. Fix the queries and types together.

- [ ] **Step 1: Update `sanity/queries/common/settings.ts`**

```ts
// sanity/queries/common/settings.ts
import {groq} from 'next-sanity'
import {client} from '../index'
import type {SettingsData} from '@/sanity/types'
import {seo} from '../fragments/seo'

export async function getSettings(): Promise<SettingsData> {
  return client.fetch(
    groq`*[_type == "settings"][0]{
      menu{
        links[]{
          ...,
          _type == "menuGroup" => {
            label,
            items[]{...},
            "featuredProduct": featuredProduct->{
              _id,
              "title": store.title,
              "handle": store.slug.current,
              "image": store.previewImageUrl
            }
          }
        }
      },
      footer{
        links[]{...},
        linksSocial[]{...},
        linksTerms[]{...},
        socialModule[]{...},
        text
      },
      seo{ ${seo} }
    }`,
    {},
    {next: {tags: ['settings'], revalidate: 3600}},
  )
}
```

- [ ] **Step 2: Update `sanity/queries/common/header.ts`**

```ts
// sanity/queries/common/header.ts
import type {HeaderData} from '@/sanity/types'
import {getSettings} from './settings'

export async function getHeader(): Promise<HeaderData> {
  const settings = await getSettings()
  return {menu: settings.menu}
}
```

- [ ] **Step 3: Update `sanity/queries/common/footer.ts`**

```ts
// sanity/queries/common/footer.ts
import type {FooterData} from '@/sanity/types'
import {getSettings} from './settings'

export async function getFooter(): Promise<FooterData> {
  const settings = await getSettings()
  return {footer: settings.footer}
}
```

- [ ] **Step 4: Define / update types in `sanity/types/index.ts`**

Read the file first to understand the existing exports. If it doesn't exist, create it. Append (or merge) these types:

```ts
// sanity/types/index.ts (append; merge with existing exports)
export interface MenuLinkInternal {
  _key: string
  _type: 'linkInternal'
  title?: string
  reference?: {_ref: string; _type: 'reference'}
  // resolved by query, optional
  slug?: string
}

export interface MenuLinkExternal {
  _key: string
  _type: 'linkExternal'
  title?: string
  url: string
  newWindow?: boolean
}

export interface MenuGroup {
  _key: string
  _type: 'menuGroup'
  label: string
  items: Array<MenuLinkInternal | MenuLinkExternal>
  featuredProduct?: {
    _id: string
    title?: string
    handle?: string
    image?: string
  }
}

export type MenuItem = MenuLinkInternal | MenuLinkExternal | MenuGroup

export interface MenuData {
  links?: MenuItem[]
}

export interface FooterColumnData {
  links?: Array<MenuLinkInternal | MenuLinkExternal>
  linksSocial?: Array<{_key: string; _type: 'linkSocial'; platform?: string; url?: string}>
  linksTerms?: Array<MenuLinkInternal | MenuLinkExternal>
  socialModule?: Array<{_key: string; _type: 'linkSocial'; platform?: string; url?: string}>
  text?: unknown // PortableText
}

export interface SettingsData {
  menu?: MenuData
  footer?: FooterColumnData
  seo?: unknown
}

export interface HeaderData {
  menu?: MenuData
}

export interface FooterData {
  footer?: FooterColumnData
}
```

- [ ] **Step 5: TypeScript check**

Run: `npm run typecheck`
Expected: No errors related to the new types or modified queries. If there are downstream errors in components consuming the old `headerMenu`/`footerMenu` shape, fix those usages now (search the codebase).

```bash
grep -rn "headerMenu\|footerMenu" components/ app/ --include="*.tsx" --include="*.ts"
```

If any results: update those files to use `menu` / `footer` accordingly. Likely no callers exist yet (since the old query was already broken).

- [ ] **Step 6: Commit**

```bash
git add sanity/queries/common/settings.ts sanity/queries/common/header.ts \
        sanity/queries/common/footer.ts sanity/types/index.ts
# also any modified components if found in step 5
git commit -m "Align settings/header/footer queries with actual schema fields"
```

---

### Task 2.3: Build `<Footer>` server component + `<NewsletterForm>`

**Files:**
- Create: `components/Layout/Footer/Footer.tsx`
- Create: `components/Layout/Footer/Footer.module.scss`
- Create: `components/Layout/Footer/NewsletterForm.tsx`
- Create: `components/Layout/Footer/NewsletterForm.module.scss`
- Create: `types/footer.ts`

> Why Footer first: it's the simplest component (mostly static), it exercises the full pipeline (SCSS module + token import + GROQ + types + LazyImage if logo is image), and it's reusable through Phase 2.

- [ ] **Step 1: Create the props type**

```ts
// types/footer.ts
import type {FooterColumnData} from '@/sanity/types'

export interface FooterProps {
  data?: FooterColumnData
}

export interface NewsletterFormProps {
  // Visual labels copied from the Figma footer (file u92pryF41Lr42YVpq1Qxsn, frame 11:5580):
  title?: string         // "Keep in touch"
  subtitle?: string      // "Subscribe to our newsletter to get the latest…"
  placeholder?: string   // "Enter your email"
  buttonLabel?: string   // "Subscribe"
}
```

- [ ] **Step 2: Build `Footer.tsx`**

```tsx
// components/Layout/Footer/Footer.tsx
import s from './Footer.module.scss'
import NewsletterForm from './NewsletterForm'
import type {FooterProps} from '@/types/footer'
import Link from 'next/link'

export default function Footer({data}: FooterProps) {
  const links = data?.links ?? []
  const linksTerms = data?.linksTerms ?? []
  const linksSocial = data?.linksSocial ?? []

  return (
    <footer className={s.footer}>
      <div className={s.top}>
        <NewsletterForm />

        <nav className={s.nav} aria-label="Footer navigation">
          {links.map((link) => {
            const key = link._key
            if (link._type === 'linkInternal') {
              const href = link.slug ? `/${link.slug}` : '#'
              return (
                <Link key={key} href={href} className={s.navLink}>
                  {link.title}
                </Link>
              )
            }
            if (link._type === 'linkExternal') {
              return (
                <a
                  key={key}
                  href={link.url}
                  target={link.newWindow ? '_blank' : undefined}
                  rel={link.newWindow ? 'noopener noreferrer' : undefined}
                  className={s.navLink}
                >
                  {link.title}
                </a>
              )
            }
            return null
          })}
        </nav>

        {linksSocial.length > 0 && (
          <ul className={s.social} aria-label="Redes sociales">
            {linksSocial.map((sLink) => (
              <li key={sLink._key}>
                <a href={sLink.url} target="_blank" rel="noopener noreferrer">
                  {sLink.platform}
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className={s.country} aria-label="Country selector">
          País: España (EUR)
        </div>
      </div>

      <div className={s.legal}>
        <span>© {new Date().getFullYear()} Mikmax</span>
        {linksTerms.length > 0 && (
          <ul className={s.terms}>
            {linksTerms.map((link) => {
              if (link._type === 'linkInternal') {
                return (
                  <li key={link._key}>
                    <Link href={link.slug ? `/${link.slug}` : '#'}>{link.title}</Link>
                  </li>
                )
              }
              return (
                <li key={link._key}>
                  <a href={link.url}>{link.title}</a>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </footer>
  )
}
```

- [ ] **Step 3: Build `Footer.module.scss`**

```scss
// components/Layout/Footer/Footer.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.footer {
  width: 100%;
  padding: $space-6 $gutter-mobile;
  background: map-get($colors, 'lighter');
  color: map-get($colors, 'darker');

  @include from(md) {
    padding: $space-7 $gutter-desktop;
  }
}

.top {
  display: grid;
  grid-template-columns: 1fr;
  gap: $space-6;

  @include from(md) {
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: $space-7;
  }
}

.nav {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.navLink {
  font-family: $HelveticaNeue;
  font-size: px(15);
  line-height: px(17);
  color: inherit;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.social {
  display: flex;
  gap: $space-3;
  list-style: none;
  margin: 0;
  padding: 0;
}

.country {
  font-size: px(15);
  color: inherit;
}

.legal {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  margin-top: $space-7;
  padding-top: $space-4;
  border-top: $border;
  font-size: px(13);

  @include from(md) {
    flex-direction: row;
    justify-content: space-between;
  }
}

.terms {
  display: flex;
  gap: $space-4;
  list-style: none;
  margin: 0;
  padding: 0;

  a {
    color: inherit;
  }
}
```

- [ ] **Step 4: Build `NewsletterForm.tsx`**

The existing `/api/subscribeUser` route already accepts a JSON `{email}` and forwards to Mailchimp. We reuse it.

```tsx
// components/Layout/Footer/NewsletterForm.tsx
'use client'

import {FormEvent, useState} from 'react'
import s from './NewsletterForm.module.scss'
import type {NewsletterFormProps} from '@/types/footer'

type Status = 'idle' | 'submitting' | 'success' | 'error' | 'already'

export default function NewsletterForm({
  title = 'Keep in touch',
  subtitle = 'Subscribe to our newsletter to get the latest updates on new releases, pre-orders, and exclusive content.',
  placeholder = 'Enter your email',
  buttonLabel = 'Subscribe',
}: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')

    try {
      const res = await fetch('/api/subscribeUser', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email}),
      })
      const json = (await res.json()) as {status?: string; error?: string}
      if (res.ok && json.status === 'subscribed') setStatus('success')
      else if (json.error?.toLowerCase().includes('already')) setStatus('already')
      else setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <form className={s.form} onSubmit={onSubmit} noValidate>
      <p className={s.title}>{title}</p>
      <p className={s.subtitle}>{subtitle}</p>

      <label htmlFor="newsletter-email" className={s.srOnly}>
        Email
      </label>
      <div className={s.inputWrap}>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          className={s.input}
          disabled={status === 'submitting' || status === 'success'}
        />
        <button
          type="submit"
          className={s.button}
          disabled={status === 'submitting' || status === 'success' || !email}
        >
          {status === 'submitting' ? '…' : buttonLabel}
        </button>
      </div>

      {status === 'success' && <p className={s.feedback}>Thanks for subscribing.</p>}
      {status === 'already' && <p className={s.feedback}>You&apos;re already subscribed.</p>}
      {status === 'error' && <p className={s.feedbackError}>Something went wrong. Try again.</p>}
    </form>
  )
}
```

- [ ] **Step 5: Build `NewsletterForm.module.scss`**

```scss
// components/Layout/Footer/NewsletterForm.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.form {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  max-width: px(420);
}

.title {
  font-family: $HelveticaNeue;
  font-size: px(14);
  letter-spacing: px(0.5);
  margin: 0;
}

.subtitle {
  font-size: px(13);
  line-height: px(17);
  margin: 0;
  color: map-get($colors, 'darker-50');
}

.inputWrap {
  display: flex;
  align-items: center;
  border-bottom: $border;
  padding-bottom: $space-1;
}

.input {
  flex: 1;
  background: transparent;
  border: 0;
  font-family: $HelveticaNeue;
  font-size: px(15);
  outline: none;
}

.button {
  background: transparent;
  border: 0;
  font-family: $HelveticaNeue;
  font-size: px(13);
  cursor: pointer;
  padding: 0 $space-2;

  &:disabled { cursor: default; opacity: 0.5; }
}

.feedback,
.feedbackError {
  font-size: px(13);
  margin-top: $space-1;
}

.feedbackError { color: map-get($colors, 'red'); }

.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

- [ ] **Step 6: Verify the form posts**

Run: `npm run dev`. Render the Footer somewhere temporarily (we wire it in `layout.tsx` in Task 2.6 — for now you can test it in `app/(frontend)/page.tsx`). Submit the form with a fake email. Expected response from `/api/subscribeUser`: 500 if `MAILCHIMP_*` env vars are missing, 200 if they're set. If 500 due to missing env vars, that's expected at this stage — confirm only that the network call is made.

- [ ] **Step 7: TypeScript check**

Run: `npm run typecheck`. No errors.

- [ ] **Step 8: Commit**

```bash
git add components/Layout/Footer/ types/footer.ts
git commit -m "Add Footer component + NewsletterForm"
```

---

### Task 2.4: Build `<Header>` and `<MegaMenu>`

**Files:**
- Create: `components/Layout/Header/Header.tsx` (server)
- Create: `components/Layout/Header/Header.module.scss`
- Create: `components/Layout/Header/HeaderClient.tsx` (client island for sticky/scroll behaviour)
- Create: `components/Layout/MegaMenu/MegaMenu.tsx` (client)
- Create: `components/Layout/MegaMenu/MegaMenu.module.scss`
- Create: `types/header.ts`
- Create: `types/menu.ts`

> Header is mostly static markup; the client island handles scroll-triggered classes (`Variant2`/`Variant3`/`z` from the Figma `Component 1`). The mega-menu is its own client component because it has hover/click state and renders a featured product slot.

- [ ] **Step 1: Define props types**

```ts
// types/menu.ts
import type {MenuData, MenuItem} from '@/sanity/types'
export type {MenuData, MenuItem}

// types/header.ts
import type {MenuData} from './menu'

export type HeaderVariant = 'default' | 'variant2' | 'variant3' | 'z'

export interface HeaderProps {
  menu?: MenuData
  initialVariant?: HeaderVariant
}
```

- [ ] **Step 2: Build `Header.tsx` (server wrapper)**

```tsx
// components/Layout/Header/Header.tsx
import HeaderClient from './HeaderClient'
import {getHeader} from '@/sanity/queries/common/header'
import type {HeaderProps} from '@/types/header'

export default async function Header({initialVariant = 'default'}: Omit<HeaderProps, 'menu'>) {
  const data = await getHeader()
  return <HeaderClient menu={data?.menu} initialVariant={initialVariant} />
}
```

- [ ] **Step 3: Build `HeaderClient.tsx` (client interactivity)**

```tsx
// components/Layout/Header/HeaderClient.tsx
'use client'

import {useEffect, useState} from 'react'
import Link from 'next/link'
import s from './Header.module.scss'
import type {HeaderProps, HeaderVariant} from '@/types/header'
import MegaMenu from '../MegaMenu/MegaMenu'

export default function HeaderClient({menu, initialVariant = 'default'}: HeaderProps) {
  const [variant, setVariant] = useState<HeaderVariant>(initialVariant)
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (y < 16) setVariant('default')
      else if (y < 240) setVariant('variant2')
      else setVariant('variant3')
    }
    onScroll()
    window.addEventListener('scroll', onScroll, {passive: true})
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = menu?.links ?? []

  return (
    <header className={`${s.header} ${s[variant] ?? ''}`}>
      <div className={s.inner}>
        <Link href="/" className={s.logo}>
          MIKMAX
        </Link>

        <nav className={s.nav} aria-label="Main">
          {links.map((link) => {
            if (link._type === 'menuGroup') {
              const isActive = activeGroupKey === link._key
              return (
                <div
                  key={link._key}
                  className={s.navItem}
                  onMouseEnter={() => setActiveGroupKey(link._key)}
                  onMouseLeave={() => setActiveGroupKey(null)}
                >
                  <button
                    type="button"
                    className={s.navButton}
                    aria-expanded={isActive}
                    onFocus={() => setActiveGroupKey(link._key)}
                  >
                    {link.label}
                  </button>
                  {isActive && <MegaMenu group={link} />}
                </div>
              )
            }
            if (link._type === 'linkInternal') {
              return (
                <Link key={link._key} href={link.slug ? `/${link.slug}` : '#'} className={s.navLink}>
                  {link.title}
                </Link>
              )
            }
            return (
              <a
                key={link._key}
                href={link.url}
                target={link.newWindow ? '_blank' : undefined}
                rel={link.newWindow ? 'noopener noreferrer' : undefined}
                className={s.navLink}
              >
                {link.title}
              </a>
            )
          })}
        </nav>

        <div className={s.actions}>
          {/* CartButton lives in Phase 7; for now a placeholder */}
          <button type="button" className={s.cartBtn} aria-label="Cart">
            Cart
          </button>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Build `Header.module.scss`**

```scss
// components/Layout/Header/Header.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.header {
  position: sticky;
  top: 0;
  z-index: $z-sticky-header;
  width: 100%;
  background: transparent;
  transition: background $transition-fast, color $transition-fast;
}

.default { background: transparent; color: map-get($colors, 'darker'); }
.variant2 { background: rgba(map-get($colors, 'white'), 0.92); color: map-get($colors, 'darker'); backdrop-filter: blur(8px); }
.variant3 { background: map-get($colors, 'white'); color: map-get($colors, 'darker'); }
.z        { background: map-get($colors, 'darker'); color: map-get($colors, 'white'); }

.inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $gutter-mobile;

  @include from(md) {
    padding: $space-3 $gutter-desktop;
  }
}

.logo {
  font-family: $Manuka, $HelveticaNeue;
  font-size: px(20);
  letter-spacing: px(2);
  text-decoration: none;
  color: inherit;
}

.nav {
  display: none;

  @include from(md) {
    display: flex;
    gap: $space-5;
  }
}

.navItem {
  position: relative;
  display: flex;
  align-items: center;
}

.navButton,
.navLink {
  background: transparent;
  border: 0;
  padding: 0;
  font-family: $HelveticaNeue;
  font-size: px(15);
  color: inherit;
  cursor: pointer;
  text-decoration: none;
}

.navLink:hover { text-decoration: underline; }

.actions {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.cartBtn {
  background: transparent;
  border: 0;
  font-family: $HelveticaNeue;
  font-size: px(15);
  cursor: pointer;
  color: inherit;
}
```

- [ ] **Step 5: Build `MegaMenu.tsx`**

```tsx
// components/Layout/MegaMenu/MegaMenu.tsx
'use client'

import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import s from './MegaMenu.module.scss'
import type {MenuGroup} from '@/sanity/types'

interface MegaMenuProps {
  group: MenuGroup
}

export default function MegaMenu({group}: MegaMenuProps) {
  return (
    <div className={s.menu} role="menu">
      <div className={s.itemsCol}>
        <p className={s.label}>{group.label}</p>
        <ul className={s.items}>
          {group.items.map((item) => {
            if (item._type === 'linkInternal') {
              return (
                <li key={item._key} role="none">
                  <Link href={item.slug ? `/${item.slug}` : '#'} role="menuitem" className={s.itemLink}>
                    {item.title}
                  </Link>
                </li>
              )
            }
            return (
              <li key={item._key} role="none">
                <a
                  href={item.url}
                  target={item.newWindow ? '_blank' : undefined}
                  rel={item.newWindow ? 'noopener noreferrer' : undefined}
                  role="menuitem"
                  className={s.itemLink}
                >
                  {item.title}
                </a>
              </li>
            )
          })}
        </ul>
      </div>

      {group.featuredProduct?.image && (
        <Link
          href={group.featuredProduct.handle ? `/shop/product/${group.featuredProduct.handle}` : '#'}
          className={s.featured}
        >
          <LazyImage
            src={group.featuredProduct.image}
            alt={group.featuredProduct.title || 'Producto destacado'}
            width={357}
            height={554}
            wrapperClassName={s.featuredImage}
          />
          <span className={s.featuredTitle}>{group.featuredProduct.title}</span>
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Build `MegaMenu.module.scss`**

```scss
// components/Layout/MegaMenu/MegaMenu.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.menu {
  position: absolute;
  top: 100%;
  left: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: $space-5;
  min-width: px(720);
  padding: $space-5;
  background: map-get($colors, 'white');
  color: map-get($colors, 'darker');
  border-top: $border;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);

  @include from(lg) {
    grid-template-columns: 2fr 1fr;
    min-width: px(960);
  }
}

.itemsCol {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.label {
  font-size: px(13);
  letter-spacing: px(0.5);
  text-transform: uppercase;
  color: map-get($colors, 'gray');
  margin: 0 0 $space-2;
}

.items {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: $space-3 $space-5;
  list-style: none;
  margin: 0;
  padding: 0;
}

.itemLink {
  font-size: px(15);
  text-decoration: none;
  color: inherit;
  &:hover { text-decoration: underline; }
}

.featured { display: block; text-decoration: none; color: inherit; }
.featuredImage { width: 100%; height: auto; }
.featuredTitle { display: block; margin-top: $space-2; font-size: px(14); }
```

- [ ] **Step 7: TypeScript check**

Run: `npm run typecheck`. No errors. (If `LazyImage` import path is wrong, fix it — it's `@/components/Common`.)

- [ ] **Step 8: Commit**

```bash
git add components/Layout/Header/ components/Layout/MegaMenu/ types/header.ts types/menu.ts
git commit -m "Add Header (with variants) and MegaMenu components"
```

---

### Task 2.5: Build `<MobileBottomNav>`

**Files:**
- Create: `components/Layout/MobileBottomNav/MobileBottomNav.tsx`
- Create: `components/Layout/MobileBottomNav/MobileBottomNav.module.scss`

> Sticky bottom bar visible only below 768 px. Cart button is a stub until Phase 7 wires the cart drawer. Account button is permanently a stub (out of MVP).

- [ ] **Step 1: Build `MobileBottomNav.tsx`**

```tsx
// components/Layout/MobileBottomNav/MobileBottomNav.tsx
'use client'

import Link from 'next/link'
import s from './MobileBottomNav.module.scss'

export default function MobileBottomNav() {
  return (
    <nav className={s.nav} aria-label="Mobile primary">
      <Link href="/" className={s.item} aria-label="Home">
        Home
      </Link>
      <Link href="/shop" className={s.item} aria-label="Shop">
        Shop
      </Link>
      <button type="button" className={s.item} aria-label="Cart">
        Cart
      </button>
      <button type="button" className={s.item} aria-label="Cuenta (próximamente)" disabled>
        Cuenta
      </button>
    </nav>
  )
}
```

- [ ] **Step 2: Build `MobileBottomNav.module.scss`**

```scss
// components/Layout/MobileBottomNav/MobileBottomNav.module.scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.nav {
  position: fixed;
  inset: auto 0 0 0;
  z-index: $z-mobile-nav;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: map-get($colors, 'white');
  border-top: $border;
  padding: $space-2 0;

  @include from(sm) {
    display: none;
  }
}

.item {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  padding: $space-2;
  font-family: $HelveticaNeue;
  font-size: px(13);
  color: map-get($colors, 'darker');
  text-decoration: none;
  cursor: pointer;

  &:disabled { opacity: 0.4; cursor: default; }
}
```

- [ ] **Step 3: TypeScript check**

Run: `npm run typecheck`. No errors.

- [ ] **Step 4: Commit**

```bash
git add components/Layout/MobileBottomNav/
git commit -m "Add MobileBottomNav component"
```

---

### Task 2.6: Wire Header / Footer / MobileBottomNav into the root layout

**Files:**
- Modify: `app/(frontend)/layout.tsx`
- Create: `components/Layout/index.ts` (barrel)

- [ ] **Step 1: Create the barrel**

```ts
// components/Layout/index.ts
export {default as Header} from './Header/Header'
export {default as Footer} from './Footer/Footer'
export {default as MobileBottomNav} from './MobileBottomNav/MobileBottomNav'
```

- [ ] **Step 2: Modify `app/(frontend)/layout.tsx`**

Read it first. Then update to render Header + Footer + MobileBottomNav around `{children}`. Keep all the existing Suspense/ShopProvider/Analytics scaffolding.

```tsx
// app/(frontend)/layout.tsx (relevant region — preserve existing imports/analytics)
import '../globals.css'
import type {Viewport} from 'next'
import {buildDefaultMetadata} from '@/utils/seoHelper'
import '../../styles/main.scss'
import React, {Suspense} from 'react'
import ShopProvider from '../../context/shopContext'
import {Header, Footer, MobileBottomNav} from '@/components/Layout'
import {getFooter} from '@/sanity/queries/common/footer'
// (other existing analytics imports kept as-is)

export async function generateMetadata() {
  return buildDefaultMetadata()
}

export const viewport: Viewport = {themeColor: 'transparent'}

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const footerData = await getFooter()

  return (
    <html lang="es">
      <body>
        <Suspense fallback={<div className="loader">Loading...</div>}>
          <ShopProvider>
            <Header />
            {children}
            <Footer data={footerData?.footer} />
            <MobileBottomNav />
            {/* Existing analytics block kept commented or active per current state */}
          </ShopProvider>
        </Suspense>
      </body>
    </html>
  )
}
```

> Note `lang="en"` was the previous value. The CLAUDE.md identifies the project language as `es`, so we change it to `es` here.

- [ ] **Step 3: Verify Studio + Frontend together**

Run: `npm run dev`.
- Open `/admin → Settings`. Add at least one menu link (internal type) and one footer link. Save.
- Open `/`. Expected: Header renders with the link visible. Footer renders with newsletter form, link, country line, copyright. Mobile bottom nav visible if you resize <768 px.

If the home renders blank or errors because the legacy `app/(frontend)/page.tsx` references the now-defunct `home.hero`: that's expected, will be fixed in Phase 3.

- [ ] **Step 4: Lint + typecheck + build**

```bash
npm run lint
npm run typecheck
npm run build
```

Expected: lint clean for new files. Typecheck clean. Build may still fail at runtime on the home page; that's acceptable for Phase 2 close.

- [ ] **Step 5: Commit**

```bash
git add app/(frontend)/layout.tsx components/Layout/index.ts
git commit -m "Wire Header, Footer, MobileBottomNav into root layout"
```

---

### Task 2.7: Phase 2 manual smoke test + close

**Files:** None.

- [ ] **Step 1: Smoke test in browser**

Run: `npm run dev`.
- Resize to 1440 wide → Header sticky at top, MobileBottomNav hidden.
- Scroll → Header transitions through `default → variant2 → variant3` classes (verify via dev tools).
- Resize to 375 wide → MobileBottomNav visible at bottom; Header nav hidden.
- Hover a `menuGroup` link in the desktop nav → MegaMenu appears with items + featured product.
- Submit the newsletter form with a real email → check Mailchimp audience for the new contact.

- [ ] **Step 2: Document Phase 2 closing state**

Append to `docs/superpowers/specs/2026-05-05-mikmax-arquitectura-mvp-design.md` under section 12 (Riesgos):

```
- Phase 2 closed YYYY-MM-DD: Header (4 variants) + MegaMenu + Footer + Newsletter live on `/`.
  Known follow-ups: cart button stub, mobile menu drawer (Phase 7), search input (Phase 9).
```

- [ ] **Step 3: Commit if doc was edited**

```bash
git add docs/superpowers/specs/2026-05-05-mikmax-arquitectura-mvp-design.md
git commit -m "Document Phase 2 close state"
```

---

## Self-Review Checklist (run before handing off)

**Spec coverage (Phases 1–2):**
- ✅ Section 4.1 (`look`/`set`) → Tasks 1.5, 1.6
- ✅ Section 4.2 (`bundleComponent`) → Task 1.3
- ✅ Section 4.3 (8 blocks) → Task 1.4
- ✅ Section 4.4 (refactor `home`, add `pageBuilder` to `page`) → Tasks 1.7, 1.8
- ✅ Section 8.1 (`from()` mixin) and 8.2 (tokens) → Task 1.1
- ✅ Section 7.1 layout (Header, MegaMenu, MobileBottomNav, Footer, NewsletterForm) → Tasks 2.3–2.6
- ⚠️ Section 7.1 `MobileMenu` deferred to Phase 7 (depends on cart drawer; non-blocking now)
- ✅ Section 5.7 server/client split followed: Header server-wrapped, HeaderClient + MegaMenu + MobileBottomNav + NewsletterForm = client islands; Footer server.

**Placeholder scan:** No "TBD"/"TODO"/"implement later" found. Every task has runnable code or commands.

**Type/method consistency:**
- `bundleComponent.productVariant` (reference type) is consistent across `look.components` and `set.components`.
- `discountStrategy` enum values (`sumMinusFixed`/`sumMinusPercent`/`overrideTotal`) match between `look`, `set`, and the spec section 4.1/6.3.
- `MenuGroup.items[]` aligns with the new `menuSettings.links[].menuGroup.items` schema (Task 2.1) and the resolved query shape (Task 2.2).
- `getHeader()` returns `{menu}`, `getFooter()` returns `{footer}` — matches `HeaderProps`/`FooterProps`.

**Out of scope by design:** Cart drawer, MobileMenu, Search, blocks rendering, Home page rewrite — all deferred to Phases 3–9.

---

## Phase 1 + 2 Done Criteria

```
[Phase 1]
□ npm run build completes (admin route may build; home runtime can be broken)
□ Sanity Studio loads with new types: bundleComponent, 8 blocks, look, set
□ Studio shows "Looks" and "Sets" entries in the desk
□ Home singleton refactored to pageBuilder array

[Phase 2]
□ Header renders on every (frontend) route with menu data from Sanity
□ MegaMenu opens on hover/focus over menuGroup items
□ Footer renders with newsletter, link columns, country selector, copyright
□ MobileBottomNav visible <768px
□ Newsletter form posts to /api/subscribeUser and gets a JSON response
□ npm run typecheck passes
□ npm run lint clean for new files
```

---

## Phase 3 onwards

Phase 3 (Day L3) plan will be written **after** Phase 2 closes, so it can incorporate decisions/learnings from L1–L2 (paleta extraída del Figma, compatibilidad con sticky header, dimensiones reales del MegaMenu, etc.).
