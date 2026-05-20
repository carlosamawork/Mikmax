# Legal Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear una página `/legal/[section]` con sidebar tipo `ProductInfoPanel` donde cada texto legal (Privacy Policy, Terms, Cookies, Legal Notice) es su propia URL, gestionada desde un singleton Sanity `legalPage` con array de secciones.

**Architecture:** Singleton Sanity `legalPage` con `sections[]{title, slug, body, seo}` + SEO global de fallback. Frontend con server route dinámica que hace SSG de todos los slugs, Server Component `LegalLayout` que renderiza PortableText + Client Component `LegalSidebar` con `usePathname` para el activo. `/legal` redirige a la primera sección.

**Tech Stack:** Next.js 15 App Router · React Server Components · Sanity v3 (singleton + GROQ) · TypeScript · SCSS modules · `@portabletext/react`.

**Spec:** `docs/superpowers/specs/2026-05-19-legal-page-design.md`

**Testing approach:** Este repo no tiene framework de tests. Validamos con `npm run typecheck`, `npm run lint`, y verificación manual en el dev server (Studio + ruta pública). Cada task termina con un checkpoint de verificación.

---

## Task 1: Schema Sanity del singleton `legalPage`

**Files:**
- Create: `sanity/schemas/singletons/legal.ts`
- Modify: `sanity/schemas/index.ts` (registrar el singleton)

- [ ] **Step 1: Crear el schema**

Archivo nuevo `sanity/schemas/singletons/legal.ts`:

```ts
import {DocumentTextIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

const TITLE = 'Legal Page'

export default defineType({
  name: 'legalPage',
  title: TITLE,
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    {default: true, name: 'editorial', title: 'Editorial'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      initialValue: 'Legal',
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      description:
        'Cada sección es un texto legal con su propio slug y SEO. El orden aquí define el orden en la sidebar.',
      type: 'array',
      group: 'editorial',
      of: [
        defineField({
          name: 'legalSection',
          title: 'Section',
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'slug',
              title: 'Slug',
              type: 'slug',
              options: {source: 'title', maxLength: 96},
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'body',
              title: 'Body',
              type: 'body',
            }),
            defineField({
              name: 'seo',
              title: 'SEO',
              type: 'seo.page',
            }),
          ],
          preview: {
            select: {title: 'title', subtitle: 'slug.current'},
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'seo',
      title: 'SEO (fallback)',
      description:
        'SEO usado para /legal y como fallback cuando una sección no tiene SEO propio.',
      type: 'seo.page',
      group: 'seo',
    }),
  ],
  preview: {
    prepare() {
      return {subtitle: 'Singleton', title: TITLE}
    },
  },
})
```

- [ ] **Step 2: Registrar el singleton en `sanity/schemas/index.ts`**

Encontrar el bloque (línea ~27):

```ts
import home from './singletons/home'
import settings from './singletons/settings'

const singletons = [home, settings]
```

Reemplazarlo por:

```ts
import home from './singletons/home'
import settings from './singletons/settings'
import legalPage from './singletons/legal'

const singletons = [home, settings, legalPage]
```

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: exit 0, sin errores nuevos. Si TS se queja porque el type `LegalPageData` ya existe con un shape distinto, se corrige en la Task 2.

- [ ] **Step 4: Commit**

```bash
git add sanity/schemas/singletons/legal.ts sanity/schemas/index.ts
git commit -m "feat(sanity): add legalPage singleton schema"
```

---

## Task 2: Tipos TypeScript de `legalPage`

**Files:**
- Modify: `sanity/types/singletons/legal.ts` (actualizar shape)

- [ ] **Step 1: Reemplazar el contenido del archivo**

`sanity/types/singletons/legal.ts`:

```ts
import type {PortableTextBlock} from 'next-sanity'
import type {SEO} from '../objects/seo'

export type LegalSection = {
  title: string
  slug: string
  body?: PortableTextBlock[]
  seo?: SEO
}

export type LegalPageData = {
  title: string
  sections: LegalSection[]
  seo?: SEO
}
```

