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
  const add = (mf: MaterialMetafield | undefined) => {
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
  return products.filter((p) => {
    const mats = productMaterialSlugs(p)
    return selectedSlugs.some((s) => mats.has(s))
  })
}
