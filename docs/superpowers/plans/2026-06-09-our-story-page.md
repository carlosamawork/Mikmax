# Our Story + sistema de páginas estáticas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la página *Our Story* como documento Sanity `page` renderizado por una ruta genérica en la raíz, dejando establecido el sistema reutilizable de páginas estáticas (un bloque `block.twoColumn`) + un componente `Breadcrumb` genérico estrenado en esa página.

**Architecture:** Una página estática = documento `page` con su `pageBuilder` (ya existe en el schema). Se renderiza con el `<PageBuilder>` existente más un bloque nuevo `block.twoColumn` (fila de 2 celdas; cada celda elige texto o imagen/vídeo). La ruta catch-all `app/(frontend)/[...slug]/page.tsx` (hoy redirige a `/`) pasa a resolver `page` por slug. El breadcrumb se generaliza a `components/Common/Breadcrumb` y se usa por página.

**Tech Stack:** Next.js 15 App Router (Server Components), Sanity CMS v3 (GROQ), SCSS modules, TypeScript estricto. **El repo no tiene runner de tests**; la verificación de cada tarea es `npm run typecheck` (+ `npm run lint` / `npm run build` al final) y comprobación visual en `npm run dev`.

**Referencia Figma:** Desktop | Our Story — file `u92pryF41Lr42YVpq1Qxsn`, `node-id=11-4622`.

**Convención de commits:** sin punto y coma en código; mensajes en español tipo `feat(...)`. **Nunca commitear sin que el usuario lo pida** (CLAUDE.md). Cada tarea incluye el commit como paso final; si se ejecuta por subagentes, confirmar con el usuario antes del primer commit.

---

## Estructura de archivos

**Nuevos**
- `sanity/schemas/objects/twoColumnCell.ts` — object compartido de celda (texto | media).
- `sanity/schemas/objects/blocks/twoColumn.ts` — bloque `block.twoColumn` (left/right).
- `sanity/types/objects/blocks/twoColumn.ts` — tipos `TwoColumnCell` / `TwoColumnBlock`.
- `sanity/queries/fragments/pageBuilder.ts` — proyección GROQ compartida del `pageBuilder` (extraída de home + caso twoColumn).
- `sanity/queries/queries/page.ts` — `getPage(slug)`.
- `components/PageBuilder/blocks/TwoColumn/TwoColumn.tsx` + `.module.scss` — render del bloque.
- `components/Common/Breadcrumb/Breadcrumb.tsx` + `.module.scss` — breadcrumb genérico + JSON-LD.

**Modificados**
- `sanity/schemas/index.ts` — registrar `twoColumnCell` en `objects`.
- `sanity/schemas/objects/blocks/index.ts` — registrar `twoColumn` en `blockSchemas`.
- `sanity/types/objects/blocks/index.ts` — añadir `TwoColumnBlock` a la unión `PageBuilderBlock`.
- `sanity/queries/queries/home.ts` — usar el fragmento compartido.
- `components/PageBuilder/PageBuilder.tsx` — `case 'block.twoColumn'`.
- `components/Common/index.ts` — export `Breadcrumb`.
- `app/(frontend)/[...slug]/page.tsx` — resolver `page` (Breadcrumb + PageBuilder) + metadata + `generateStaticParams`.
- `app/api/revalidate/route.ts` — tags `page` / `page:{slug}`.
- `CLAUDE.md` — añadir `page`, `page:{slug}` a "Tags activos hoy".

**Eliminados**
- `components/Product/shared/Breadcrumb.tsx` + `.module.scss` — huérfanos (sin uso actual); sustituidos por el genérico. El cableado del breadcrumb en Product y resto del sitio va en un spec aparte.

---

## Task 1: Schema del bloque `block.twoColumn` + celda compartida

**Files:**
- Create: `sanity/schemas/objects/twoColumnCell.ts`
- Create: `sanity/schemas/objects/blocks/twoColumn.ts`
- Modify: `sanity/schemas/objects/blocks/index.ts`
- Modify: `sanity/schemas/index.ts`