Notas:
- `body` es opcional para tolerar secciones a medio rellenar en Studio.
- Reutilizamos el type `SEO` existente (`sanity/types/objects/seo/seo.ts`) que ya casa con el fragment GROQ `seo`.

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add sanity/types/singletons/legal.ts
git commit -m "feat(types): update LegalPageData to match schema"
```

---

## Task 3: Estructura del desk para el singleton

**Files:**
- Create: `sanity/desk/legalPageStructure.ts`
- Modify: `sanity/desk/index.ts` (añadir al árbol + a `hiddenDocTypes`)

- [ ] **Step 1: Crear `sanity/desk/legalPageStructure.ts`**

```ts
import defineStructure from '../utils/defineStructure'
import {DocumentTextIcon} from '@sanity/icons'

export default defineStructure((S) =>
  S.listItem()
    .title('Legal Page')
    .icon(DocumentTextIcon)
    .schemaType('legalPage')
    .child(
      S.editor()
        .title('Legal Page')
        .schemaType('legalPage')
        .documentId('legalPage'),
    ),
)
```

- [ ] **Step 2: Registrar en `sanity/desk/index.ts`**

Reemplazar:

```ts
import settings from './settingStructure'
```

Por:

```ts
import settings from './settingStructure'
import legalPage from './legalPageStructure'
```

Encontrar el array `hiddenDocTypes` (línea ~40) y añadir `'legalPage'`:

```ts
return ![
  'collection',
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
  'orderable.collection',
  'look',
  'orderable.look',
  'set',
  'orderable.set',
  'legalPage',
].includes(id)
```

En el `S.list().items([...])` del `structure` (línea ~64), insertar `legalPage(S, context)` después de `settings(S, context)`:

```ts
settings(S, context),
legalPage(S, context),
S.divider(),
```

- [ ] **Step 3: Arrancar dev y abrir Studio para validar**

Run: `npm run dev`

Abrir `http://localhost:3000/admin`. Debe verse "Legal Page" en la sidebar del Studio. Click → abre el editor con campos `Title`, `Sections`, `SEO`.

Crear el documento, añadir 2 secciones mínimas (p.ej. "Privacy Policy" y "Terms"), rellenar `slug` y un par de párrafos en `body`, publicar.

**Si el slug no auto-genera al teclear el title:** Sanity lo hace automáticamente con `options: {source: 'title'}`; si no aparece el botón "Generate", revisar que el field `slug` esté definido en el schema (Task 1).

- [ ] **Step 4: Detener dev y commit**

```bash
git add sanity/desk/legalPageStructure.ts sanity/desk/index.ts
git commit -m "feat(sanity): add Legal Page singleton to desk structure"
```

---

## Task 4: Eliminar el boolean `legal` de `page`

**Files:**
- Modify: `sanity/schemas/documents/page.ts` (eliminar field)

- [ ] **Step 1: Eliminar el field**

En `sanity/schemas/documents/page.ts`, borrar el bloque completo (líneas 41-48):

```ts
defineField({
  name: 'legal',
  title: 'Legal',
  type: 'boolean',
  description: 'Escoge esta opción si es una página de tipo legal',
  initialValue: false,
  group: 'editorial',
}),
```

- [ ] **Step 2: Verificar que ningún consumidor lo usa**

Run: `grep -rn "legal" sanity/ app/ components/ lib/ utils/ types/ hooks/ context/ 2>/dev/null | grep -v "legalPage\|LegalPage\|LegalSection\|legal.ts\|Legal/"`
Expected: sin coincidencias (o solo coincidencias casuales en palabras como "legalSection"). Si aparece algún uso real del field, no eliminar — pausar y reportar.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add sanity/schemas/documents/page.ts
git commit -m "chore(sanity): remove unused legal boolean from page schema"
```

---

## Task 5: Query GROQ de legalPage

**Files:**
- Create: `sanity/queries/queries/legal.ts`

- [ ] **Step 1: Crear el archivo**

```ts
// sanity/queries/queries/legal.ts
import {groq} from 'next-sanity'
import {client} from '..'
import type {LegalPageData} from '@/sanity/types'
import {seo} from '../fragments/seo'
import {body} from '../fragments/body'

const LEGAL_PAGE_QUERY = groq`*[_type == "legalPage"][0]{
  title,
  sections[]{
    title,
    "slug": slug.current,
    body[]{
      ${body}
    },
    seo{
      ${seo}
    }
  },
  seo{
    ${seo}
  }
}`

