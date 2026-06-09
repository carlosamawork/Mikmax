# Sets — Archive (`/sets`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el listado de sets (`/sets`): un listado vertical sin filtros donde cada set es una fila de las imágenes de sus productos componentes + un caption (Complete Set / título / rango de precio), enlazando al detalle `/sets/[slug]`.

**Architecture:** `getAllSets()` (nueva query) → `getSetArchiveItems()` (nuevo builder que hidrata los productos componentes en Shopify y agrega imagen+precio por set) → `<SetsArchive>` server component → `<SetList>` → `<SetRow>` por set. Sin toolbar, filtros ni sort: orden por `orderRank`. Reutiliza `getProductCardsByHandles`, `applyLookDiscount` y `LazyImage` sin cambios.

**Tech Stack:** Next.js 15 App Router (Server Components), Sanity GROQ, Shopify Storefront API, SCSS modules, TypeScript estricto. **El repo NO tiene runner de tests**; verificación = `npm run typecheck` (+ `npm run lint`) y comprobación visual en `npm run dev`.

**Referencia:** spec `docs/superpowers/specs/2026-06-09-sets-archive-design.md`. Figma desktop `node-id=11-4977`, mobile `11-5076`. Patrón parcial: `app/(frontend)/looks/` (pero sin filtros y con card distinta).

**Commits:** español; **nunca commitear sin que el usuario lo pida** (ya autorizado para esta ejecución). Commit por tarea.

---

## Estructura de archivos

**Nuevos**
- `types/set.ts` — `SetArchiveItem` / `SetArchiveComponent`.
- `lib/set/buildSetsArchive.ts` — `getSetArchiveItems()`.
- `components/Sets/SetRow/SetRow.tsx` + `.module.scss` — una fila de set.
- `components/Sets/SetList/SetList.tsx` + `.module.scss` — lista vertical + estado vacío.
- `app/(frontend)/sets/SetsArchive.tsx` — server component que hidrata y renderiza.
- `app/(frontend)/sets/page.tsx` — ruta índice.

**Modificados**
- `sanity/queries/queries/set.ts` — añadir `getAllSets` + tipos lista + `ALL_SETS_QUERY`.

**Reutilizados sin cambios:** `getProductCardsByHandles` (`lib/shopify`), `applyLookDiscount` (`lib/look/buildLookView`), `LazyImage` (`@/components/Common`).

---

## Task 1: Query `getAllSets`

**Files:**
- Modify: `sanity/queries/queries/set.ts`

- [ ] **Step 1: Añadir `getAllSets`, tipos y query al final de `sanity/queries/queries/set.ts`**

Append (no modificar lo existente; `groq` y `client` ya están importados arriba en el archivo):

```ts
export type SanitySetComponentLite = {
  color: string | null
  productHandle: string | null
}

export type SanitySetListDoc = {
  _id: string
  title: string
  slug: string
  discountStrategy: 'none' | 'sumMinusFixed' | 'sumMinusPercent' | null
  discountValue: number | null
  components: SanitySetComponentLite[] | null
  orderRank: string | null
}

export const ALL_SETS_QUERY = groq`
  *[_type == "set"
     && defined(slug.current)
     && !(_id in path('drafts.**'))] | order(coalesce(orderRank, title) asc) {
    _id,
    title,
    "slug": slug.current,
    discountStrategy,
    discountValue,
    "components": components[]{
      color,
      "productHandle": product->store.slug.current
    },
    orderRank
  }
`

export async function getAllSets(): Promise<SanitySetListDoc[]> {
  const docs = await client.fetch<SanitySetListDoc[]>(
    ALL_SETS_QUERY,
    {},
    // Lee product->store.slug.current en los componentes: suscribirse a `product`.
    {next: {tags: ['set', 'product'], revalidate: 3600}},
  )
  return docs ?? []
}
```

This mirrors `getAllLooks`/`ALL_LOOKS_QUERY` in `sanity/queries/queries/look.ts` (read it to confirm shape) but projects ALL components (not just the first editorial image) and omits the `img` field.

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add sanity/queries/queries/set.ts
git commit -m "feat(queries): getAllSets para el archive

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Tipos + builder del archive