- [ ] **Step 1: Crear el object de celda compartida**

`sanity/schemas/objects/twoColumnCell.ts`:

```ts
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'twoColumnCell',
  title: 'Celda',
  type: 'object',
  fields: [
    defineField({
      name: 'kind',
      title: 'Tipo de celda',
      type: 'string',
      options: {
        list: [
          {title: 'Texto', value: 'text'},
          {title: 'Imagen / vídeo', value: 'media'},
        ],
        layout: 'radio',
      },
      initialValue: 'text',
      validation: (Rule) => Rule.required(),
    }),
    // --- Texto ---
    defineField({
      name: 'body',
      title: 'Texto',
      type: 'body',
      hidden: ({parent}) => parent?.kind !== 'text',
    }),
    // --- Media ---
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
      hidden: ({parent}) => parent?.kind !== 'media',
    }),
    defineField({
      name: 'image',
      title: 'Imagen',
      type: 'image',
      options: {hotspot: true},
      hidden: ({parent}) => parent?.kind !== 'media' || parent?.mediaType !== 'image',
      fields: [defineField({name: 'alt', type: 'string', validation: (Rule) => Rule.required()})],
    }),
    defineField({
      name: 'video',
      title: 'Vídeo',
      type: 'object',
      hidden: ({parent}) => parent?.kind !== 'media' || parent?.mediaType !== 'video',
      fields: [
        defineField({name: 'src', type: 'url'}),
        defineField({name: 'posterAlt', type: 'string'}),
        defineField({name: 'poster', type: 'image'}),
      ],
    }),
    defineField({
      name: 'caption',
      title: 'Rótulo (opc)',
      type: 'string',
      description: 'Texto superpuesto sobre la imagen/vídeo. Vacío = sin rótulo.',
      hidden: ({parent}) => parent?.kind !== 'media',
    }),
    defineField({
      name: 'captionTheme',
      title: 'Color del rótulo',
      type: 'string',
      options: {
        list: [
          {title: 'Claro (blanco)', value: 'light'},
          {title: 'Oscuro (negro)', value: 'dark'},
        ],
        layout: 'radio',
      },
      initialValue: 'light',
      hidden: ({parent}) => parent?.kind !== 'media',
    }),
    defineField({
      name: 'url',
      title: 'URL (opc)',
      type: 'string',
      description: 'Hace clicable la celda entera. Acepta rutas relativas (/...) o URLs absolutas.',
      hidden: ({parent}) => parent?.kind !== 'media',
    }),
  ],
  preview: {
    select: {kind: 'kind', caption: 'caption', media: 'image', body: 'body'},
    prepare({kind, caption, media, body}) {
      if (kind === 'media') {
        return {title: 'Celda media', subtitle: caption || '(sin rótulo)', media}
      }
      const firstBlock = Array.isArray(body) ? body[0] : null
      const text =
        firstBlock?.children
          ?.map((c: {text?: string}) => c.text)
          .filter(Boolean)
          .join(' ') || ''
      return {title: 'Celda texto', subtitle: text.slice(0, 60) || '(vacío)'}
    },
  },
})
```

- [ ] **Step 2: Crear el bloque `block.twoColumn`**

`sanity/schemas/objects/blocks/twoColumn.ts`:

```ts
import {SplitHorizontalIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'block.twoColumn',
  title: 'Módulo 2 columnas',
  type: 'object',
  icon: SplitHorizontalIcon,
  fields: [
    defineField({
      name: 'left',
      title: 'Columna izquierda',
      type: 'twoColumnCell',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'right',
      title: 'Columna derecha',
      type: 'twoColumnCell',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {leftKind: 'left.kind', rightKind: 'right.kind', media: 'left.image'},
    prepare({leftKind, rightKind, media}) {
      const label = (k?: string) => (k === 'media' ? 'media' : 'texto')
      return {title: 'Módulo 2 columnas', subtitle: `${label(leftKind)} | ${label(rightKind)}`, media}
    },
  },
})
```

