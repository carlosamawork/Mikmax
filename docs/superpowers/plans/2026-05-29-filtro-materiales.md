# Filtro de materiales (Shop) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un filtro "Materials" unificado en el archive de Shop que filtra productos por su material de cubierta, relleno y/o tejido, vía los metafields de taxonomía de Shopify.

**Architecture:** Espejo del filtro de color existente pero a **nivel producto** (no variante). Tres metafields de taxonomía (`cover-material`, `filler-material`, `fabric`) se leen en el fragment de producto compartido; sus valores se fusionan en un solo filtro deduplicado por label; el filtrado es **client-side con semántica OR** (igual que color, porque la API de Shopify hace AND entre metafields de taxonomía). Un producto pasa si alguno de sus materiales coincide con los seleccionados.

**Tech Stack:** Next.js 15 (App Router, Server Components + server actions), Shopify Storefront GraphQL, TypeScript, SCSS modules.

**Convenciones del repo:** Prettier sin punto y coma, comillas simples, 100 chars, sin bracket spacing. Imports con alias `@/`. Mobile-first SCSS. Nunca commit sin confirmar con el usuario (CLAUDE.md).

**Datos confirmados en vivo (Storefront API):**
- Facets: `filter.v.t.shopify.cover-material` ("Material de la cubierta"), `filter.v.t.shopify.filler-material` ("Material de relleno"), `filter.v.t.shopify.fabric` ("Tejido").
- Cada metafield es `list.metaobject_reference`; cada metaobject tiene `fields` con `label` (ej. "Cotton") y `taxonomy_reference` (un GID).
- El **mismo material tiene GID distinto por metafield pero label idéntico** → matcheamos por `label` (slug), no por GID.

---

### Task 1: Añadir los metafields de material al fragment de producto compartido

**Files:**
- Modify: `lib/shopify.js:334-387` (`PRODUCT_CARD_FRAGMENT`)

- [ ] **Step 1: Añadir los tres metafields al fragment**

En `lib/shopify.js`, dentro de `PRODUCT_CARD_FRAGMENT`, justo después del bloque `colorPattern { ... }` (cierra en la línea 363) y antes de `featuredImage { url altText }` (línea 364), inserta:

```graphql
    coverMaterial: metafield(namespace: "shopify", key: "cover-material") {
      references(first: 10) {
        nodes { ... on Metaobject { fields { key value } } }
      }
    }
    fillerMaterial: metafield(namespace: "shopify", key: "filler-material") {
      references(first: 10) {
        nodes { ... on Metaobject { fields { key value } } }
      }
    }
    fabric: metafield(namespace: "shopify", key: "fabric") {
      references(first: 10) {
        nodes { ... on Metaobject { fields { key value } } }
      }
    }
```

Este fragment lo comparten `COLLECTION_PRODUCTS_QUERY` (l.390) y `SEARCH_PRODUCTS_QUERY` (l.494), así que cubre tanto `/shop` como las páginas de colección sin más cambios.

- [ ] **Step 2: Verificar que la query sigue siendo válida contra Shopify**

Run: `node --env-file=.env.local scripts/inspect-product-materials.mjs`
Expected: imprime productos con sus bloques `coverMaterial`/`fillerMaterial`/`fabric` y campos `label` (ya verificado que existen datos: "Cotton Sateen Flat Sheet" → fabric Cotton; "Handmade Knitted Cotton Cushion" → cover+filler Cotton). Sin errores GraphQL.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sin errores (el fragment es un string, no afecta tipos todavía).

- [ ] **Step 4: Commit**

```bash
git add lib/shopify.js
git commit -m "feat(shop): leer metafields de material (cubierta/relleno/tejido) en el fragment de producto"
```

---

### Task 2: Plumbing del parámetro `material` en tipos y URL

**Files:**
- Modify: `types/shop.ts:18-29` (`ShopSearchParams`)
- Modify: `lib/shop/searchParams.ts:7` (`FILTER_KEYS`)

- [ ] **Step 1: Añadir `material` a `ShopSearchParams`**

En `types/shop.ts`, dentro de `ShopSearchParams`, añade la línea `material` justo después de `pattern?: string` (línea 25):

