// lib/look/buildLooksArchive.ts
import {getAllLooks, type SanityLookListDoc} from '@/sanity/queries/queries/look'
import {getProductCardsByHandles} from '@/lib/shopify'
import {applyLookDiscount} from '@/lib/look/buildLookView'
import {findVariantBaseGids, type ShopifyProductNode} from '@/lib/shop/expandToCards'
import {productMaterialSlugs, type ProductWithMaterials} from '@/lib/shop/materialFilter'
import {extractSelectedColorGids, slugify} from '@/lib/shop/searchParams'
import {getLocale} from '@/lib/i18n/getLocale'
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
    for (const s of Array.from(productMaterialSlugs(node))) materialSlugs.add(s)
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
  const lang = await getLocale()
  const looks = await getAllLooks(lang)
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