> Si `SplitHorizontalIcon` no existe en la versión de `@sanity/icons` instalada, usar `BlockElementIcon`.

- [ ] **Step 3: Registrar el bloque en `blockSchemas`**

En `sanity/schemas/objects/blocks/index.ts`, añadir el import y el elemento al array:

```ts
import twoColumn from './twoColumn'
```

Y añadir `twoColumn` al array `blockSchemas` (al final, antes del cierre `]`):

```ts
export const blockSchemas = [
  heroCampaign,
  campaignImageVideo,
  imageWithProduct,
  productModule,
  lookModule,
  setModule,
  featuredSection,
  richText,
  twoColumn,
]
```

- [ ] **Step 4: Registrar el object `twoColumnCell`**

En `sanity/schemas/index.ts`, añadir el import junto a los demás objects:

```ts
import twoColumnCell from './objects/twoColumnCell'
```

Y añadir `twoColumnCell,` dentro del array `const objects = [ ... ]` (p. ej. justo después de `...blockSchemas,`).

- [ ] **Step 5: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS (sin errores nuevos).

- [ ] **Step 6: Commit**

```bash
git add sanity/schemas/objects/twoColumnCell.ts sanity/schemas/objects/blocks/twoColumn.ts sanity/schemas/objects/blocks/index.ts sanity/schemas/index.ts
git commit -m "feat(sanity): bloque block.twoColumn y celda twoColumnCell"
```

---

## Task 2: Tipos TypeScript del bloque

**Files:**
- Create: `sanity/types/objects/blocks/twoColumn.ts`
- Modify: `sanity/types/objects/blocks/index.ts`

- [ ] **Step 1: Crear el archivo de tipos**

`sanity/types/objects/blocks/twoColumn.ts`:

```ts
import type {PortableTextBlock} from '@portabletext/types'
import type {SanityImageRef, SanityVideo} from './heroCampaign'

export type TwoColumnCell =
  | {
      kind: 'text'
      body?: PortableTextBlock[]
    }
  | {
      kind: 'media'
      mediaType?: 'image' | 'video'
      image?: SanityImageRef
      video?: SanityVideo
      caption?: string
      captionTheme?: 'light' | 'dark'
      url?: string
    }

export type TwoColumnBlock = {
  _key: string
  _type: 'block.twoColumn'
  left: TwoColumnCell
  right: TwoColumnCell
}
```

> Verificar que `./heroCampaign` exporta `SanityImageRef` y `SanityVideo` (lo hace; `campaignImageVideo.ts` los importa de ahí). Si `@portabletext/types` no estuviera disponible para import directo, usar `import type {PortableTextBlock} from '@portabletext/react'` (instalado).

- [ ] **Step 2: Añadir a la unión `PageBuilderBlock`**

En `sanity/types/objects/blocks/index.ts`:

1. Añadir el re-export junto a los demás: `export * from './twoColumn'`
2. Añadir el import de tipo: `import type {TwoColumnBlock} from './twoColumn'`
3. Añadir `TwoColumnBlock` a la unión (antes de la línea forward-compat `| {_key: string; _type: string}`):

```ts
export type PageBuilderBlock =
  | HeroCampaignBlock
  | CampaignImageVideoBlock
  | FeaturedSectionBlock
  | ImageWithProductBlock
  | ProductModuleBlock
  | LookModuleBlock
  | SetModuleBlock
  | RichTextBlock
  | TwoColumnBlock
  | {_key: string; _type: string}
```

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add sanity/types/objects/blocks/twoColumn.ts sanity/types/objects/blocks/index.ts
git commit -m "feat(types): TwoColumnBlock en la union PageBuilderBlock"
```

---

## Task 3: Fragmento GROQ compartido + refactor de home + getPage

**Files:**
- Create: `sanity/queries/fragments/pageBuilder.ts`
- Modify: `sanity/queries/queries/home.ts`
- Create: `sanity/queries/queries/page.ts`

- [ ] **Step 1: Extraer la proyección a un fragmento compartido**

`sanity/queries/fragments/pageBuilder.ts` (copiar la proyección actual de `home.ts` y AÑADIR el caso `twoColumn`):

```ts
import {image} from './image'
import {productCardProjection, setCardProjection} from './cards'