```ts
export type ShopSearchParams = {
  view?: ViewMode
  sort?: SortKey
  filters?: 'open'
  productType?: string  // comma-separated kebab-case values
  color?: string
  size?: string
  pattern?: string
  material?: string     // comma-separated slugged material labels (cover/filler/fabric)
  priceMin?: string
  priceMax?: string
  available?: string    // 'true' to show only in-stock
}
```

- [ ] **Step 2: Añadir `material` a `FILTER_KEYS`**

En `lib/shop/searchParams.ts:7`, cambia:

```ts
const FILTER_KEYS = ['productType', 'color', 'size', 'pattern'] as const
```

por:

```ts
const FILTER_KEYS = ['productType', 'color', 'size', 'pattern', 'material'] as const
```

Esto hace que `parseSearchParams` y `serializeSearchParams` (que iteran `FILTER_KEYS`) gestionen el param `material` automáticamente. **No** lo añadas a `FACET_IDS` ni a `buildShopifyFilters`: material se filtra en cliente, igual que color (que está excluido a propósito de `buildShopifyFilters`).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sin errores. `parseSearchParams` ya tipa `out[key]` contra `ShopSearchParams`, y `material` ahora existe ahí.

- [ ] **Step 4: Commit**

```bash
git add types/shop.ts lib/shop/searchParams.ts
git commit -m "feat(shop): aceptar el parámetro de URL 'material' en search params"
```

---

### Task 3: Módulo de filtrado de materiales (funciones puras)

**Files:**
- Create: `lib/shop/materialFilter.ts`

- [ ] **Step 1: Crear el módulo con las cuatro funciones**

Crea `lib/shop/materialFilter.ts` con exactamente este contenido:

```ts
// lib/shop/materialFilter.ts
import type {FilterDefinition, FilterValue} from '@/types/shop'
import {slugify} from '@/lib/shop/searchParams'

// Las keys de taxonomía de material varían por categoría en Shopify. Cojines:
// cover-material + filler-material. Textiles (manteles, sábanas): fabric.
// Crecerá al configurar más categorías.
export const MATERIAL_TAXONOMY_KEYS = ['cover-material', 'filler-material', 'fabric'] as const

export const MATERIAL_FACET_IDS = MATERIAL_TAXONOMY_KEYS.map(
  (k) => `filter.v.t.shopify.${k}`,
)

type MaterialMetaobjectNode = {
  fields?: {key: string; value: string | null}[]
}
type MaterialMetafield = {
  references?: {nodes: MaterialMetaobjectNode[]} | null
} | null

// Estructura mínima que necesita un producto para filtrar por material. Todas las
// props son opcionales, así que cualquier nodo de producto de Shopify es
// asignable a este tipo sin redeclarar sus tipos locales.
export type ProductWithMaterials = {
  coverMaterial?: MaterialMetafield
  fillerMaterial?: MaterialMetafield
  fabric?: MaterialMetafield
}

/**
 * Fusiona los valores de los tres facets de material en una sola lista,
 * deduplicada por slug del label (sumando counts). El mismo material aparece en
 * varias keys con GID distinto pero label idéntico, por eso se agrupa por label.
 */
export function getMaterialFacetValues(facets: FilterDefinition[]): FilterValue[] {
  const bySlug = new Map<string, FilterValue>()
  for (const id of MATERIAL_FACET_IDS) {
    const facet = facets.find((f) => f.id === id)
    if (!facet) continue
    for (const v of facet.values) {
      const slug = slugify(v.label)
      const existing = bySlug.get(slug)
      if (existing) existing.count += v.count
      else bySlug.set(slug, {...v, id: `material-${slug}`})
    }
  }
  return Array.from(bySlug.values()).sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Conjunto de slugs de material presentes en un producto, uniendo los labels de
 * los tres metafields (cubierta, relleno, tejido).
 */
export function productMaterialSlugs(p: ProductWithMaterials): Set<string> {
  const out = new Set<string>()
  const add = (mf: MaterialMetafield) => {
    for (const node of mf?.references?.nodes ?? []) {
      const label = node.fields?.find((f) => f.key === 'label')?.value
      if (label) out.add(slugify(label))
    }
  }
  add(p.coverMaterial)
  add(p.fillerMaterial)
  add(p.fabric)
  return out
}

/**
 * Conserva los productos cuyo conjunto de materiales interseca con los slugs
 * seleccionados (semántica OR). Sin selección, devuelve todos.
 */
export function filterProductsByMaterial<T extends ProductWithMaterials>(
  products: T[],
  selectedSlugs: string[],
): T[] {
  if (!selectedSlugs.length) return products
  const selected = new Set(selectedSlugs)
  return products.filter((p) => {
    const mats = productMaterialSlugs(p)
    for (const s of selected) if (mats.has(s)) return true
    return false
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sin errores. `slugify` y los tipos `FilterDefinition`/`FilterValue` ya existen y se importan.

- [ ] **Step 3: Commit**

```bash
git add lib/shop/materialFilter.ts
git commit -m "feat(shop): helpers de filtrado de material (merge de facets + match por label)"
```

---

### Task 4: Aplicar el filtro de material en el pipeline (grid + conteo)

La lógica está duplicada en dos sitios; hay que tocar ambos para que el grid y el
contador del drawer ("View products (N)") coincidan.

**Files:**
- Modify: `app/(frontend)/shop/ShopArchive.tsx:18` (import) y `:132` (expand)
- Modify: `app/(frontend)/shop/actions.ts:13` (import) y `:99` (expand)

- [ ] **Step 1: ShopArchive — import**

En `app/(frontend)/shop/ShopArchive.tsx`, después de la línea 18 (`import {expandProductsToCards} from '@/lib/shop/expandToCards'`), añade:

```ts
import {filterProductsByMaterial} from '@/lib/shop/materialFilter'
```

- [ ] **Step 2: ShopArchive — aplicar el filtro antes de expandir**

En `app/(frontend)/shop/ShopArchive.tsx`, reemplaza la línea 132:

```ts
  const expanded = expandProductsToCards(orderedProducts, selectedColorGids)
