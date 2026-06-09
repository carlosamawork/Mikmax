# Sets — Single View (`/sets/[slug]`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el detalle de un **set** (`/sets/[slug]`) como bundle PDP idéntico a la Look PDP, introduciendo el documento Sanity `set` (espejo de `look` + `colorLocked`) y reutilizando sin cambios la maquinaria de bundle de looks.

**Architecture:** `set` = documento espejo de `look` con un campo `colorLocked`. La ruta `/sets/[slug]` es una copia fina de `/looks/[slug]`: lee el `set`, hidrata cada componente en vivo desde Shopify, construye la vista con el `buildLookView` existente y la renderiza con el `<LookDetail>` existente. **Cero cambios en el código de looks.**

**Tech Stack:** Next.js 15 App Router (Server Components), Sanity CMS v3 (GROQ + desk structure + orderable-document-list), Shopify Storefront API, TypeScript estricto. **El repo NO tiene runner de tests**; verificación por tarea = `npm run typecheck` (+ `npm run lint` donde aplique) y, al final, comprobación visual en `npm run dev`.

**Referencia:** spec `docs/superpowers/specs/2026-06-09-sets-single-view-design.md`. Espejo de: `sanity/schemas/documents/look.tsx`, `sanity/queries/queries/look.ts`, `app/(frontend)/looks/[slug]/*`, `sanity/desk/lookStructure.ts` + `orderLookStructure.ts`.

**Commits:** mensajes en español; **nunca commitear sin que el usuario lo pida** (CLAUDE.md). Cada tarea termina en commit; si se ejecuta por subagentes, confirmar la autorización de commits una vez al inicio.

---

## Estructura de archivos

**Nuevos**
- `sanity/schemas/documents/set.tsx` — documento `set` (copia de `look.tsx` + `colorLocked`).
- `sanity/desk/orderSetStructure.ts` — desk item "Ordenar Sets" (espejo de `orderLookStructure.ts`).
- `sanity/queries/queries/set.ts` — `getSet`/`getSetSlugs`/`getSetSEO` (espejo de `look.ts` + `colorLocked`).
- `app/(frontend)/sets/[slug]/page.tsx` — ruta detalle (copia fina de looks).
- `app/(frontend)/sets/[slug]/loading.tsx` — skeleton.
- `app/(frontend)/sets/[slug]/error.tsx` — error boundary.

**Modificados**
- `sanity/schemas/index.ts` — registrar `set` en `documents`.
- `sanity/desk/index.ts` — importar `setStructure` (ya existe) + `orderSetStructure`; añadirlos a `items` y a `hiddenDocTypes`.
- `app/api/revalidate/route.ts` — tag `set` / `set:{slug}`.
- `CLAUDE.md` — `hiddenDocTypes` (`set`, `orderable.set`) + "Tags activos hoy" (`set`, `set:{slug}`).

**Reutilizados sin cambios:** `lib/look/buildLookView.ts`, `types/look.ts`, `components/Look/LookDetail.tsx` (y resto de `components/Look/*`, `components/Product/*`), `context/shopContext.js` (`addLookToCart`), `sanity/schemas/objects/bundle/bundleComponent.ts`. **No se toca `sanity.config.ts`** (el orderable de `look` funciona solo con el desk item + `orderRank`; `set` lo replica).

---

## Task 1: Documento `set` + registro

