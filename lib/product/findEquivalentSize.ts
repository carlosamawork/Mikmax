import type {ProductColor, ProductView} from '@/types/product'

/**
 * When switching color, keep the previously-selected size if it exists and is
 * still available in the new color; otherwise return undefined so the UI resets
 * to "Please Select Size".
 */
export function findEquivalentSize(
  view: ProductView,
  newColorSlug: string,
  prevSize: string | undefined,
): string | undefined {
  if (!prevSize) return undefined
  const color = view.colors.find((c) => c.slug === newColorSlug)
  if (!color) return undefined
  const sameLabel = color.sizes.find((s) => s.label === prevSize)
  return sameLabel?.availableForSale ? sameLabel.label : undefined
}

export function findColor(view: ProductView, slug: string): ProductColor | undefined {
  return view.colors.find((c) => c.slug === slug)
}

export function findVariant(
  view: ProductView,
  colorSlug: string,
  sizeLabel: string | undefined,
): {variantId: string; price: number} | undefined {
  if (!sizeLabel) return undefined
  const color = findColor(view, colorSlug)
  const size = color?.sizes.find((s) => s.label === sizeLabel)
  return size?.availableForSale ? {variantId: size.variantId, price: size.price} : undefined
}
