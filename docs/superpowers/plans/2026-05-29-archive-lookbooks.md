# Archive de lookbooks (/looks) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear una página archive en `/looks` del mismo tipo que el archive de Shop (toolbar + view toggle + drawer de filtros), filtrando los looks por los facets derivados de sus productos componentes.

**Architecture:** `LooksArchive` (server) carga todos los looks de Sanity, hace batch-fetch de sus productos componentes desde Shopify (reusando `PRODUCT_CARD_FRAGMENT`, que ya trae color-pattern, material, variantes y precio), y agrega por look un conjunto de facets (color base, material, talla, rango de precio con descuento). El filtrado es 100% client-side con la misma semántica que Shop (OR dentro de cada facet, AND entre facets). La UI reutiliza `ShopToolbar` y `FilterDrawer` (con dos generalizaciones mínimas) y añade `LookGrid`/`LookCard`.

**Tech Stack:** Next.js 15 App Router (Server Components + server actions), Sanity GROQ + plugin orderable-document-list, Shopify Storefront GraphQL, TypeScript, SCSS modules.

**Convenciones:** Prettier sin punto y coma, comillas simples, 100 chars, sin bracket spacing. Imports `@/`. SCSS mobile-first. Nunca commit sin que el usuario lo autorice (ya autorizado al ejecutar este plan). Rama: `feature/mvp-arquitectura`.

**Prerequisito de entorno:** `.next/` debe ser propiedad del usuario (un `sudo npm run build` previo la dejó como root). Si `npm run build`/`npm run dev` fallan por permisos, ejecutar `sudo chown -R $(whoami) .next` antes de empezar.

**Dependencias entre features:** Reutiliza `lib/shop/materialFilter.ts` (`productMaterialSlugs`) y el filtro de material ya implementado. Reutiliza el resolver de color base de `lib/shop/expandToCards.ts`.

---

### Task 1: Orden manual en `look` (plugin orderable)

`orderable.look` ya está en `hiddenDocTypes` (`sanity/desk/index.ts:56`); faltan el campo, la estructura y su registro.

**Files:**
- Modify: `sanity/schemas/documents/look.tsx` (añadir campo `orderRank`)
- Create: `sanity/desk/orderLookStructure.ts`
- Modify: `sanity/desk/index.ts` (importar y registrar)

- [ ] **Step 1: Añadir el campo `orderRank` al schema de look**

En `sanity/schemas/documents/look.tsx`, dentro de `fields`, justo después del bloque `editorialImages` (cierra en la línea 63, antes de `components`), inserta:

```tsx
    defineField({
      name: 'orderRank',
      title: 'Orden',
      type: 'string',
      group: 'editorial',
      hidden: true,
      description: 'Posición manual asignada desde la vista "Ordenar looks".',
    }),
```

- [ ] **Step 2: Crear la estructura orderable de looks**

Crea `sanity/desk/orderLookStructure.ts` (mirror de `orderProductStructure.ts`):

```ts
import defineStructure from '../utils/defineStructure'
import {StackIcon} from '@sanity/icons'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'

export default defineStructure((S, context) =>
  S.listItem()
    .title('Ordenar Looks')
    .icon(StackIcon)
    .child(() =>
      S.list()
        .title('Looks')
        .items([
          orderableDocumentListDeskItem({type: 'look', S: S as any, context: context as any}) as any,
        ]),
    ),
)
```

- [ ] **Step 3: Registrar la estructura en el desk**

En `sanity/desk/index.ts`, añade el import después de la línea 17 (`import look from './lookStructure'`):

```ts
import orderLooks from './orderLookStructure'
```

Y en el array `.items([...])`, justo después de `look(S, context),` (línea 74), añade:

```ts
      orderLooks(S, context),
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add "sanity/schemas/documents/look.tsx" "sanity/desk/orderLookStructure.ts" "sanity/desk/index.ts"
git commit -m "feat(looks): orden manual de looks (plugin orderable) + vista de ordenar"
```

---

### Task 2: Query `getAllLooks` (lista para el archive)

**Files:**
- Modify: `sanity/queries/queries/look.ts` (añadir query + tipos al final, antes de no romper exports existentes)

