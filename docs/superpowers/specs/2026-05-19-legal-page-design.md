# Legal page con sidebar — Diseño

**Fecha:** 2026-05-19
**Estado:** Aprobado para implementación

## Objetivo

Crear una página pública para albergar los textos legales (Privacy Policy, Terms and Conditions, Cookies Policy, Legal Notice, etc.) usando el mismo patrón visual que el `ProductInfoPanel` del PDP: sidebar izquierda con la lista de secciones numeradas, contenido a la derecha. Cada texto legal es accesible por su propia URL.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Routing | URL por sección: `/legal/[section]` (cada texto legal su propia URL) |
| Modelo de contenido | Singleton `legalPage` con array de `sections` |
| SEO | Por sección, con campo `seo.page` opcional dentro de cada section |
| Boolean `legal` existente en `page` | Eliminar (estaba sin usar) |
| Componente | Server Component que envuelve un Client Component de sidebar |
| Footer | Fuera de scope; los links se configuran manualmente cuando el footer se active |

## Routing

```
app/(frontend)/legal/
  page.tsx                    → redirect server-side a /legal/<primera-section-slug>
  [section]/
    page.tsx                  → renderiza la sección con sidebar
```

Comportamiento:

- `/legal` → redirect a la primera sección activa del array `sections`. Si el singleton no existe o `sections` está vacío → `notFound()`.
- `/legal/[section]` → busca la sección por `slug.current === params.section`. Si no existe → `notFound()`.
- `generateStaticParams()` exporta todos los slugs de sección para SSG.
- `generateMetadata({params})` lee el `seo` de la sección y construye el head; si la sección no tiene `seo`, fallback al título de la sección y descripción del singleton/global SEO.

## Sanity — Singleton `legalPage`

Nuevo schema `sanity/schemas/singletons/legal.ts`:

```ts
{
  name: 'legalPage',
  title: 'Legal Page',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },           // p.ej. "Legal"
    {
      name: 'sections',
      type: 'array',
      of: [{
        type: 'object',
        name: 'legalSection',
        fields: [
          { name: 'title', type: 'string', validation: Rule => Rule.required() },
          { name: 'slug',  type: 'slug', options: { source: 'title' }, validation: Rule => Rule.required() },
          { name: 'body',  type: 'body' },         // PortableText (mismo type que page.body)
          { name: 'seo',   type: 'seo.page' }      // opcional
        ],
        preview: { select: { title: 'title', subtitle: 'slug.current' } }
      }],
      validation: Rule => Rule.required().min(1)
    },
    // SEO de fallback a nivel singleton (para /legal y para secciones sin seo propio)
    { name: 'seo', type: 'seo.page' }
  ]
}
```

Cambios asociados:

- Registrar el schema en `sanity/schemas/index.ts`.
- Añadir `legalPage` a `hiddenDocTypes` en `sanity/desk/index.ts`.
- Crear `sanity/desk/legalPageStructure.ts` siguiendo el patrón de `homeStructure.ts` (singleton de un solo documento con id fijo).
- Insertarlo en el árbol de `structure()` junto a `home` y `settings`.
- Eliminar el field `legal` (boolean) del schema `page` — está sin usar.

## Tipos TypeScript

Actualizar el type ya existente `sanity/types/singletons/legal.ts` para reflejar el shape final. El SEO tipa el resultado proyectado por el fragment `seo` (title/description/image), reusando el type que ya use `home` o `page` en `sanity/types/`:

```ts
import type { PortableTextBlock } from 'next-sanity'
import type { SeoPage } from '@/sanity/types/objects/seoPage' // ajustar import al type real

export type LegalSection = {
  title: string
  slug: string
  body: PortableTextBlock[]
  seo?: SeoPage
}

export type LegalPageData = {
  title: string
  sections: LegalSection[]
  seo?: SeoPage
}
```

Si no existe un type compartido para `seo.page`, definir uno local en `sanity/types/objects/seoPage.ts` con `{title?: string; description?: string; image?: SanityImageRef}` y reutilizarlo aquí. Decisión: revisar al implementar y reusar antes que crear.

## Query GROQ

Nuevo archivo `sanity/queries/queries/legal.ts`:

```ts
import { groq } from 'next-sanity'
import { body } from '../fragments/body'
import { seo } from '../fragments/seo'

export const LEGAL_PAGE_QUERY = groq`
  *[_type == "legalPage"][0]{
    title,
    sections[]{
      title,
      "slug": slug.current,
      body[]${body},
      seo${seo}
    },
    seo${seo}
  }
`
```

- Reutiliza los fragments existentes `body` y `seo` (no inline).
- Una sola query trae todo el contenido necesario para sidebar + contenido + SEO.

## Frontend

### Estructura de componentes

```
components/Legal/
  LegalLayout.tsx              (Server Component) — recibe data + activeSlug; renderiza sidebar + content
  LegalLayout.module.scss
  LegalSidebar.tsx             (Client Component) — sidebar con <Link> y resalta activo via usePathname
  LegalSidebar.module.scss
```

`LegalLayout` (Server):

- Props: `{ data: LegalPageData; activeSlug: string }`.
- Encuentra `activeSection = data.sections.find(s => s.slug === activeSlug)`.
- Renderiza `<LegalSidebar sections={data.sections} />` + `<PortableText value={activeSection.body} />`.
- El componente `PortableText` reutilizado es `components/PageBuilder/PortableText/PortableText`.

`LegalSidebar` (Client):

- Props: `{ sections: { title: string; slug: string }[] }`.
- Lee `usePathname()` y marca activa la sección cuyo slug está al final de la URL.
- Cada item es un `<Link href={'/legal/' + slug}>` con el patrón visual `{index + 1}. {title}`.

### Página dinámica

`app/(frontend)/legal/[section]/page.tsx` (esqueleto):

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { sanityClient } from '@/sanity/queries'
import { LEGAL_PAGE_QUERY } from '@/sanity/queries/queries/legal'
import { BASE_URL, siteTitle, siteDescription } from '@/utils/seoHelper'
import LegalLayout from '@/components/Legal/LegalLayout'

export const revalidate = 300

export async function generateStaticParams() {
  const data = await sanityClient.fetch(LEGAL_PAGE_QUERY)
  return (data?.sections ?? []).map((s: { slug: string }) => ({ section: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>
}): Promise<Metadata> {
  const { section: slug } = await params
  const data = await sanityClient.fetch(LEGAL_PAGE_QUERY)
  const section = data?.sections.find((s: { slug: string }) => s.slug === slug)
  if (!section) return { title: `Not found | ${siteTitle}` }

  const title = section.seo?.title || section.title
  const description = section.seo?.description || data?.seo?.description || siteDescription
  const canonical = `${BASE_URL.origin}/legal/${section.slug}`
  const ogImage = section.seo?.image?.url || data?.seo?.image?.url

  return {
    title: `${title} | ${siteTitle}`,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  }
}

export default async function LegalSectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section: slug } = await params
  const data = await sanityClient.fetch(LEGAL_PAGE_QUERY)
  const section = data?.sections.find((s: { slug: string }) => s.slug === slug)
  if (!section) notFound()
  return <LegalLayout data={data} activeSlug={section.slug} />
}
```

`app/(frontend)/legal/page.tsx`:

```tsx
import { redirect, notFound } from 'next/navigation'
import { sanityClient } from '@/sanity/queries'
import { LEGAL_PAGE_QUERY } from '@/sanity/queries/queries/legal'