**Files:**
- Create: `types/set.ts`
- Create: `lib/set/buildSetsArchive.ts`

- [ ] **Step 1: Crear `types/set.ts`**

```ts
export type SetArchiveComponent = {
  imageUrl?: string
  imageAlt?: string
}

export type SetArchiveItem = {
  id: string
  title: string
  slug: string
  components: SetArchiveComponent[]
  priceMin: number
  priceMax: number
}
```

- [ ] **Step 2: Crear `lib/set/buildSetsArchive.ts`**

```ts
// lib/set/buildSetsArchive.ts
import {getAllSets, type SanitySetListDoc} from '@/sanity/queries/queries/set'
import {getProductCardsByHandles} from '@/lib/shopify'
import {applyLookDiscount} from '@/lib/look/buildLookView'
import type {SetArchiveItem, SetArchiveComponent} from '@/types/set'

// Forma mínima del nodo de producto que leemos de getProductCardsByHandles
// (PRODUCT_CARD_FRAGMENT en lib/shopify.js).
type Variant = {
  selectedOptions: {name: string; value: string}[]
  price: {amount: string}
  image?: {url: string; altText?: string | null} | null
}
type CardNode = {
  handle: string
  featuredImage?: {url: string; altText?: string | null} | null
  variants?: {nodes: Variant[]}
}

// Imagen (primera variante del color fijo) y min/max precio de ese color.
function componentImageAndPrice(
  node: CardNode,
  color: string,
): {imageUrl?: string; imageAlt?: string; min: number; max: number; hasPrice: boolean} {
  const variants = node.variants?.nodes ?? []
  const target = color.trim().toLowerCase()
  const prices: number[] = []
  let imageUrl: string | undefined
  let imageAlt: string | undefined
  for (const v of variants) {
    const c = v.selectedOptions.find((o) => o.name.toLowerCase() === 'color')?.value
    if (!c || c.trim().toLowerCase() !== target) continue
    if (!imageUrl && v.image?.url) {
      imageUrl = v.image.url
      imageAlt = v.image.altText ?? undefined
    }
    const p = Number(v.price.amount)
    if (Number.isFinite(p)) prices.push(p)
  }
  if (!imageUrl && node.featuredImage?.url) {
    imageUrl = node.featuredImage.url
    imageAlt = node.featuredImage.altText ?? undefined
  }
  return {
    imageUrl,
    imageAlt,
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
    hasPrice: prices.length > 0,
  }
}

function aggregateSet(
  set: SanitySetListDoc,
  productMap: Record<string, CardNode>,
): SetArchiveItem | null {
  const components: SetArchiveComponent[] = []
  let priceMin = 0
  let priceMax = 0
  let valid = 0
  for (const comp of set.components ?? []) {
    if (!comp.productHandle || !comp.color) continue
    const node = productMap[comp.productHandle]
    if (!node) continue
    const {imageUrl, imageAlt, min, max, hasPrice} = componentImageAndPrice(node, comp.color)
    if (!hasPrice || !imageUrl) continue
    valid++
    priceMin += min
    priceMax += max
    components.push({imageUrl, imageAlt})
  }
  if (valid === 0) return null

  const strategy = set.discountStrategy ?? 'none'
  const value = set.discountValue ?? 0
  return {
    id: set._id,
    title: set.title,
    slug: set.slug,
    components,
    priceMin: applyLookDiscount(priceMin, strategy, value),
    priceMax: applyLookDiscount(priceMax, strategy, value),
  }
}

/**
 * Carga todos los sets, batch-fetch de sus productos componentes en Shopify,
 * y agrega imagen + rango de precio por set. Sin filtros ni sort: orden de
 * getAllSets (orderRank asc).
 */
export async function getSetArchiveItems(): Promise<SetArchiveItem[]> {
  const sets = await getAllSets()
  const handles = Array.from(
    new Set(
      sets.flatMap((s) =>
        (s.components ?? []).map((c) => c.productHandle).filter((h): h is string => !!h),
      ),
    ),
  )
  const nodes = (await getProductCardsByHandles(handles)) as CardNode[]
  const productMap: Record<string, CardNode> = {}
  for (const n of nodes) productMap[n.handle] = n

  return sets
    .map((s) => aggregateSet(s, productMap))
    .filter((x): x is SetArchiveItem => x !== null)
}
```

