# Sets — Archive (`/sets`) — Diseño

- **Fecha:** 2026-06-09
- **Figma archive:** file `u92pryF41Lr42YVpq1Qxsn`, `node-id=11-4977` (fila de ejemplo: `11-4981`)
- **Objetivo:** Página de listado de sets (`/sets`): un listado vertical editorial donde cada set se muestra como una fila de las imágenes de sus productos componentes + un caption, enlazando al detalle del set. **Spec 2 de 2** (el single view `/sets/[slug]` ya está hecho).

---

## Decisiones acordadas (brainstorming)

1. **Sin filtros ni toolbar** — fiel al Figma. NO se usa `ShopToolbar`/`FilterDrawer` (a diferencia del looks archive). Listado vertical simple ordenado por `orderRank`.
2. **La fila entera enlaza a `/sets/[slug]`** — los minis son presentación de las piezas del set; no enlazan a productos sueltos ni tienen quick-add.
3. **Caption línea 2 = `title` del set** — el editor escribe ahí la composición (p. ej. "Jersey cotton 100% organic - fitted sheet, Duvet cover, pillow cases").
4. **Minis = imágenes simples** del producto componente (sin badge "Novedades", sin icono). YAGNI.

---

## Estado actual relevante

- El documento `set` y `/sets/[slug]` (single view) ya existen (Spec 1). `set` tiene `components[]` (`bundleComponent` = producto + color fijo), `title`, `slug`, `discountStrategy/Value`, `orderRank`.
- El **looks archive** (`app/(frontend)/looks/`) es referencia parcial pero diverge: usa `ShopToolbar` + `FilterDrawer` + `LookGrid` (card de 1 imagen editorial). El sets archive NO lleva filtros y su card es una **fila de N imágenes de componentes**.
- Reutilizables: `getProductCardsByHandles` (lib/shopify) devuelve por producto `featuredImage{url,altText}`, `priceRange`, `variants[]{image, price, selectedOptions}`, `options`. `applyLookDiscount` (lib/look/buildLookView). `LazyImage`.
- En el Figma cada fila tiene 3-4 `Product | Mini` (358×444, aspect ~3:4) centrados (3 → ancho 1074, 4 → ancho completo) + caption centrado de 3 líneas.

---

## Arquitectura

```
getAllSets()                      (nuevo, en sanity/queries/queries/set.ts)
  ↓ getSetArchiveItems()          (nuevo, lib/set/buildSetsArchive.ts)
  ↓ batch-fetch productos componentes en Shopify (getProductCardsByHandles)
  ↓ por set: { id, title, slug, components:[{imageUrl, imageAlt}], priceMin, priceMax }
  ↓ app/(frontend)/sets/page.tsx → <SetsArchive> (server) → <SetList> → <SetRow> por set
```

Sin filtrado ni sort en cliente: el orden lo fija `orderRank` (modo "featured").

---

## 1. Query — `getAllSets()` (en `sanity/queries/queries/set.ts`)