export default async function LegalIndex() {
  const data = await sanityClient.fetch(LEGAL_PAGE_QUERY)
  const first = data?.sections?.[0]
  if (!first) notFound()
  redirect(`/legal/${first.slug}`)
}
```

Patrón confirmado en `app/(frontend)/products/[handle]/page.tsx`: el `Metadata` se compone inline usando `BASE_URL`, `siteTitle`, `siteDescription` de `utils/seoHelper.ts`. No existe (ni se crea) un helper `buildSeo` — mantener consistencia con el resto del proyecto.

Los `sanityClient` y la query se importan donde correspondan; el nombre exacto del cliente se confirma al implementar (`sanity/queries/index.tsx` exporta el cliente).

## Estilos

`LegalLayout.module.scss`:

- Adaptado de `ProductInfoPanel.module.scss` pero sin `position: fixed`, sin `top: var(--header-h)`, sin `bottom`, sin botón close, sin mobile footer.
- Wrapper: `display: flex`, `max-width: px(1072)` centrado, margin top/bottom para respirar bajo el header.
- Sidebar: `width: px(306)`, `border-right`, items con misma tipografía (`MonumentGrotesk`, `font-size: px(11)`, `letter-spacing: px(0.5)`).
- Estado activo: `color: black-border` (sin punto/dot, igual que en el panel).
- Content: `padding: px(18) px(20)`, `font-size: px(12)`, `line-height: 1.6`, reglas de `p/ul/ol` heredadas.
- Mobile (`@include responsive("md")`): wrapper en columna, sidebar en fila scrollable horizontal, mismo tratamiento que el panel.

`LegalSidebar.module.scss`:

- Solo estilos del item link (hover, active). Layout del aside vive en `LegalLayout.module.scss`.

## SEO

- Cada section puede tener su propio `seo.page` (title, description, image).
- `generateMetadata` resuelve en este orden: `section.seo` → `data.seo` (singleton) → fallback (título de sección + descripción global de `settings.seo`).
- Canonical: `BASE_URL + '/legal/' + section.slug`.
- Sin sitemap dedicado en este cambio; los slugs aparecerán en `app/(frontend)/sitemap.ts` si se decide ampliar luego.

## Manejo de errores y casos límite

- Singleton `legalPage` no existe en Sanity → `/legal` y `/legal/[section]` devuelven `notFound()`.
- `sections` vacío → mismo comportamiento que arriba.
- Slug no encontrado → `notFound()` (renderiza la 404 global).
- Una sección sin `body` → renderiza el título y un placeholder vacío (no romper).
- Una sección sin `seo` → fallback al SEO del singleton, después al global.

## Lo que NO incluye este diseño

- No toca `components/Layout/Footer/Footer.tsx`. Los links a `/legal/...` se añadirán cuando el footer se active, configurándolos desde `footerSettings` en Sanity como `linkInternal` apuntando al singleton + un parámetro de slug (o como `linkExternal` con la ruta directa, según decida el editor).
- Sin animaciones de transición entre secciones (cambio de página simple, sin shared layout).
- Sin búsqueda dentro de los textos legales.
- Sin "última actualización" automática por sección (si se quiere, se añade luego como campo `updatedAt` en `legalSection`).
- Sin migración de datos (es contenido nuevo; el editor lo introduce desde Studio).

## Archivos a crear / modificar

**Crear:**
- `sanity/schemas/singletons/legal.ts`
- `sanity/desk/legalPageStructure.ts`
- `sanity/queries/queries/legal.ts`
- `app/(frontend)/legal/page.tsx`
- `app/(frontend)/legal/[section]/page.tsx`
- `components/Legal/LegalLayout.tsx`
- `components/Legal/LegalLayout.module.scss`
- `components/Legal/LegalSidebar.tsx`
- `components/Legal/LegalSidebar.module.scss`

**Modificar:**
- `sanity/schemas/index.ts` (registrar `legalPage`)
- `sanity/desk/index.ts` (añadir a `hiddenDocTypes` + al árbol)
- `sanity/schemas/documents/page.ts` (eliminar field `legal`)
- `sanity/types/singletons/legal.ts` (actualizar shape final, exportar `LegalSection`)

## Criterios de aceptación

1. `/legal` redirige server-side a `/legal/<slug-primera-section>` cuando hay secciones; devuelve 404 si no las hay.
2. `/legal/privacy-policy` (o el slug que cree el editor) muestra sidebar a la izquierda con todas las secciones numeradas y el cuerpo de la sección activa a la derecha.
3. La sección activa se resalta en la sidebar (mismo tratamiento visual que `ProductInfoPanel`).
4. Hacer click en cualquier item de la sidebar navega a `/legal/<otro-slug>` y cambia el contenido sin perder el layout.
5. Cada sección tiene `<title>` y meta description propios cuando se rellena su `seo`.
6. Mobile: sidebar pasa a tabs horizontales scrollables sobre el contenido.
7. `npm run typecheck` y `npm run lint` pasan sin errores nuevos.
8. El boolean `legal` desaparece del schema `page` y de cualquier documento que lo tuviera (sin migración: simplemente se ignora).