- [ ] **Step 1: Añadir tipos y la función `getAllLooks`**

En `sanity/queries/queries/look.ts`, al final del archivo (después de `getLookSEO`), añade:

```ts
export type SanityLookComponentLite = {
  color: string | null
  productHandle: string | null
}

export type SanityLookListDoc = {
  _id: string
  title: string
  slug: string
  img: {imageUrl: string | null; alt: string | null} | null
  discountStrategy: 'none' | 'sumMinusFixed' | 'sumMinusPercent' | null
  discountValue: number | null
  components: SanityLookComponentLite[] | null
  orderRank: string | null
}

export const ALL_LOOKS_QUERY = groq`
  *[_type == "look"
     && defined(slug.current)
     && !(_id in path('drafts.**'))] | order(coalesce(orderRank, title) asc) {
    _id,
    title,
    "slug": slug.current,
    "img": editorialImages[0].image{ ${image}, "alt": alt },
    discountStrategy,
    discountValue,
    "components": components[]{
      color,
      "productHandle": product->store.slug.current
    },
    orderRank
  }
`

export async function getAllLooks(): Promise<SanityLookListDoc[]> {
  const docs = await client.fetch<SanityLookListDoc[]>(
    ALL_LOOKS_QUERY,
    {},
    {next: {tags: ['look'], revalidate: 3600}},
  )
  return docs ?? []
}
```

`image` y `client` ya están importados en este archivo (líneas 3-4).

- [ ] **Step 2: Verificar la query contra Sanity**

Crea un check temporal y córrelo (no se commitea):