> `applyLookDiscount(sum, strategy, value)` ya existe y acepta `'none' | 'sumMinusFixed' | 'sumMinusPercent'`. `getProductCardsByHandles` devuelve nodos con `featuredImage`, `variants.nodes[].{image, price, selectedOptions}` (confirmado en `PRODUCT_CARD_FRAGMENT`). Si `getProductCardsByHandles([])` se llama con array vacío, devuelve `[]` (guard interno) — `productMap` queda vacío y el resultado es `[]`.

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add types/set.ts lib/set/buildSetsArchive.ts
git commit -m "feat(sets): getSetArchiveItems (hidrata componentes + rango de precio)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Componentes `SetRow` + `SetList`

**Files:**
- Create: `components/Sets/SetRow/SetRow.tsx`
- Create: `components/Sets/SetRow/SetRow.module.scss`
- Create: `components/Sets/SetList/SetList.tsx`
- Create: `components/Sets/SetList/SetList.module.scss`

- [ ] **Step 1: Crear `components/Sets/SetRow/SetRow.module.scss`** (mobile-first: rejilla 2 col; desktop: fila única)

```scss
@use '../../../styles/common/variables' as *;

.row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: px(20);
  padding: px(13) px(4);
  text-decoration: none;
  color: inherit;
}

.minis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: px(1);
  width: 100%;

  // Número impar de minis → el último centrado a una columna
  .mini:last-child:nth-child(odd) {
    grid-column: 1 / -1;
    justify-self: center;
    width: calc(50% - #{px(1)} / 2);
  }

  @media (min-width: 768px) {
    display: flex;
    justify-content: center;
    gap: px(2);

    .mini {
      flex: 0 0 px(358);
      width: px(358);
    }
    // Reset del centrado móvil en desktop
    .mini:last-child:nth-child(odd) {
      justify-self: auto;
      width: px(358);
    }
  }
}

.mini {
  position: relative;
  aspect-ratio: 358 / 444;
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

.caption {
  text-align: center;

  .kicker {
    margin: 0;
    font-family: $MonumentGrotesk;
    font-size: px(13);
    line-height: px(20);
    color: map-get($colors, 'black');
  }

  .title {
    margin: 0;
    font-family: $MonumentGrotesk;
    font-size: px(11);
    line-height: px(15);
    letter-spacing: px(0.5);
    color: map-get($colors, 'black');
  }

  .price {
    margin: 0;
    font-family: $MonumentGrotesk;
    font-size: px(11);
    line-height: px(15);
    letter-spacing: px(0.5);
    color: map-get($colors, 'black');
  }
}
```

- [ ] **Step 2: Crear `components/Sets/SetRow/SetRow.tsx`**

```tsx
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import type {SetArchiveItem} from '@/types/set'
import s from './SetRow.module.scss'

function formatPrice(min: number, max: number): string {
  const fmt = (n: number) => `€${Math.round(n)}`
  return max > min ? `${fmt(min)}-${fmt(max)}` : fmt(min)
}

export default function SetRow({item}: {item: SetArchiveItem}) {
  return (
    <Link href={`/sets/${item.slug}`} className={s.row}>
      <div className={s.minis}>
        {item.components.map((c, i) => (
          <div key={i} className={s.mini}>
            {c.imageUrl && (
              <LazyImage
                src={c.imageUrl}
                alt={c.imageAlt ?? item.title}
                width={358}
                height={444}
                className={s.img}
              />
            )}
          </div>
        ))}
      </div>
      <div className={s.caption}>
        <p className={s.kicker}>Complete Set</p>
        <p className={s.title}>{item.title}</p>
        <p className={s.price}>{formatPrice(item.priceMin, item.priceMax)}</p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Crear `components/Sets/SetList/SetList.module.scss`**

```scss
@use '../../../styles/common/variables' as *;

.list {
  display: flex;
  flex-direction: column;
  gap: px(40);
  padding: px(20) 0;
}