// Proyección de un slot imagen/vídeo (heroCampaign, campaignImageVideo, twoColumnCell)
export const mediaProjection = `
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

// Proyección completa de los bloques del pageBuilder. Se asume que el caller
// ya seleccionó _key y _type en el item; este fragmento aporta los campos por tipo.
export const pageBuilderProjection = `
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
    fullBleed,
    narrow
  },
  _type == "block.featuredSection" => {
    slides[]{
      _key,
      image{
        ${image},
        "alt": alt
      },
      title,
      url
    }
  },
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
  _type == "block.productModule" => {
    title,
    layout,
    source,
    "products": select(
      source == "manual" => manualProducts[]->{ ${productCardProjection} },
      []
    )
  },
  _type == "block.lookModule" => {
    title,
    layout,
    "looks": looks[]->{ ${setCardProjection} }
  },
  _type == "block.setModule" => {
    title,
    subtitle,
    "product": product->{ ${productCardProjection} },
    images[]{
      ${image},
      "alt": alt
    }
  },
  _type == "block.richText" => {
    body
  },
  _type == "block.twoColumn" => {
    left{ kind, body, ${mediaProjection}, caption, captionTheme, url },
    right{ kind, body, ${mediaProjection}, caption, captionTheme, url }
  }
`
```

- [ ] **Step 2: Refactor de `home.ts` para usar el fragmento**

Reemplazar el contenido de `sanity/queries/queries/home.ts` por:

```ts
import {groq} from 'next-sanity'
import {client} from '..'
import type {HomeData} from '@/sanity/types'
import {seo} from '../fragments/seo'
import {pageBuilderProjection} from '../fragments/pageBuilder'

export async function getHome(): Promise<HomeData> {
  const result = await client.fetch<HomeData | null>(
    groq`*[_type == "home"][0]{
      _id,
      pageBuilder[]{
        _key,
        _type,
        ${pageBuilderProjection}
      }
    }`,
    {},
    // La home renderiza productos y looks: suscribirse a sus tipos para refrescarla.
    {next: {tags: ['home', 'product', 'look'], revalidate: 3600}},
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

> El `mediaProjection` local previo de `home.ts` se elimina (ahora vive en el fragmento). Verificar que la import de `image`/`cards` ya no quede sin uso en `home.ts` (se eliminan).

- [ ] **Step 3: Crear `getPage`**

`sanity/queries/queries/page.ts`:

```ts
import {groq} from 'next-sanity'
import {client} from '..'
import {seo} from '../fragments/seo'
import {pageBuilderProjection} from '../fragments/pageBuilder'
import type {PageBuilderBlock} from '@/sanity/types'

export type PageData = {
  _id: string
  title: string
  slug: string
  pageBuilder?: PageBuilderBlock[]
  seo?: {
    title?: string
    description?: string
    image?: unknown
  }
}

export async function getPageSlugs(): Promise<string[]> {
  const slugs = await client.fetch<string[]>(
    groq`*[_type == "page" && defined(slug.current)].slug.current`,
    {},
    {next: {tags: ['page'], revalidate: 3600}},
  )
  return slugs ?? []
}