**Files:**
- Create: `sanity/schemas/documents/set.tsx`
- Modify: `sanity/schemas/index.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Crear `sanity/schemas/documents/set.tsx`**

Es una copia de `sanity/schemas/documents/look.tsx` con: `name: 'set'`, `title: 'Set'`, icono `StackCompactIcon`, el campo nuevo `colorLocked` en el grupo `editorial`, y `subtitle: 'Set'` en el preview. Contenido completo:

```tsx
// sanity/schemas/documents/set.tsx
import {StackCompactIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

const GROUPS = [
  {name: 'editorial', title: 'Editorial', default: true},
  {name: 'pricing', title: 'Pricing & Discount'},
  {name: 'seo', title: 'SEO'},
]

export default defineType({
  name: 'set',
  title: 'Set',
  type: 'document',
  icon: StackCompactIcon,
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
      name: 'colorLocked',
      title: 'Color cerrado',
      type: 'string',
      description:
        'Color del set (p. ej. "Blanc de Blanc", "Terracota"). Informativo / agrupación en el archive.',
      validation: (Rule) => Rule.required(),
      group: 'editorial',
    }),
    defineField({
      name: 'description',
      title: 'Descripción',
      type: 'text',
      rows: 3,
      group: 'editorial',
    }),
    defineField({
      name: 'propiedadesMaterial',
      title: 'Propiedades del material',
      type: 'body',
      group: 'editorial',
    }),
    defineField({
      name: 'recomendacionesLavado',
      title: 'Recomendaciones de lavado',
      type: 'body',
      group: 'editorial',
    }),
    defineField({
      name: 'usoRecomendado',
      title: 'Uso recomendado',
      type: 'body',
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
      name: 'orderRank',
      title: 'Orden',
      type: 'string',
      group: 'editorial',
      hidden: true,
      description: 'Posición manual asignada desde la vista "Ordenar sets".',
    }),
    defineField({
      name: 'components',
      title: 'Componentes (productos del set)',
      description:
        'Cada componente es un producto de Shopify con un color fijo. El usuario solo elige talla; las tallas se toman de Shopify.',
      type: 'array',
      of: [{type: 'bundleComponent'}],
      validation: (Rule) => Rule.min(2),
      group: 'editorial',
    }),
    defineField({
      name: 'relatedProducts',
      title: 'Productos relacionados',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'product'}], weak: true}],
      group: 'editorial',
    }),
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
    defineField({
      name: 'discountValue',
      title: 'Valor de descuento',
      description:
        'Solo para mostrar en la página. "sumMinusFixed": € a restar. "sumMinusPercent": número 0-100. El cobro real lo impone el código de descuento de Shopify, manténlos alineados.',
      type: 'number',
      validation: (Rule) => Rule.min(0),
      group: 'pricing',
    }),
    defineField({
      name: 'discountCode',
      title: 'Código de descuento de Shopify',
      description:
        'Código que se aplica al carrito al añadir el set (cartDiscountCodesUpdate). Debe coincidir con discountStrategy/discountValue.',
      type: 'string',
      group: 'pricing',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo.page',
      group: 'seo',
    }),
  ],
  preview: {
    select: {title: 'title', media: 'editorialImages.0.image'},
    prepare({title, media}) {
      return {title, subtitle: 'Set', media}
    },
  },
  orderings: [
    {name: 'titleAsc', title: 'Título A-Z', by: [{field: 'title', direction: 'asc'}]},
  ],
})
```

- [ ] **Step 2: Registrar `set` en `sanity/schemas/index.ts`**

Añadir el import junto a los otros documentos:

```ts
import set from './documents/set'
```

Y añadir `set` al array `documents` (al final):

```ts
const documents = [ collection, page, product, productVariant, post, look, set]
```

- [ ] **Step 3: Actualizar `hiddenDocTypes` en `CLAUDE.md`**

En la línea de `hiddenDocTypes` (sección "MODELO DE CONTENIDO SANITY"), añadir `set`, `orderable.set` a la lista de tipos.

- [ ] **Step 4: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS (sin errores nuevos).

- [ ] **Step 5: Commit**

```bash
git add sanity/schemas/documents/set.tsx sanity/schemas/index.ts CLAUDE.md
git commit -m "feat(sanity): documento set (espejo de look + colorLocked)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
> Nota: `CLAUDE.md` puede estar gitignored; si `git add` lo ignora, commitea solo los otros dos archivos (el cambio queda en el working tree). Verifica con `git status`.

---

## Task 2: Desk — listar y ordenar Sets en el Studio

**Files:**
- Create: `sanity/desk/orderSetStructure.ts`
- Modify: `sanity/desk/index.ts`

> `sanity/desk/setStructure.ts` YA existe y es correcto (apunta a `schemaType('set')`); solo hay que cablearlo.

- [ ] **Step 1: Crear `sanity/desk/orderSetStructure.ts`** (espejo de `orderLookStructure.ts`)

```ts
import defineStructure from '../utils/defineStructure'
import {StackCompactIcon} from '@sanity/icons'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'

export default defineStructure((S, context) =>
  S.listItem()
    .title('Ordenar Sets')
    .icon(StackCompactIcon)
    .child(() =>
      S.list()
        .title('Sets')
        .items([
          orderableDocumentListDeskItem({type: 'set', S: S as any, context: context as any}) as any,
        ]),
    ),
)
```

- [ ] **Step 2: Cablear en `sanity/desk/index.ts`**

1. Añadir los imports tras los de look:
```ts
import set from './setStructure'
import orderSets from './orderSetStructure'
```
2. Añadir `'set'` y `'orderable.set'` al array dentro de `hiddenDocTypes` (junto a `'look'`, `'orderable.look'`).
3. Añadir las entradas al desk, justo después de `orderLooks(S, context),`:
```ts
      set(S, context),
      orderSets(S, context),
```

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add sanity/desk/orderSetStructure.ts sanity/desk/index.ts
git commit -m "feat(studio): desk de Sets (listar + ordenar)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Queries `set`

