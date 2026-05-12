// lib/product/resolveInitialState.ts
import type {ProductView, ProductInitialState} from '@/types/product'

function pickFirst(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

export function resolveInitialState(
  view: ProductView,
  searchParams: Record<string, string | string[] | undefined>,
): ProductInitialState {
  const requestedColor = pickFirst(searchParams.color)
  const colorExists = view.colors.find((c) => c.slug === requestedColor)
  const color = colorExists?.slug ?? view.defaultColorSlug

  const requestedSize = pickFirst(searchParams.size)
  const resolvedColor = view.colors.find((c) => c.slug === color)
  const sizeExists = resolvedColor?.sizes.find(
    (s) => s.label === requestedSize && s.availableForSale,
  )
  return {color, size: sizeExists?.label}
}