.empty {
  display: flex;
  justify-content: center;
  padding: px(80) px(15);
  font-family: $MonumentGrotesk;
  font-size: px(13);
  color: map-get($colors, 'gray');
}
```

- [ ] **Step 4: Crear `components/Sets/SetList/SetList.tsx`**

```tsx
import type {SetArchiveItem} from '@/types/set'
import SetRow from '@/components/Sets/SetRow/SetRow'
import s from './SetList.module.scss'

export default function SetList({items}: {items: SetArchiveItem[]}) {
  if (items.length === 0) {
    return (
      <div className={s.empty}>
        <p>No sets yet.</p>
      </div>
    )
  }
  return (
    <div className={s.list}>
      {items.map((item) => (
        <SetRow key={item.id} item={item} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Verificar typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: ambos PASS.

- [ ] **Step 6: Commit**

```bash
git add components/Sets
git commit -m "feat(sets): SetRow y SetList (archive)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Ruta `/sets`

**Files:**
- Create: `app/(frontend)/sets/SetsArchive.tsx`
- Create: `app/(frontend)/sets/page.tsx`

> Estos archivos conviven con `app/(frontend)/sets/[slug]/` (el single view ya existe). El `page.tsx` que se crea aquí es el índice de `/sets`.

- [ ] **Step 1: Crear `app/(frontend)/sets/SetsArchive.tsx`**

```tsx
import {getSetArchiveItems} from '@/lib/set/buildSetsArchive'
import SetList from '@/components/Sets/SetList/SetList'

export default async function SetsArchive() {
  const items = await getSetArchiveItems()
  return <SetList items={items} />
}
```

- [ ] **Step 2: Crear `app/(frontend)/sets/page.tsx`**

```tsx
import type {Metadata} from 'next'
import SetsArchive from './SetsArchive'
import {siteTitle} from '@/utils/seoHelper'

export const revalidate = 300

export const metadata: Metadata = {
  title: `Sets | ${siteTitle}`,
}

export default async function SetsIndexPage() {
  return <SetsArchive />
}
```

- [ ] **Step 3: Verificar typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: ambos PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(frontend)/sets/SetsArchive.tsx" "app/(frontend)/sets/page.tsx"
git commit -m "feat(routing): listado /sets (archive)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Verificación final y comprobación visual

**Files:** (ninguno de código)

- [ ] **Step 1: Lint + typecheck + build**

Run:
```bash
npm run typecheck && npm run lint && npm run build
```
Expected: los tres PASS. (Si el build falla por permisos en `.next` —artefactos root de builds previas—, limpiar con `sudo rm -rf .next` y reintentar; no es un fallo de código.)

- [ ] **Step 2: Comprobación visual** en `localhost:3000/sets` (`npm run dev`; requiere ≥1 documento `set` publicado con componentes)

Verificar contra el Figma (desktop `11-4977`, mobile `11-5076`):
- Listado vertical de sets; cada set = fila de imágenes de sus productos componentes + caption centrado (`Complete Set` / título / `€min-€max`).
- **Desktop (≥768px):** los minis en una sola fila centrada (3 → centrada, 4 → ancho completo).
- **Móvil (<768px):** los minis en rejilla de 2 columnas; con número impar, el último mini centrado.
- Clic en cualquier punto de la fila → `/sets/<slug>`.
- Sin toolbar ni filtros.
- Si no hay sets: "No sets yet.".

- [ ] **Step 3: Commit (si hubo ajustes)**

```bash
git add -A
git commit -m "fix(sets): ajustes visuales del archive

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notas de cierre

- **Fuera de alcance:** nav "Complete Sets" → /sets (contenido del menú Sanity), reescritura de `block.setModule`, filtros/orden/toolbar, badge "Novedades", botón de favoritos sobre los minis, agrupación por colorways.
- **Decisiones del spec:** sin filtros; fila entera enlaza al detalle; caption línea 2 = `title` del set; minis = imágenes simples; precio = suma de min/max por componente con `applyLookDiscount`.
- **Skill útil:** `pixel-perfect` para afinar gaps/anchos de los minis contra el Figma en el Task 5.