export async function getPage(slug: string): Promise<PageData | null> {
  const result = await client.fetch<PageData | null>(
    groq`*[_type == "page" && slug.current == $slug][0]{
      _id,
      title,
      "slug": slug.current,
      pageBuilder[]{
        _key,
        _type,
        ${pageBuilderProjection}
      },
      seo{
        ${seo}
      }
    }`,
    {slug},
    {next: {tags: ['page', 'product', 'look', `page:${slug}`], revalidate: 3600}},
  )
  return result ?? null
}
```

- [ ] **Step 4: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add sanity/queries/fragments/pageBuilder.ts sanity/queries/queries/home.ts sanity/queries/queries/page.ts
git commit -m "refactor(queries): fragmento pageBuilder compartido + getPage"
```

---

## Task 4: Componente de render `TwoColumn`

**Files:**
- Create: `components/PageBuilder/blocks/TwoColumn/TwoColumn.tsx`
- Create: `components/PageBuilder/blocks/TwoColumn/TwoColumn.module.scss`
- Modify: `components/PageBuilder/PageBuilder.tsx`

- [ ] **Step 1: Crear el SCSS (mobile-first)**

`components/PageBuilder/blocks/TwoColumn/TwoColumn.module.scss`:

```scss
@use '@/styles/common/variables' as *;

.row {
  display: flex;
  flex-direction: column;
  gap: px(1);
  padding: 0 px(5);

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: stretch;
  }
}

.cell {
  position: relative;
  flex: 1 0 0;
  min-width: 0;
  overflow: hidden;

  @media (min-width: 1024px) {
    height: px(450);
  }
}

// --- Celda de texto ---
.text {
  display: flex;
  align-items: flex-end;
  background: map-get($colors, 'white');
  padding: px(15);

  .body {
    font-size: px(16);
    line-height: px(19);
    letter-spacing: px(0.5);
    color: map-get($colors, 'black-border');
    max-width: px(680);
  }
}

// --- Celda media ---
.media {
  display: flex;
  align-items: flex-end;

  .asset,
  .img,
  .video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  // En móvil, sin altura fija, reservar proporción para que la imagen se vea
  aspect-ratio: 3 / 4;

  @media (min-width: 1024px) {
    aspect-ratio: auto;
  }

  .caption {
    position: relative;
    z-index: 1;
    padding: px(29) px(17);
    font-size: px(14);
    line-height: px(20);
    font-family: $MonumentGrotesk;
  }

  .captionLight {
    color: map-get($colors, 'white');
  }

  .captionDark {
    color: map-get($colors, 'black-border');
  }
}

.link {
  display: block;
  height: 100%;
  text-decoration: none;
  color: inherit;
}
```

- [ ] **Step 2: Crear el componente**

`components/PageBuilder/blocks/TwoColumn/TwoColumn.tsx`:

```tsx
import Link from 'next/link'
import {LazyImage, LazyVideo} from '@/components/Common'
import PortableText from '@/components/PageBuilder/PortableText/PortableText'
import type {TwoColumnBlock, TwoColumnCell} from '@/sanity/types'
import s from './TwoColumn.module.scss'

interface Props {
  block: TwoColumnBlock
}

function MediaInner({cell}: {cell: Extract<TwoColumnCell, {kind: 'media'}>}) {
  const captionCls = cell.captionTheme === 'dark' ? s.captionDark : s.captionLight
  const media = (() => {
    if (cell.mediaType === 'video' && cell.video?.src) {
      return (
        <LazyVideo
          src={cell.video.src}
          poster={cell.video.poster?.imageUrl}
          posterAlt={cell.video.posterAlt}
          className={s.asset}
          autoPlay
          muted
          loop
          playsInline
        />
      )
    }
    if (cell.image?.imageUrl) {
      const w = cell.image.metadata?.dimensions?.width ?? 1440
      const h = cell.image.metadata?.dimensions?.height ?? 810
      return (
        <LazyImage
          src={cell.image.imageUrl}
          alt={cell.image.alt ?? ''}
          width={w}
          height={h}
          className={s.img}
        />
      )
    }
    return null
  })()

  return (
    <>
      {media}
      {cell.caption && <p className={`${s.caption} ${captionCls}`}>{cell.caption}</p>}
    </>
  )
}

function Cell({cell}: {cell: TwoColumnCell}) {
  if (cell.kind === 'text') {
    return (
      <div className={`${s.cell} ${s.text}`}>
        <PortableText value={cell.body} className={s.body} />
      </div>
    )
  }

  const inner = <MediaInner cell={cell} />

  if (!cell.url) {
    return <div className={`${s.cell} ${s.media}`}>{inner}</div>
  }
  if (cell.url.startsWith('/')) {
    return (
      <div className={`${s.cell} ${s.media}`}>
        <Link href={cell.url} className={s.link}>
          {inner}
        </Link>
      </div>
    )
  }
  return (
    <div className={`${s.cell} ${s.media}`}>
      <a href={cell.url} target="_blank" rel="noopener noreferrer" className={s.link}>
        {inner}
      </a>
    </div>
  )
}

export default function TwoColumn({block}: Props) {
  return (
    <section className={s.row}>
      <Cell cell={block.left} />
      <Cell cell={block.right} />
    </section>
  )
}
```