Run:
```bash
node --env-file=.env.local -e "
const {createClient} = require('next-sanity');
const c = createClient({projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET, apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION, useCdn: false});
c.fetch('*[_type==\"look\" && defined(slug.current)] | order(coalesce(orderRank, title) asc){_id, title, \"slug\": slug.current, \"imageUrl\": editorialImages[0].image.asset->url, \"components\": components[]{color, \"productHandle\": product->store.slug.current}}').then(d => console.log(JSON.stringify(d, null, 2))).catch(e => {console.error(e); process.exit(1)});
"
```
Expected: imprime los looks con su slug, imageUrl, y componentes (color + productHandle). Confirma que hay looks y que los handles resuelven. (Nota: el `image` fragment del proyecto expone `imageUrl`; este check usa `asset->url` solo para validar datos sin importar el fragment en CommonJS.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add "sanity/queries/queries/look.ts"
git commit -m "feat(looks): query getAllLooks para el archive"
```

---

### Task 3: Fetch de productos componentes con facets + exportar el resolver de color

**Files:**
- Modify: `lib/shopify.js` (nueva función `getProductCardsByHandles`)
- Modify: `lib/shop/expandToCards.ts` (exportar `ShopifyProductNode` y `findVariantBaseGids`)

- [ ] **Step 1: Añadir `getProductCardsByHandles` en lib/shopify.js**

En `lib/shopify.js`, después de la función `getProductCards` (que termina cerca de la línea 675), añade:

```js
const PRODUCT_CARD_FULL_BY_HANDLE_QUERY = `
  ${PRODUCT_CARD_FRAGMENT}
  query ProductCardFullByHandle($handle: String!) {
    product(handle: $handle) { ...ProductCard }
  }
`

export async function getProductCardsByHandles(handles) {
  if (!Array.isArray(handles) || handles.length === 0) return []
  const results = await Promise.all(
    handles.map(async (handle) => {
      const data = await shopifyData(PRODUCT_CARD_FULL_BY_HANDLE_QUERY, {handle})
      return data?.product ?? null
    }),
  )
  return results.filter(Boolean)
}
```

Esta función usa `PRODUCT_CARD_FRAGMENT` (color-pattern, material, options, variants, priceRange), a diferencia de `getProductCards` que usa una query reducida.

- [ ] **Step 2: Exportar el resolver de color base desde expandToCards**

En `lib/shop/expandToCards.ts`, añade `export` a dos declaraciones existentes:

Línea 37 — el tipo del nodo de producto:
```ts
export type ShopifyProductNode = {
```

Línea 76 — la función que resuelve un valor de color a sus GIDs de color base:
```ts
export function findVariantBaseGids(p: ShopifyProductNode, colorValue: string): string[] {
```

No cambies nada más de esas declaraciones; solo añade la palabra `export`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sin errores (solo se añaden exports; nada que los rompa).

- [ ] **Step 4: Commit**

```bash
git add lib/shopify.js lib/shop/expandToCards.ts
git commit -m "feat(looks): fetch de productos componentes con facets + exportar resolver de color"
```

---

### Task 4: Tipos del archive + motor de agregación/filtrado

**Files:**
- Modify: `types/look.ts` (añadir `LookArchiveItem`)
- Create: `lib/look/buildLooksArchive.ts`

- [ ] **Step 1: Añadir el tipo `LookArchiveItem`**

En `types/look.ts`, al final del archivo, añade:

```ts
export type LookArchiveItem = {
  id: string
  title: string
  slug: string
  imageUrl?: string
  imageAlt?: string
  rawMin: number
  rawMax: number
  discMin: number
  discMax: number
  hasDiscount: boolean
  colorGids: string[]
  materialSlugs: string[]
  sizeSlugs: string[]
}
```

- [ ] **Step 2: Crear el motor `buildLooksArchive.ts`**

Crea `lib/look/buildLooksArchive.ts` con exactamente este contenido:

```ts
// lib/look/buildLooksArchive.ts
import {getAllLooks, type SanityLookListDoc} from '@/sanity/queries/queries/look'
import {getProductCardsByHandles} from '@/lib/shopify'
import {applyLookDiscount} from '@/lib/look/buildLookView'
import {findVariantBaseGids, type ShopifyProductNode} from '@/lib/shop/expandToCards'
import {productMaterialSlugs, type ProductWithMaterials} from '@/lib/shop/materialFilter'
import {extractSelectedColorGids, slugify} from '@/lib/shop/searchParams'
import type {FilterDefinition, ShopSearchParams} from '@/types/shop'
import type {LookArchiveItem} from '@/types/look'

// El nodo de Shopify trae color-pattern, opciones/variantes Y los metafields de
// material; la intersección lo hace asignable tanto a findVariantBaseGids como a
// productMaterialSlugs bajo strict mode.
type CardNode = ShopifyProductNode & ProductWithMaterials & {handle: string}

// Tallas (slug) y precios min/max del color fijo de un componente.
function componentSizesAndPrice(
  node: CardNode,
  color: string,
): {sizes: string[]; min: number; max: number; hasPrice: boolean} {
  const variants = node.variants?.nodes ?? []
  const sizeOptionName = node.options?.find((o) => o.name.toLowerCase() !== 'color')?.name
  const target = color.trim().toLowerCase()
  const sizes = new Set<string>()
  const prices: number[] = []
  for (const v of variants) {
    const c = v.selectedOptions.find((o) => o.name.toLowerCase() === 'color')?.value
    if (!c || c.trim().toLowerCase() !== target) continue
    const sizeVal = sizeOptionName
      ? v.selectedOptions.find((o) => o.name === sizeOptionName)?.value
      : undefined
    if (sizeVal) sizes.add(slugify(sizeVal))
    const price = Number(v.price.amount)
    if (Number.isFinite(price)) prices.push(price)
  }
  return {
    sizes: Array.from(sizes),
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
    hasPrice: prices.length > 0,
  }
}

function aggregateLook(
  look: SanityLookListDoc,
  productMap: Record<string, CardNode>,
): LookArchiveItem | null {
  const colorGids = new Set<string>()
  const materialSlugs = new Set<string>()
  const sizeSlugs = new Set<string>()
  let rawMin = 0
  let rawMax = 0
  let valid = 0

  for (const comp of look.components ?? []) {
    if (!comp.productHandle || !comp.color) continue
    const node = productMap[comp.productHandle]
    if (!node) continue
    const {sizes, min, max, hasPrice} = componentSizesAndPrice(node, comp.color)
    if (!hasPrice) continue
    valid++
    rawMin += min
    rawMax += max
    for (const g of findVariantBaseGids(node, comp.color)) colorGids.add(g)
    for (const s of productMaterialSlugs(node)) materialSlugs.add(s)
    for (const s of sizes) sizeSlugs.add(s)
  }

  if (valid === 0) return null

  const strategy = look.discountStrategy ?? 'none'
  const value = look.discountValue ?? 0
  const discMin = applyLookDiscount(rawMin, strategy, value)
  const discMax = applyLookDiscount(rawMax, strategy, value)

  return {
    id: look._id,
    title: look.title,
    slug: look.slug,
    imageUrl: look.img?.imageUrl ?? undefined,
    imageAlt: look.img?.alt ?? undefined,
    rawMin,
    rawMax,
    discMin,
    discMax,
    hasDiscount: strategy !== 'none' && value > 0 && discMin < rawMin,
    colorGids: Array.from(colorGids),
    materialSlugs: Array.from(materialSlugs),
    sizeSlugs: Array.from(sizeSlugs),
  }
}

function matchesFilters(
  item: LookArchiveItem,
  params: ShopSearchParams,
  selectedColorGids: string[],
): boolean {
  if (selectedColorGids.length) {
    const set = new Set(selectedColorGids)
    if (!item.colorGids.some((g) => set.has(g))) return false
  }
  const mats = (params.material ?? '').split(',').filter(Boolean)
  if (mats.length && !mats.some((m) => item.materialSlugs.includes(m))) return false
  const sizes = (params.size ?? '').split(',').filter(Boolean)
  if (sizes.length && !sizes.some((s) => item.sizeSlugs.includes(s))) return false
  if (params.priceMin || params.priceMax) {
    const min = params.priceMin ? Number(params.priceMin) : 0
    const max = params.priceMax ? Number(params.priceMax) : Number.POSITIVE_INFINITY
    // Solapa el rango con descuento del look con el rango seleccionado.
    if (item.discMax < min || item.discMin > max) return false
  }
  return true
}

/**
 * Carga todos los looks, hace batch-fetch de sus productos componentes, agrega
 * facets por look, filtra según `params` y ordena. `facets` (de getAllShopFilters)
 * se usa para resolver los color-slugs seleccionados a GIDs base.
 */
export async function getLookArchiveItems(
  params: ShopSearchParams,
  facets: FilterDefinition[],
): Promise<LookArchiveItem[]> {
  const looks = await getAllLooks()
  const handles = Array.from(
    new Set(
      looks.flatMap((l) =>
        (l.components ?? [])
          .map((c) => c.productHandle)
          .filter((h): h is string => !!h),
      ),
    ),
  )
  const nodes = (await getProductCardsByHandles(handles)) as CardNode[]
  const productMap: Record<string, CardNode> = {}
  for (const n of nodes) productMap[n.handle] = n

  const selectedColorGids = extractSelectedColorGids(params, facets)
  const items = looks
    .map((l) => aggregateLook(l, productMap))
    .filter((x): x is LookArchiveItem => x !== null)
    .filter((x) => matchesFilters(x, params, selectedColorGids))

  const sort = params.sort ?? 'featured'
  if (sort === 'price-asc') items.sort((a, b) => a.discMin - b.discMin)
  else if (sort === 'price-desc') items.sort((a, b) => b.discMin - a.discMin)
  // 'featured' conserva el orden de getAllLooks (orderRank asc).

  return items
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sin errores. `findVariantBaseGids` y `ShopifyProductNode` se importan de expandToCards (exportados en Task 3); `productMaterialSlugs` de materialFilter; `applyLookDiscount` de buildLookView.

- [ ] **Step 4: Commit**

```bash
git add types/look.ts lib/look/buildLooksArchive.ts
git commit -m "feat(looks): motor de agregación de facets y filtrado del archive"
```

---

### Task 5: Generalizar FilterDrawer (countAction) y SortRadios (options)

**Files:**
- Modify: `components/Shop/FilterDrawer/SortRadios.tsx`
- Modify: `components/Shop/FilterDrawer/FilterDrawer.tsx`

- [ ] **Step 1: SortRadios acepta una lista de opciones**

En `components/Shop/FilterDrawer/SortRadios.tsx`, cambia la interfaz `Props` (líneas 5-8) y el `.map` para aceptar `options` opcional:

```tsx
interface Props {
  value: SortKey
  onChange: (next: SortKey) => void
  options?: SortKey[]
}

const ORDER: SortKey[] = ['featured', 'newest', 'best-selling', 'price-asc', 'price-desc']

export default function SortRadios({value, onChange, options}: Props) {
  const list = options ?? ORDER
  return (
    <ul
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 0,
        margin: 0,
        listStyle: 'none',
      }}
    >
      {list.map((sk) => (
        <li key={sk}>
          <label style={{display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer'}}>
            <input
              type="radio"
              name="sort"
              value={sk}
              checked={value === sk}
              onChange={() => onChange(sk)}
            />
            {SORT_LABELS[sk]}
          </label>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: FilterDrawer acepta `countAction` y `sortOptions`**

En `components/Shop/FilterDrawer/FilterDrawer.tsx`:

(a) Cambia el import de la línea 6:
```tsx
import {getFilterCount} from '@/app/(frontend)/shop/actions'
```
por:
```tsx
import {getFilterCount as defaultCountAction} from '@/app/(frontend)/shop/actions'
```

(b) Cambia la interfaz `Props` (líneas 21-27) añadiendo dos props opcionales:
```tsx
interface Props {
  handle: string
  open: boolean
  facets: FilterDefinition[]
  defaults: ShopSearchParams
  initialCount: number
  countAction?: (args: {handle: string; params: ShopSearchParams}) => Promise<number>
  sortOptions?: SortKey[]
}
```

(c) Cambia la firma de la función (línea 29) para desestructurar las nuevas props con defaults:
```tsx
export default function FilterDrawer({
  handle,
  open,
  facets,
  defaults,
  initialCount,
  countAction = defaultCountAction,
  sortOptions,
}: Props) {
```

(d) En el efecto de conteo (líneas 72-76), cambia `getFilterCount(` por `countAction(`:
```tsx
    const t = setTimeout(() => {
      countAction({handle, params: state}).then((n) => {
        if (id === lastFetch.current) setCount(n)
      })
    }, 250)
```

(e) Añade `countAction` a las dependencias del efecto (línea 78):
```tsx
  }, [state, open, handle, countAction])
```

(f) Pasa `sortOptions` a `SortRadios` (línea 150):
```tsx
            <SortRadios value={state.sort ?? 'featured'} onChange={setSort} options={sortOptions} />
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: sin errores. La página de Shop sigue usando `FilterDrawer` sin `countAction`/`sortOptions` → usa los defaults (comportamiento idéntico).

- [ ] **Step 4: Commit**

```bash
git add components/Shop/FilterDrawer/SortRadios.tsx components/Shop/FilterDrawer/FilterDrawer.tsx
git commit -m "feat(looks): generalizar FilterDrawer (countAction) y SortRadios (options) para reuso"
```

---

### Task 6: Componentes LookGrid y LookCard

**Files:**
- Create: `components/Looks/LookGrid/LookGrid.tsx`
- Create: `components/Looks/LookGrid/LookGrid.module.scss`
- Create: `components/Looks/LookCard/LookCard.tsx`
- Create: `components/Looks/LookCard/LookCard.module.scss`

- [ ] **Step 1: LookCard.module.scss**

Crea `components/Looks/LookCard/LookCard.module.scss`:

```scss
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

- [ ] **Step 2: LookCard.tsx**

Crea `components/Looks/LookCard/LookCard.tsx`:

```tsx
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import PriceDisplay from '@/components/PageBuilder/PriceDisplay/PriceDisplay'
import type {LookArchiveItem} from '@/types/look'
import s from './LookCard.module.scss'

export default function LookCard({look}: {look: LookArchiveItem}) {
  return (
    <Link href={`/looks/${look.slug}`} className={s.card}>
      <div className={s.media}>
        {look.imageUrl && (
          <LazyImage
            src={look.imageUrl}
            alt={look.imageAlt ?? look.title}
            width={357}
            height={476}
            className={s.img}
          />
        )}
      </div>
      <div className={s.info}>
        <p className={s.title}>{look.title}</p>
        <PriceDisplay
          min={look.discMin}
          max={look.discMax > look.discMin ? look.discMax : undefined}
          compareAt={look.hasDiscount ? look.rawMin : undefined}
        />
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: LookGrid.module.scss**

Crea `components/Looks/LookGrid/LookGrid.module.scss` (clon de `ProductGrid.module.scss`):

```scss
@use '../../../styles/common/variables' as *;
@use '../../../styles/common/tokens' as *;
@use '../../../styles/mixins/mixins' as *;

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: px(1);

  @include from(md) {
    grid-template-columns: repeat(var(--cols), 1fr);
  }
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: px(16);
  padding: px(80) px(15);
  font-family: $MonumentGrotesk;
  font-size: px(13);
  line-height: px(20);
  color: map-get($colors, 'gray');

  a {
    color: map-get($colors, 'darker');
    text-decoration: underline;
  }
}
```

- [ ] **Step 4: LookGrid.tsx**

Crea `components/Looks/LookGrid/LookGrid.tsx`:

```tsx
import Link from 'next/link'
import type {CSSProperties} from 'react'
import type {ViewMode} from '@/types/shop'
import type {LookArchiveItem} from '@/types/look'
import LookCard from '@/components/Looks/LookCard/LookCard'
import s from './LookGrid.module.scss'

interface Props {
  looks: LookArchiveItem[]
  view: ViewMode
  hasActiveFilters?: boolean
}

export default function LookGrid({looks, view, hasActiveFilters}: Props) {
  if (looks.length === 0) {
    return (
      <div className={s.empty}>
        {hasActiveFilters ? (
          <>
            <p>No looks match your filters.</p>
            <Link href="/looks">Clear filters</Link>
          </>
        ) : (
          <p>No looks yet.</p>
        )}
      </div>
    )
  }

  return (
    <div
      className={s.grid}
      style={{['--cols' as string]: view === '4col' ? 4 : 2} as CSSProperties}
    >
      {looks.map((look) => (
        <LookCard key={look.id} look={look} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add components/Looks/
git commit -m "feat(looks): componentes LookGrid y LookCard"
```

---

### Task 7: Server action de conteo + LooksArchive + página

**Files:**
- Create: `app/(frontend)/looks/actions.ts`
- Create: `app/(frontend)/looks/LooksArchive.tsx`
- Create: `app/(frontend)/looks/page.tsx`

- [ ] **Step 1: Server action de conteo**

Crea `app/(frontend)/looks/actions.ts`:

```ts
// app/(frontend)/looks/actions.ts
'use server'

import {getAllShopFilters} from '@/lib/shopify'
import {getLookArchiveItems} from '@/lib/look/buildLooksArchive'
import type {ShopSearchParams} from '@/types/shop'

export async function getLookFilterCount(args: {
  handle: string
  params: ShopSearchParams
}): Promise<number> {
  const facets = await getAllShopFilters({filters: []})
  const items = await getLookArchiveItems(args.params, facets)
  return items.length
}
```

- [ ] **Step 2: LooksArchive (server component)**

Crea `app/(frontend)/looks/LooksArchive.tsx`:

```tsx
import ShopToolbar from '@/components/Shop/ShopToolbar/ShopToolbar'
import FilterDrawer from '@/components/Shop/FilterDrawer/FilterDrawer'
import LookGrid from '@/components/Looks/LookGrid/LookGrid'
import {getAllShopFilters} from '@/lib/shopify'
import {getLookArchiveItems} from '@/lib/look/buildLooksArchive'
import {parseSearchParams} from '@/lib/shop/searchParams'
import type {ShopSearchParams, SortKey} from '@/types/shop'
import {getLookFilterCount} from './actions'

const LOOK_SORT_OPTIONS: SortKey[] = ['featured', 'price-asc', 'price-desc']

interface Props {
  searchParams: Record<string, string | string[] | undefined>
}

export default async function LooksArchive({searchParams}: Props) {
  const params: ShopSearchParams = parseSearchParams(searchParams)
  const view = params.view ?? '4col'

  const facets = await getAllShopFilters({filters: []})
  const items = await getLookArchiveItems(params, facets)

  const hasActiveFilters = !!(
    params.color ||
    params.material ||
    params.size ||
    params.priceMin ||
    params.priceMax
  )
  const isOpen = params.filters === 'open'

  return (
    <>
      <ShopToolbar view={view} />
      <LookGrid looks={items} view={view} hasActiveFilters={hasActiveFilters} />
      <FilterDrawer
        handle="looks"
        open={isOpen}
        facets={facets}
        defaults={params}
        initialCount={items.length}
        countAction={getLookFilterCount}
        sortOptions={LOOK_SORT_OPTIONS}
      />
    </>
  )
}
```

- [ ] **Step 3: Página `/looks`**

Crea `app/(frontend)/looks/page.tsx`:

```tsx
import type {Metadata} from 'next'
import LooksArchive from './LooksArchive'
import {siteTitle} from '@/utils/seoHelper'

export const revalidate = 300

export const metadata: Metadata = {
  title: `Looks | ${siteTitle}`,
}

export default async function LooksIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  return <LooksArchive searchParams={params} />
}
```

> Nota: existe `app/(frontend)/looks/[slug]/page.tsx` para el detalle. Añadir `page.tsx` en `app/(frontend)/looks/` crea el índice `/looks` sin colisión.

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add "app/(frontend)/looks/actions.ts" "app/(frontend)/looks/LooksArchive.tsx" "app/(frontend)/looks/page.tsx"
git commit -m "feat(looks): página archive /looks (toolbar + grid + drawer reutilizados)"
```

---

### Task 8: Verificación end-to-end

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Build de producción**

Run: `npm run build`
Expected: build OK. Si falla por permisos de `.next`, ejecutar primero `sudo chown -R $(whoami) .next` y reintentar. La ruta `/looks` debe aparecer en el output del build.

- [ ] **Step 2: Verificación manual en la UI**

Run: `npm run dev`
En el navegador:
1. Abre `http://localhost:3000/looks/` → se ve el grid de looks con el toolbar (toggle 4col/2col).
2. Cambia el view toggle → el grid pasa de 2 a 4 columnas (desktop).
3. Abre el drawer de filtros (botón Filter) → aparecen Sort (solo Destacados + Precio ↑/↓), Size, Color, Materials, Price.
4. Selecciona un color presente en algún look → el contador "View products (N)" se actualiza; aplica → el grid se filtra y la URL gana `?color=...`.
5. Repite con Material y con un rango de Price; combina dos filtros (deben hacer AND).
6. Ordena por Precio ↑ y ↓ → el grid se reordena por precio con descuento.
7. Click en un look → navega a `/looks/<slug>` (detalle existente).
8. Verifica que una card con descuento muestra el precio nuevo y el original tachado.

Expected: todo se comporta como se describe. (Este paso lo hace el humano; el agente no puede usar el navegador.)

- [ ] **Step 3: Confirmar que Shop sigue intacto**

En el navegador, abre `http://localhost:3000/shop/?filters=open` → el drawer sigue mostrando TODAS las opciones de sort (Latest novelty, New arrivals, Best sellers, Price ↑/↓) y el filtro de material sigue funcionando. Confirma que las generalizaciones no rompieron Shop.

Expected: Shop sin cambios de comportamiento.

---

## Notas de cierre

- **Etiqueta de "featured"**: el label viene de `SORT_LABELS.featured` = "Latest novelty". Para looks significa "orden manual". Es cosméticamente impreciso pero funcional; renombrar/parametrizar labels queda fuera de v1.
- **Disponibilidad e infinite scroll**: fuera de v1 por decisión de diseño (looks son pocos → se renderizan todos).
- **Enlace en el menú**: `/looks` aún no se enlaza en el nav (feature aparte; `/looks` no es documento de Sanity, requiere un linkExternal o ampliar el schema de menú).
- **Doble fetch en el contador**: `getLookFilterCount` re-ejecuta `getLookArchiveItems` en cada cambio de filtro (debounced), igual que el patrón de Shop. Aceptable por el bajo número de looks.
```