```

por:

```ts
  const selectedMaterialSlugs = (params.material ?? '').split(',').filter(Boolean)
  const materialFiltered = filterProductsByMaterial(orderedProducts, selectedMaterialSlugs)
  const expanded = expandProductsToCards(materialFiltered, selectedColorGids)
```

- [ ] **Step 3: actions — import**

En `app/(frontend)/shop/actions.ts`, después de la línea 12 (`import {expandProductsToCards} from '@/lib/shop/expandToCards'`), añade:

```ts
import {filterProductsByMaterial} from '@/lib/shop/materialFilter'
```

- [ ] **Step 4: actions — aplicar el filtro antes de expandir**

En `app/(frontend)/shop/actions.ts`, reemplaza la línea 99:

```ts
  const expanded = expandProductsToCards(orderedProducts, selectedColorGids)
```

por:

```ts
  const selectedMaterialSlugs = (params.material ?? '').split(',').filter(Boolean)
  const materialFiltered = filterProductsByMaterial(orderedProducts, selectedMaterialSlugs)
  const expanded = expandProductsToCards(materialFiltered, selectedColorGids)
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: sin errores. `orderedProducts` (tipo local `ShopifyProductNode`, sin props de material declaradas) es asignable a `ProductWithMaterials` porque todas sus props son opcionales; `filterProductsByMaterial` devuelve el mismo tipo, que `expandProductsToCards` ya aceptaba.

- [ ] **Step 6: Commit**

```bash
git add "app/(frontend)/shop/ShopArchive.tsx" "app/(frontend)/shop/actions.ts"
git commit -m "feat(shop): filtrar productos por material en grid y contador"
```

---

### Task 5: UI — MaterialChips + sección "Materials" en el drawer

**Files:**
- Create: `components/Shop/FilterDrawer/MaterialChips.tsx`
- Modify: `components/Shop/FilterDrawer/FilterDrawer.tsx`

- [ ] **Step 1: Crear MaterialChips**

Crea `components/Shop/FilterDrawer/MaterialChips.tsx` (clon del patrón de `SizeChips`, mismas props):