> `LazyVideo`/`LazyImage` y `PortableText` siguen exactamente la firma usada en `CampaignImageVideo.tsx`. Las clases `.asset` (absolute inset) aplican tanto a `.img` como `.video` vía `className`.

- [ ] **Step 3: Registrar el case en `PageBuilder.tsx`**

En `components/PageBuilder/PageBuilder.tsx`:

1. Añadir el import de tipo en el bloque de imports de `@/sanity/types`: `TwoColumnBlock`.
2. Añadir el import del componente: `import TwoColumn from './blocks/TwoColumn/TwoColumn'`
3. Añadir el case dentro del `switch` (antes de `default`):

```tsx
          case 'block.twoColumn':
            return <TwoColumn key={block._key} block={block as TwoColumnBlock} />
```

- [ ] **Step 4: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/PageBuilder/blocks/TwoColumn components/PageBuilder/PageBuilder.tsx
git commit -m "feat(pagebuilder): render del bloque TwoColumn"
```

---

## Task 5: Componente `Breadcrumb` genérico + borrar el huérfano

**Files:**
- Create: `components/Common/Breadcrumb/Breadcrumb.tsx`
- Create: `components/Common/Breadcrumb/Breadcrumb.module.scss`
- Modify: `components/Common/index.ts`
- Delete: `components/Product/shared/Breadcrumb.tsx`, `components/Product/shared/Breadcrumb.module.scss`

- [ ] **Step 1: Crear el SCSS (reutiliza los estilos del actual)**

`components/Common/Breadcrumb/Breadcrumb.module.scss`:

```scss
@use '@/styles/common/variables' as *;

.breadcrumb {
  padding: px(8) px(7);
}