export async function getLegalPage(): Promise<LegalPageData | null> {
  const result = await client.fetch<LegalPageData | null>(
    LEGAL_PAGE_QUERY,
    {},
    {next: {tags: ['legalPage'], revalidate: 3600}},
  )
  return result ?? null
}
```

Notas:
- Reutiliza fragments `seo` y `body` existentes (cumple con CLAUDE.md "queries solo en `sanity/queries/`").
- `revalidate: 3600` (1h) coincide con el patrón de `home`/`settings`.
- Devuelve `null` si el singleton aún no existe en el dataset (caso primer despliegue).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0. Si TS se queja de que `LegalPageData` no está exportado, verificar que `sanity/types/singletons/index.ts` hace `export * from './legal'` (ya lo hace).

- [ ] **Step 3: Commit**

```bash
git add sanity/queries/queries/legal.ts
git commit -m "feat(sanity): add legalPage GROQ query"
```

---

## Task 6: Componente `LegalSidebar` (Client)

**Files:**
- Create: `components/Legal/LegalSidebar.tsx`
- Create: `components/Legal/LegalSidebar.module.scss`

- [ ] **Step 1: Crear el SCSS module**

`components/Legal/LegalSidebar.module.scss`:

```scss
@use '@/styles/common/variables' as *;
@use '@/styles/mixins/mixins' as *;

.list {
  display: flex;
  flex-direction: column;
  list-style: none;
  padding: 0;
  margin: 0;
}

.item {
  display: block;
}

.link {
  display: block;
  text-align: left;
  padding: px(18) px(20);
  border-bottom: 1px solid map-get($colors, 'lightgray-bg');
  font-family: $MonumentGrotesk;
  font-size: px(11);
  letter-spacing: px(0.5);
  color: map-get($colors, 'gray-light');
  text-decoration: none;
  cursor: pointer;

  &:hover {
    color: map-get($colors, 'black-border');
  }
}

.linkActive {
  color: map-get($colors, 'black-border');
}

@include responsive('md') {
  .list {
    flex-direction: row;
    overflow-x: auto;
    border-bottom: 1px solid map-get($colors, 'lightgray-bg');
  }

  .item {
    flex-shrink: 0;
  }

  .link {
    white-space: nowrap;
    border-bottom: none;
    border-right: 1px solid map-get($colors, 'lightgray-bg');
    padding: px(14) px(16);
  }
}
```

- [ ] **Step 2: Crear el componente**

`components/Legal/LegalSidebar.tsx`:

```tsx
'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import s from './LegalSidebar.module.scss'

type Item = {title: string; slug: string}

interface Props {
  sections: Item[]
}