```tsx
'use client'
import type {FilterValue} from '@/types/shop'
import {slugify} from '@/lib/shop/searchParams'

interface Props {
  values: FilterValue[]
  selected: string[]
  onToggle: (kebabValue: string) => void
}

export default function MaterialChips({values, selected, onToggle}: Props) {
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
      {values.map((v) => {
        const key = slugify(v.label)
        const checked = selected.includes(key)
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onToggle(key)}
            disabled={v.count === 0 && !checked}
            style={{
              padding: '6px 10px',
              border: '1px solid #c4c4c4',
              background: checked ? '#111' : '#fff',
              color: checked ? '#fff' : '#111',
              cursor: v.count === 0 && !checked ? 'not-allowed' : 'pointer',
              fontSize: 11,
              letterSpacing: 0.5,
            }}
          >
            {v.label} <span style={{opacity: 0.6}}>({v.count})</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: FilterDrawer — imports**

En `components/Shop/FilterDrawer/FilterDrawer.tsx`, después de la línea 10 (`import SizeChips from './SizeChips'`), añade:

```tsx
import MaterialChips from './MaterialChips'
import {getMaterialFacetValues} from '@/lib/shop/materialFilter'
```

- [ ] **Step 3: FilterDrawer — ampliar la unión de claves de `toggleListValue`**

En `components/Shop/FilterDrawer/FilterDrawer.tsx:88`, cambia la firma:

```tsx
  function toggleListValue(key: 'productType' | 'color' | 'size' | 'pattern', kebab: string) {
```

por:

```tsx
  function toggleListValue(
    key: 'productType' | 'color' | 'size' | 'pattern' | 'material',
    kebab: string,
  ) {
```

- [ ] **Step 4: FilterDrawer — añadir `material` al memo `selected`**

En `components/Shop/FilterDrawer/FilterDrawer.tsx:119-127`, dentro del objeto que devuelve el `useMemo`, añade la línea `material` tras `pattern`:

```tsx
  const selected = useMemo(
    () => ({
      productType: (state.productType ?? '').split(',').filter(Boolean),
      color: (state.color ?? '').split(',').filter(Boolean),
      size: (state.size ?? '').split(',').filter(Boolean),
      pattern: (state.pattern ?? '').split(',').filter(Boolean),
      material: (state.material ?? '').split(',').filter(Boolean),
    }),
    [state],
  )
```

- [ ] **Step 5: FilterDrawer — calcular los valores de material fusionados**

En `components/Shop/FilterDrawer/FilterDrawer.tsx`, justo después de la línea 129 (`const facet = (id: string) => facets.find((f) => f.id === id)`), añade:

```tsx
  const materialValues = useMemo(() => getMaterialFacetValues(facets), [facets])
```

- [ ] **Step 6: FilterDrawer — renderizar la sección "Materials"**

En `components/Shop/FilterDrawer/FilterDrawer.tsx`, inserta este bloque inmediatamente después del cierre del acordeón de Color (la línea 181, `)}` que cierra el `{facet(FACET_ID.color) && ( ... )}`) y antes del acordeón de Price (línea 183):

```tsx
          {materialValues.length > 0 && (
            <FilterAccordion
              id="material"
              title="Materials"
              open={accordion === 'material'}
              onToggle={toggleAccordion}
            >
              <MaterialChips
                values={materialValues}
                selected={selected.material}
                onToggle={(v) => toggleListValue('material', v)}
              />
            </FilterAccordion>
          )}
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 8: Lint**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 9: Commit**

```bash
git add components/Shop/FilterDrawer/MaterialChips.tsx components/Shop/FilterDrawer/FilterDrawer.tsx
git commit -m "feat(shop): sección 'Materials' unificada en el drawer de filtros"
```

---

### Task 6: Verificación end-to-end (datos reales + build + UI)

**Files:**
- Create: `scripts/verify-material-filter.mjs`

- [ ] **Step 1: Crear el script de verificación contra datos reales**

Crea `scripts/verify-material-filter.mjs`:

```js
// Verifica el filtro de material contra datos reales del store.
// Uso: node --env-file=.env.local scripts/verify-material-filter.mjs [material-slug]
// Ej.: node --env-file=.env.local scripts/verify-material-filter.mjs cotton

const domain = process.env.SHOPIFY_STORE_DOMAIN
const token = process.env.SHOPIFY_STOREFRONT_ACCESSTOKEN
const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-10'
const target = (process.argv[2] || 'cotton').toLowerCase()

const slugify = (label) =>
  label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const mf = (alias, key) => `
  ${alias}: metafield(namespace: "shopify", key: "${key}") {
    references(first: 10) { nodes { ... on Metaobject { fields { key value } } } }
  }`

const query = `
  query {
    products(first: 250) {
      nodes {
        handle
        ${mf('coverMaterial', 'cover-material')}
        ${mf('fillerMaterial', 'filler-material')}
        ${mf('fabric', 'fabric')}
      }
    }
  }`

const res = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token},
  body: JSON.stringify({query}),
})
const json = await res.json()
if (json.errors) {
  console.error(JSON.stringify(json.errors, null, 2))
  process.exit(1)
}

const productSlugs = (p) => {
  const out = new Set()
  for (const k of ['coverMaterial', 'fillerMaterial', 'fabric']) {
    for (const n of p[k]?.references?.nodes ?? []) {
      const label = n.fields?.find((f) => f.key === 'label')?.value
      if (label) out.add(slugify(label))
    }
  }
  return out
}

const nodes = json?.data?.products?.nodes ?? []
const all = new Set()
const matches = []
for (const p of nodes) {
  const slugs = productSlugs(p)
  for (const s of slugs) all.add(s)
  if (slugs.has(target)) matches.push(p.handle)
}

console.log(`Materiales presentes en el catálogo: ${[...all].sort().join(', ') || '(ninguno)'}`)
console.log(`\nProductos con material "${target}" (${matches.length}):`)
for (const h of matches) console.log(`  - ${h}`)
if (!all.has(target)) console.log(`\n⚠️  "${target}" no existe; prueba uno de la lista de arriba.`)
```

- [ ] **Step 2: Ejecutar la verificación de datos**

Run: `node --env-file=.env.local scripts/verify-material-filter.mjs cotton`
Expected: lista los materiales del catálogo (incluye `cotton`, `felt`, `wool`) y los handles con material "cotton" (al menos `sateen-cotton-fs` y `handmade-knitted-cotton`, los productos piloto). Confirma que la lógica de match por label funciona contra datos reales.

- [ ] **Step 3: Build de producción**

Run: `npm run build`
Expected: build OK, sin errores de tipos ni de runtime en SSR de `/shop`.

- [ ] **Step 4: Verificación manual en la UI**

Run: `npm run dev`
Luego en el navegador:
1. Abre `http://localhost:3000/shop/?filters=open`.
2. Confirma que aparece la sección **"Materials"** con chips (Cotton, Felt, Wool) y sus counts.
3. Selecciona **Cotton** → el contador "View products (N)" se actualiza (debounce 250ms).
4. Pulsa **View products** → la URL gana `?material=cotton` y el grid muestra solo productos con Cotton.
5. Pulsa **Clear all** → `material` desaparece de la URL y vuelven todos.
6. Repite en una página de colección, ej. `http://localhost:3000/shop/<handle>/?filters=open`, para confirmar que el facet también sale por colección.

Expected: todos los pasos se comportan como se describe.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-material-filter.mjs
git commit -m "chore(shop): script de verificación del filtro de material contra datos reales"
```

---

## Notas de cierre

- **Scripts de inspección** (`scripts/inspect-shopify-filters.mjs`, `scripts/inspect-product-materials.mjs`) ya existen en el árbol de trabajo desde la fase de diseño; decidir con el usuario si se commitean o se descartan.
- **i18n**: los labels se muestran en inglés (Cotton, Felt, Wool) por decisión de diseño; la traducción entra en el esfuerzo global de i18n.
- **Categorías futuras**: al configurar material en categorías nuevas, añadir su key a `MATERIAL_TAXONOMY_KEYS` y activarla en Search & Discovery.
- **Lookbook archive**: feature aparte (spec propio) que reutilizará `getMaterialFacetValues` y el mismo motor.
```