**Files:**
- Create: `sanity/queries/queries/set.ts`

- [ ] **Step 1: Crear `sanity/queries/queries/set.ts`** (espejo de `look.ts`, reutilizando sus tipos, con `colorLocked`)

```ts
// sanity/queries/queries/set.ts
import {groq} from 'next-sanity'
import {client} from '..'
import {image} from '../fragments/image'
import {seo} from '../fragments/seo'
import type {SanityLookDoc} from './look'

export type SanitySetDoc = SanityLookDoc & {colorLocked: string | null}

export const SET_BY_SLUG_QUERY = groq`
  *[_type == "set"
     && slug.current == $slug
     && !(_id in path('drafts.**'))][0] {
    _id,
    title,
    "slug": slug.current,
    colorLocked,
    description,
    propiedadesMaterial,
    recomendacionesLavado,
    usoRecomendado,
    "seo": seo{ ${seo} },
    editorialImages[]{
      image{
        ${image},
        "alt": alt
      }
    },
    "components": components[]{
      label,
      color,
      "productHandle": product->store.slug.current,
      "productTitle": product->store.title
    },
    discountStrategy,
    discountValue,
    discountCode,
    "relatedProducts": relatedProducts[]->{
      "handle": store.slug.current
    }
  }
`

export async function getSet(slug: string): Promise<SanitySetDoc | null> {
  const doc = await client.fetch<SanitySetDoc | null>(
    SET_BY_SLUG_QUERY,
    {slug},
    // Lee product->store… (componentes y relatedProducts): suscribirse a `product`.
    {next: {tags: ['set', 'product', `set:${slug}`], revalidate: 300}},
  )
  return doc ?? null
}

export async function getSetSlugs(): Promise<string[]> {
  const slugs = await client.fetch<string[]>(
    groq`*[_type == "set" && defined(slug.current) && !(_id in path('drafts.**'))].slug.current`,
    {},
    {next: {tags: ['set'], revalidate: 300}},
  )
  return slugs ?? []
}

export async function getSetSEO(slug: string) {
  return client.fetch(
    groq`*[_type == "set" && slug.current == $slug && !(_id in path('drafts.**'))][0]{ "seo": seo{ ${seo} }, title }`,
    {slug},
    {next: {tags: ['set', `set:${slug}`], revalidate: 300}},
  )
}
```

> `SanityLookDoc` se importa de `./look`. `SanitySetDoc` lo extiende con `colorLocked`, por lo que es asignable a `SanityLookDoc` y `buildLookView(set, …)` lo acepta sin cambios.

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add sanity/queries/queries/set.ts
git commit -m "feat(queries): getSet/getSetSlugs/getSetSEO (espejo de look)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Ruta `/sets/[slug]` (reutiliza buildLookView + LookDetail)

**Files:**
- Create: `app/(frontend)/sets/[slug]/page.tsx`
- Create: `app/(frontend)/sets/[slug]/loading.tsx`
- Create: `app/(frontend)/sets/[slug]/error.tsx`

- [ ] **Step 1: Crear `app/(frontend)/sets/[slug]/page.tsx`** (copia de `looks/[slug]/page.tsx`, look→set)

```tsx
import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getSet, getSetSlugs, getSetSEO} from '@/sanity/queries/queries/set'
import {getProductDetail, getProductCards} from '@/lib/shopify'
import {buildLookView} from '@/lib/look/buildLookView'
import {BASE_URL, siteTitle} from '@/utils/seoHelper'
import LookDetail from '@/components/Look/LookDetail'

export const revalidate = 300

export async function generateStaticParams() {
  const slugs = await getSetSlugs()
  return slugs.map((slug) => ({slug}))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{slug: string}>
}): Promise<Metadata> {
  const {slug} = await params
  const data = await getSetSEO(slug)
  if (!data) return {title: `Set not found | ${siteTitle}`}
  const seo = (data.seo ?? {}) as {title?: string; description?: string}
  const title = seo.title || data.title
  const canonical = `${BASE_URL.origin}/sets/${slug}`
  return {
    title: `${title} | ${siteTitle}`,
    description: seo.description,
    alternates: {canonical},
    openGraph: {title, description: seo.description, url: canonical},
  }
}

export default async function SetPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params
  const set = await getSet(slug)
  if (!set) notFound()

  // Unique product handles across components, fetched live from Shopify in parallel.
  const handles = Array.from(
    new Set((set.components ?? []).map((c) => c.productHandle).filter((h): h is string => !!h)),
  )
  const detailsList = await Promise.all(handles.map((h) => getProductDetail(h)))
  const details: Record<string, Awaited<ReturnType<typeof getProductDetail>>> = {}
  handles.forEach((h, i) => {
    details[h] = detailsList[i]
  })

  const relatedHandles = (set.relatedProducts ?? [])
    .map((r) => r.handle)
    .filter((h): h is string => !!h)
  const relatedCards = relatedHandles.length ? await getProductCards(relatedHandles) : []

  const view = buildLookView(set, details, relatedCards)

  if (view.components.length === 0) notFound()

  return <LookDetail view={view} />
}
```