export default function LegalSidebar({sections}: Props) {
  const pathname = usePathname()
  return (
    <nav aria-label="Legal sections">
      <ul className={s.list}>
        {sections.map((section, i) => {
          const href = `/legal/${section.slug}`
          const isActive = pathname === href || pathname === `${href}/`
          return (
            <li key={section.slug} className={s.item}>
              <Link
                href={href}
                className={[s.link, isActive ? s.linkActive : ''].filter(Boolean).join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                {i + 1}. {section.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

Nota: el chequeo `pathname === ${href}/` cubre el `trailingSlash: true` activo en `next.config.js`.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/Legal/LegalSidebar.tsx components/Legal/LegalSidebar.module.scss
git commit -m "feat(legal): add LegalSidebar client component"
```

---

## Task 7: Componente `LegalLayout` (Server)

**Files:**
- Create: `components/Legal/LegalLayout.tsx`
- Create: `components/Legal/LegalLayout.module.scss`

- [ ] **Step 1: Crear el SCSS module**

`components/Legal/LegalLayout.module.scss`:

```scss
@use '@/styles/common/variables' as *;
@use '@/styles/mixins/mixins' as *;

.wrapper {
  display: flex;
  width: 100%;
  max-width: px(1072);
  margin: px(40) auto;
  background: map-get($colors, 'white');
  font-family: $MonumentGrotesk;
  min-height: px(480);
}

.title {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sidebar {
  width: px(306);
  flex-shrink: 0;
  border-right: 1px solid map-get($colors, 'lightgray-bg');
}

.content {
  flex: 1;
  padding: px(18) px(20);
  font-size: px(12);
  line-height: 1.6;

  p,
  ul,
  ol {
    font-size: px(12);
    line-height: 1.6;
  }

  ul {
    list-style-type: disc;
  }
}

.empty {
  color: map-get($colors, 'gray-light');
  font-style: italic;
  font-size: px(11);
}

@include responsive('md') {
  .wrapper {
    flex-direction: column;
    margin: px(24) 0;
    max-width: none;
  }

  .sidebar {
    width: 100%;
    border-right: none;
  }
}
```

Notas:
- `.title` está visually-hidden (el título del singleton no se muestra; las secciones tienen sus propios títulos en su `body` PortableText). Si en revisión se decide mostrarlo, basta con quitar las reglas de visually-hidden.
- Mismo lenguaje visual que `ProductInfoPanel.module.scss` (`306px` sidebar, `MonumentGrotesk`, `font-size: px(11/12)`, mismos colores).
- Sin `position: fixed`, sin botón close: es página normal.

- [ ] **Step 2: Crear el componente**

`components/Legal/LegalLayout.tsx`:

```tsx
import PortableText from '@/components/PageBuilder/PortableText/PortableText'
import type {LegalPageData} from '@/sanity/types'
import LegalSidebar from './LegalSidebar'
import s from './LegalLayout.module.scss'

interface Props {
  data: LegalPageData
  activeSlug: string
}

export default function LegalLayout({data, activeSlug}: Props) {
  const activeSection = data.sections.find((sec) => sec.slug === activeSlug)
  const sidebarItems = data.sections.map((sec) => ({title: sec.title, slug: sec.slug}))

  return (
    <section className={s.wrapper}>
      <h1 className={s.title}>{data.title}</h1>
      <aside className={s.sidebar}>
        <LegalSidebar sections={sidebarItems} />
      </aside>
      <div className={s.content}>
        {activeSection?.body && activeSection.body.length > 0 ? (
          <PortableText value={activeSection.body} />
        ) : (
          <p className={s.empty}>No content yet.</p>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/Legal/LegalLayout.tsx components/Legal/LegalLayout.module.scss
git commit -m "feat(legal): add LegalLayout server component"
```

---

## Task 8: Ruta `/legal` (redirect)

**Files:**
- Create: `app/(frontend)/legal/page.tsx`

- [ ] **Step 1: Crear el archivo**

```tsx
import {notFound, redirect} from 'next/navigation'
import {getLegalPage} from '@/sanity/queries/queries/legal'

export const revalidate = 3600

export default async function LegalIndexPage() {
  const data = await getLegalPage()
  const first = data?.sections?.[0]
  if (!first) notFound()
  redirect(`/legal/${first.slug}`)
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add "app/(frontend)/legal/page.tsx"
git commit -m "feat(legal): add /legal redirect to first section"
```

---

## Task 9: Ruta dinámica `/legal/[section]`

**Files:**
- Create: `app/(frontend)/legal/[section]/page.tsx`

- [ ] **Step 1: Crear el archivo**

```tsx
import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getLegalPage} from '@/sanity/queries/queries/legal'
import {BASE_URL, siteTitle, siteDescription} from '@/utils/seoHelper'
import {urlFor} from '@/sanity/queries'
import LegalLayout from '@/components/Legal/LegalLayout'

export const revalidate = 3600

export async function generateStaticParams() {
  const data = await getLegalPage()
  return (data?.sections ?? []).map((sec) => ({section: sec.slug}))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{section: string}>
}): Promise<Metadata> {
  const {section: slug} = await params
  const data = await getLegalPage()
  const section = data?.sections.find((sec) => sec.slug === slug)
  if (!section) return {title: `Not found | ${siteTitle}`}

  const title = section.seo?.title || section.title
  const description =
    section.seo?.description || data?.seo?.description || siteDescription
  const canonical = `${BASE_URL.origin}/legal/${section.slug}`

  const ogImageSource = section.seo?.image || data?.seo?.image
  const ogImageUrl = ogImageSource ? urlFor(ogImageSource).width(1200).url() : undefined

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

export default async function LegalSectionPage({
  params,
}: {
  params: Promise<{section: string}>
}) {
  const {section: slug} = await params
  const data = await getLegalPage()
  if (!data) notFound()
  const section = data.sections.find((sec) => sec.slug === slug)
  if (!section) notFound()
  return <LegalLayout data={data} activeSlug={section.slug} />
}
```

Notas:
- `params` es `Promise<...>` (Next 15 — mismo patrón que `app/(frontend)/products/[handle]/page.tsx`).
- `urlFor` viene de `sanity/queries/index.tsx` (helper existente).
- Si el fragment `seo` proyecta `image{...}` con un objeto Sanity, `urlFor` lo acepta. Si genera errores en runtime por shape inesperado, fallback: omitir `images` en OG.

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add "app/(frontend)/legal/[section]/page.tsx"
git commit -m "feat(legal): add /legal/[section] dynamic route with SSG and metadata"
```

---

## Task 10: Verificación manual end-to-end

- [ ] **Step 1: Dev server**

Run: `npm run dev`

- [ ] **Step 2: Validar que el singleton tiene datos**

Abrir `http://localhost:3000/admin` → Legal Page. Confirmar al menos 2 secciones publicadas con `slug` y `body` no vacíos. Si no las hay, crearlas (Privacy Policy + Terms con un par de párrafos cada una).

- [ ] **Step 3: Probar `/legal`**

Abrir `http://localhost:3000/legal/`. Esperado: redirect a `/legal/<slug-primera-section>/`.

- [ ] **Step 4: Probar `/legal/<slug>`**

Abrir `http://localhost:3000/legal/privacy-policy/` (o el slug que hayas creado). Esperado:
- Sidebar a la izquierda con todas las secciones numeradas (`1. Privacy Policy`, `2. Terms`, ...).
- Sección activa resaltada en negro, las otras en gris claro.
- Contenido a la derecha con el body renderizado por `PortableText`.

- [ ] **Step 5: Probar navegación**

Click en otra sección de la sidebar → la URL cambia, el contenido cambia, el resaltado se mueve. Refrescar → estado consistente.

- [ ] **Step 6: Probar slug inexistente**

Abrir `http://localhost:3000/legal/no-existe/`. Esperado: página 404 del proyecto (`app/(frontend)/not-found.tsx`).

- [ ] **Step 7: Probar mobile**

Reducir viewport a < 768px. Esperado: sidebar pasa a tabs horizontales scrollables encima del contenido. El item activo sigue resaltado.

- [ ] **Step 8: Probar metadata**

Click derecho → "View page source" en `/legal/privacy-policy/`. Verificar:
- `<title>` contiene el título de la sección + ` | Mikmax`.
- `<meta name="description">` está presente.
- `<link rel="canonical" href="https://.../legal/privacy-policy">`.

- [ ] **Step 9: Build de producción**

Run: `npm run build`
Expected: exit 0. Verificar en el output que aparecen rutas estáticas para cada slug (`/legal/[section]` → marcadas como SSG).

- [ ] **Step 10: Commit final si quedó algún ajuste pendiente**

Si se hicieron retoques durante la verificación:

```bash
git add -A
git commit -m "fix(legal): adjustments from manual verification"
```

Si no quedó nada pendiente, saltar este step.

---

## Resumen de archivos

**Creados:**
- `sanity/schemas/singletons/legal.ts`
- `sanity/desk/legalPageStructure.ts`
- `sanity/queries/queries/legal.ts`
- `app/(frontend)/legal/page.tsx`
- `app/(frontend)/legal/[section]/page.tsx`
- `components/Legal/LegalLayout.tsx`
- `components/Legal/LegalLayout.module.scss`
- `components/Legal/LegalSidebar.tsx`
- `components/Legal/LegalSidebar.module.scss`

**Modificados:**
- `sanity/schemas/index.ts` (registrar `legalPage`)
- `sanity/desk/index.ts` (desk + `hiddenDocTypes`)
- `sanity/schemas/documents/page.ts` (eliminar boolean `legal`)
- `sanity/types/singletons/legal.ts` (shape final + export `LegalSection`)
