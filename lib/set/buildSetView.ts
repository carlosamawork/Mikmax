// lib/set/buildSetView.ts
import {buildLookView} from '@/lib/look/buildLookView'
import type {LookView, LookGalleryImage} from '@/types/look'

/**
 * Vista del detalle de un set. Reutiliza `buildLookView` (la maquinaria de
 * bundle es genérica) y antepone a la galería las imágenes principales de cada
 * producto componente (en el color cerrado del set, en orden de componente),
 * seguidas de las imágenes editoriales de Sanity.
 */
export function buildSetView(
  set: Parameters<typeof buildLookView>[0],
  details: Parameters<typeof buildLookView>[1],
  relatedCards: Parameters<typeof buildLookView>[2],
): LookView {
  const view = buildLookView(set, details, relatedCards)
  const componentImages: LookGalleryImage[] = view.components
    .map((c): LookGalleryImage | null => (c.imageUrl ? {url: c.imageUrl, altText: c.label} : null))
    .filter((x): x is LookGalleryImage => x !== null)
  return {...view, images: [...componentImages, ...view.images]}
}