Mirror ligero de `getAllLooks`/`ALL_LOOKS_QUERY`, pero devolviendo **todos** los componentes (no solo el primer editorial):

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
```

`ALL_SETS_QUERY`: `*[_type == "set" && defined(slug.current) && !(_id in path('drafts.**'))] | order(coalesce(orderRank, title) asc){ _id, title, "slug": slug.current, discountStrategy, discountValue, "components": components[]{ color, "productHandle": product->store.slug.current }, orderRank }`. Tags `['set','product']`, revalidate 3600.

`getAllSets(): Promise<SanitySetListDoc[]>`.

## 2. Construcción — `lib/set/buildSetsArchive.ts` → `getSetArchiveItems()`

Mirror de `lib/look/buildLooksArchive.ts` pero **sin facets/filtros** y capturando **imágenes de cada componente**:

- Carga `getAllSets()`. Junta los `productHandle` únicos de todos los componentes y hace `getProductCardsByHandles(handles)` → `productMap` por handle.
- Por componente (en orden): localiza el nodo; entre sus `variants` filtra los del color `comp.color` (case-insensitive, como `buildLookView`); de esos toma el primer `image.url`/`altText` (fallback `node.featuredImage`) y el min/max de `price.amount`.
- Por set: `priceMin = Σ min`, `priceMax = Σ max`; aplica `applyLookDiscount(priceMin/priceMax, discountStrategy, discountValue)`. Construye `components: [{imageUrl, imageAlt}]` solo con los que tienen imagen/precio válidos. Descarta sets sin componentes válidos.
- Devuelve `SetArchiveItem[]` en el orden de `getAllSets()` (orderRank). Sin parámetros de filtrado/sort.

## 3. Tipos — `types/set.ts` (nuevo)

```ts
export type SetArchiveComponent = {imageUrl?: string; imageAlt?: string}
export type SetArchiveItem = {
  id: string
  title: string
  slug: string
  components: SetArchiveComponent[]
  priceMin: number
  priceMax: number
}
```

## 4. Componentes

- **`components/Sets/SetRow/SetRow.tsx` (+ `.module.scss`)**: `<Link href={`/sets/${item.slug}`}>` envolviendo:
  - una tira de `LazyImage` (una por `item.components`, aspect ~3:4, ancho 358).
  - un caption centrado de 3 líneas: `Complete Set` (Helvetica 13px) / `{item.title}` (11px) / `€{priceMin}-€{priceMax}` (11px). Si `priceMin === priceMax`, mostrar un solo precio.
  - **Mobile-first SCSS** (referencias Figma: mobile `node-id=11-5076`, desktop `11-4977`):
    - **Base (móvil):** los minis en **rejilla de 2 columnas** (`display: grid; grid-template-columns: 1fr 1fr; gap`), cada mini aspect ~3:4 (199×262). Con número impar de componentes, el último mini va **centrado** a ancho de una columna (`.mini:last-child:nth-child(odd) { grid-column: 1 / -1; justify-self: center; width: calc(50% - <gap>/2) }`). Caption centrado debajo. (Ej.: 4 componentes → 2×2; 3 → fila de 2 + 1 centrado.)
    - **`@media (min-width: 768px)`:** los minis en **una sola fila** flex de N columnas iguales (358px), centrada (3 → centrada ~1074px; 4 → ancho completo). Caption centrado debajo.
- **`components/Sets/SetList/SetList.tsx` (+ `.module.scss`)**: recibe `items: SetArchiveItem[]`; renderiza la lista vertical de `<SetRow>`; estado vacío ("No sets yet.").
- **`app/(frontend)/sets/SetsArchive.tsx`** (server component): `const items = await getSetArchiveItems()` → `<SetList items={items} />`.

## 5. Ruta — `app/(frontend)/sets/page.tsx`

Convive con `app/(frontend)/sets/[slug]/`. Espeja `app/(frontend)/looks/page.tsx`:

```tsx
import type {Metadata} from 'next'
import SetsArchive from './SetsArchive'
import {siteTitle} from '@/utils/seoHelper'

export const revalidate = 300

export const metadata: Metadata = {title: `Sets | ${siteTitle}`}

export default async function SetsIndexPage() {
  return <SetsArchive />
}
```

(No usa `searchParams` porque no hay filtros.)

## 6. Revalidación / SEO

- No hay queries nuevas con tags fuera de las del Spec 1; `getAllSets` usa `['set','product']`, ya cubiertos por el webhook de `set`/`product`. Sin cambios en `app/api/revalidate/route.ts`.
- Metadata estática `Sets | Mikmax` (paridad con `/looks`).

---

## Lista de archivos

**Nuevos**
- `lib/set/buildSetsArchive.ts`
- `types/set.ts`
- `components/Sets/SetRow/SetRow.tsx` + `.module.scss`
- `components/Sets/SetList/SetList.tsx` + `.module.scss`
- `app/(frontend)/sets/SetsArchive.tsx`
- `app/(frontend)/sets/page.tsx`

**Modificados**
- `sanity/queries/queries/set.ts` (añadir `getAllSets` + tipos lista + `ALL_SETS_QUERY`)

**Reutilizados sin cambios**
- `getProductCardsByHandles` (lib/shopify), `applyLookDiscount` (lib/look/buildLookView), `LazyImage`.

---

## Supuestos a verificar en implementación

- La forma del nodo de `getProductCardsByHandles` (campos `featuredImage`, `variants[].image`, `variants[].selectedOptions`, `priceRange`) — confirmada por `PRODUCT_CARD_FRAGMENT` en `lib/shopify.js`.
- El filtrado de variantes por color replica la lógica de `buildLookView`/`buildLooksArchive` (`selectedOptions` name `color` case-insensitive).
- Aspect ratio y anchos exactos de los minis y gaps → ajustar contra el Figma en la fase visual (skill `pixel-perfect`).

## Fuera de alcance

- Nav "Complete Sets" → `/sets` (cambio de contenido en el menú de Sanity, no código).
- Reescritura de `block.setModule` para referenciar documentos `set`.
- Filtros/orden/toolbar, badge "Novedades", botón de favoritos sobre los minis (aparece en el Figma pero no hay sistema de favoritos), agrupación por colorways.
- Rename del código compartido de bundle a nombres neutros.