- [ ] **Step 2: Crear `app/(frontend)/sets/[slug]/loading.tsx`**

```tsx
export default function Loading() {
  return <div style={{minHeight: '60vh'}} aria-busy="true" />
}
```

- [ ] **Step 3: Crear `app/(frontend)/sets/[slug]/error.tsx`**

```tsx
'use client'

export default function Error({reset}: {error: Error; reset: () => void}) {
  return (
    <div style={{padding: '4rem 1rem', textAlign: 'center'}}>
      <p>No se pudo cargar el set.</p>
      <button onClick={reset}>Reintentar</button>
    </div>
  )
}
```

- [ ] **Step 4: Verificar typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: ambos PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(frontend)/sets"
git commit -m "feat(routing): detalle de set /sets/[slug] (reutiliza buildLookView + LookDetail)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Revalidación on-demand de `set`

**Files:**
- Modify: `app/api/revalidate/route.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Añadir el bloque `set` en `app/api/revalidate/route.ts`**

Insertar tras el bloque `if (body._type === 'page') { ... }` y antes de `tags.forEach(...)`:

```ts
    if (body._type === 'set') {
      if (body.slug) tags.push(`set:${body.slug}`)
    }
```

- [ ] **Step 2: Registrar tags en `CLAUDE.md`**

En la línea "**Tags activos hoy:**" añadir `set`, `set:{slug}` a la lista.

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/revalidate/route.ts CLAUDE.md
git commit -m "feat(revalidate): tags set y set:{slug}

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
> Si `CLAUDE.md` está gitignored, commitea solo `route.ts`.

---

## Task 6: Verificación final, contenido en Studio y comprobación visual

**Files:** (ninguno de código)

- [ ] **Step 1: Lint + typecheck + build**

Run:
```bash
npm run typecheck && npm run lint && npm run build
```
Expected: los tres PASS. (Si el build falla por permisos en `.next` —artefactos root de builds previas—, limpiar con `sudo rm -rf .next` y reintentar; no es un fallo de código.)

- [ ] **Step 2: Crear un Set en el Studio**

1. `npm run dev` → `localhost:3000/admin`. Confirmar que aparecen "Sets" y "Ordenar Sets" en el desk.
2. Crear un **Set**: Title, Slug, **Color cerrado** (p. ej. "Blanc de Blanc"), ≥1 imagen editorial, ≥2 **componentes** (cada uno = producto Shopify + color), opcional descuento/SEO. Publish.

- [ ] **Step 3: Comprobación visual** en `localhost:3000/sets/<slug>`

Verificar contra el Figma single view (`node-id=31-13998`) y por paridad con `/looks/<slug>`:
- Galería del set + panel de componentes, cada uno con su lista de tallas (precio por talla) y botón "Select".
- Barra inferior (desktop) con título, rango de precio (€min–€max) y "Select products and sizes"; "Product information" abre el panel editorial.
- Seleccionar una talla por componente habilita "Add to cart"; añadir → el bundle entra al carrito (vía `addLookToCart`) y, si hay `discountCode`, se aplica.
- Móvil: flujo apilado (acordeones de tallas e info).
- Un slug inexistente (`/sets/no-existe`) → 404 (notFound).

- [ ] **Step 4: Commit (si hubo ajustes)**

Si la comprobación visual requirió tocar algo:
```bash
git add -A
git commit -m "fix(sets): ajustes tras revision visual

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notas de cierre

- **Fuera de alcance (Spec 2):** `/sets` archive (rejilla + FilterDrawer + `getAllSets`), reescritura de `block.setModule` para referenciar `set`, nav "Complete Sets" → `/sets`, agrupación por color, atributos de bundle en carrito, rename del código compartido a nombres neutros.
- **Skills útiles en ejecución:** `pixel-perfect` para el ajuste visual del Task 6; `sanity-schema-builder` como referencia en Task 1.
- **Decisiones del spec:** reutilización directa de `LookView`/`buildLookView`/`LookDetail`/`addLookToCart` (sin tocar looks); `colorLocked` solo como dato (no se muestra en el single view).