.list {
  display: flex;
  gap: px(15);
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: px(9);
  letter-spacing: px(0.5);
  text-transform: uppercase;
  color: map-get($colors, 'gray-light');
  font-family: $MonumentGrotesk;

  li[aria-current='page'] {
    color: map-get($colors, 'black-border');
  }

  a {
    color: inherit;
    text-decoration: none;
  }
}
```

- [ ] **Step 2: Crear el componente genérico + JSON-LD**

`components/Common/Breadcrumb/Breadcrumb.tsx`:

```tsx
import Link from 'next/link'
import {BASE_URL} from '@/utils/seoHelper'
import s from './Breadcrumb.module.scss'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface Props {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({items}: Props) {
  if (!items?.length) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? {item: new URL(item.href, BASE_URL).toString()} : {}),
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
      />
      <nav className={s.breadcrumb} aria-label="Breadcrumb">
        <ol className={s.list}>
          {items.map((item, i) => {
            const isLast = i === items.length - 1
            return (
              <li key={`${item.label}-${i}`} aria-current={isLast ? 'page' : undefined}>
                {item.href && !isLast ? <Link href={item.href}>{item.label}</Link> : item.label}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
```

- [ ] **Step 3: Exportar desde `Common/index.ts`**

Añadir a `components/Common/index.ts`:

```ts
export {default as Breadcrumb} from './Breadcrumb/Breadcrumb'
export type {BreadcrumbItem} from './Breadcrumb/Breadcrumb'
```

- [ ] **Step 4: Borrar el Breadcrumb huérfano de Product**

```bash
git rm components/Product/shared/Breadcrumb.tsx components/Product/shared/Breadcrumb.module.scss
```

> Confirmado que no tiene usos (solo se auto-importaba su SCSS). El cableado del breadcrumb en la página de Product va en el spec de rollout aparte.

- [ ] **Step 5: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS (sin imports rotos al Breadcrumb borrado).

- [ ] **Step 6: Commit**

```bash
git add components/Common/Breadcrumb components/Common/index.ts
git commit -m "feat(common): Breadcrumb generico con JSON-LD; elimina el de Product"
```

---

## Task 6: Ruta que resuelve documentos `page`

**Files:**
- Modify: `app/(frontend)/[...slug]/page.tsx`

- [ ] **Step 1: Reemplazar el catch-all por la resolución de `page`**

Contenido completo de `app/(frontend)/[...slug]/page.tsx`:

```tsx
import type {Metadata} from 'next'
import {permanentRedirect} from 'next/navigation'
import {Breadcrumb} from '@/components/Common'
import {PageBuilder} from '@/components/PageBuilder'
import {getPage, getPageSlugs} from '@/sanity/queries/queries/page'
import {urlFor} from '@/sanity/queries'
import {BASE_URL, siteTitle, siteDescription} from '@/utils/seoHelper'

export const revalidate = 3600

export async function generateStaticParams() {
  const slugs = await getPageSlugs()
  return slugs.map((slug) => ({slug: [slug]}))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{slug: string[]}>
}): Promise<Metadata> {
  const {slug} = await params
  const handle = slug?.join('/') ?? ''
  const page = await getPage(handle)
  if (!page) return {title: `Not found | ${siteTitle}`}

  const title = page.seo?.title || page.title
  const description = page.seo?.description || siteDescription
  const canonical = `${BASE_URL.origin}/${page.slug}`
  const ogImageUrl = page.seo?.image ? urlFor(page.seo.image).width(1200).url() : undefined

  return {
    title: `${title} | ${siteTitle}`,
    description,
    alternates: {canonical},
    openGraph: {
      title,
      description,
      url: canonical,
      ...(ogImageUrl ? {images: [{url: ogImageUrl}]} : {}),
    },
  }
}

export default async function CatchAllPage({params}: {params: Promise<{slug: string[]}>}) {
  const {slug} = await params
  const handle = slug?.join('/') ?? ''
  const page = await getPage(handle)

  // Slug desconocido → conserva el comportamiento previo (redirección a home).
  if (!page) permanentRedirect('/')

  return (
    <>
      <Breadcrumb items={[{label: 'Home', href: '/'}, {label: page.title}]} />
      <PageBuilder blocks={page.pageBuilder} />
    </>
  )
}
```

> `urlFor` se importa desde `@/sanity/queries` (igual que en `legal/[section]/page.tsx`). Si TypeScript se queja del tipo de `page.seo.image` en `urlFor(...)`, castear: `urlFor(page.seo.image as never)` — el patrón de legal usa el mismo helper con `section.seo?.image`.

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "app/(frontend)/[...slug]/page.tsx"
git commit -m "feat(routing): ruta raiz resuelve documentos page (Our Story)"
```

---

## Task 7: Revalidación on-demand de `page`

**Files:**
- Modify: `app/api/revalidate/route.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Añadir el manejo del tipo `page` en el webhook**

En `app/api/revalidate/route.ts`, tras el bloque `if (body._type === 'look') { ... }`, añadir:

```ts
    if (body._type === 'page') {
      if (body.slug) tags.push(`page:${body.slug}`)
    }
```

> El tag base `page` ya se añade por `const tags: string[] = [body._type]`. Esto añade el específico por slug.

- [ ] **Step 2: Registrar los tags en CLAUDE.md**

En `CLAUDE.md`, en la línea "**Tags activos hoy:**", añadir `page`, `page:{slug}` a la lista.

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/revalidate/route.ts CLAUDE.md
git commit -m "feat(revalidate): tags page y page:{slug}"
```

---

## Task 8: Verificación final, contenido en Sanity y comprobación visual

**Files:** (ninguno de código)

- [ ] **Step 1: Lint + typecheck + build**

Run:
```bash
npm run typecheck && npm run lint && npm run build
```
Expected: los tres PASS sin errores. (El build valida que la ruta catch-all y `generateStaticParams` compilan; si no hay aún documentos `page`, `generateStaticParams` devuelve `[]` y es válido.)

- [ ] **Step 2: Crear el documento Our Story en el Studio**

1. `npm run dev` y abrir `http://localhost:3000/admin`.
2. Crear un documento **Page** nuevo (el tipo `page` ya está registrado como documento creable).
3. Title: `Our Story`; Slug: `our-story`.
4. En **Page builder**, añadir bloques **Módulo 2 columnas** reproduciendo el Figma:
   - Fila 1: izquierda = Texto (párrafos de Our Story); derecha = Media (imagen) con rótulo `Mikmax for Business`, theme claro, url `/mikmax-for-business` (o la que corresponda).
   - Fila 2: izquierda = Media (imagen, sin rótulo); derecha = Media (imagen) con rótulo.
   - Fila 3: izquierda = Texto; derecha = Media con rótulo.
   - Fila 4: izquierda = Media; derecha = Media con rótulo `Follow us on Instagram`.
5. Rellenar SEO (opcional) y **Publish**.

- [ ] **Step 3: Comprobación visual**

1. Abrir `http://localhost:3000/our-story`.
2. Verificar contra el Figma:
   - Breadcrumb `HOME / OUR STORY` bajo el header.
   - Filas a dos columnas con gutter de 1px; texto sobre fondo blanco alineado abajo-izquierda; imágenes a sangre con rótulos en la esquina inferior izquierda.
   - Responsive: en móvil las celdas se apilan a ancho completo.
   - Las celdas con `url` son clicables; rótulos vacíos no muestran texto.
3. Verificar que un slug inexistente (p. ej. `/no-existe`) redirige a `/`.
4. (SEO) Inspeccionar el HTML: existe `<script type="application/ld+json">` con `BreadcrumbList`.

- [ ] **Step 4: Verificación de revalidación (opcional, si hay webhook configurado)**

Editar el texto de un bloque en el Studio, **Publish**, y confirmar que `/our-story` refleja el cambio tras la revalidación (tag `page` / `page:our-story`).

- [ ] **Step 5: Commit (si hubo ajustes visuales)**

Si la comprobación visual requirió tocar SCSS/markup, commitear los ajustes:

```bash
git add -A
git commit -m "fix(our-story): ajustes pixel-perfect tras revision visual"
```

---

## Notas de cierre

- **Fuera de alcance (spec aparte):** rollout del `Breadcrumb` al resto del sitio (product, shop/collection, looks, lookbook, legal, search) con sus rastros y JSON-LD.
- **Skills recomendadas durante la ejecución:** `figma-maquetador` y `pixel-perfect` para el ajuste fino visual del Task 4/8; `sanity-schema-builder` como referencia en Task 1.
- **Decisiones abiertas que el usuario dejó al criterio del implementador** (del spec): texto = PortableText (elegido), `captionTheme` light/dark (incluido), fallback de ruta = `redirect('/')` (mantenido). Cambiar a `notFound()` si se prefiere un 404 real.
