import type {PortableTextBlock} from '@portabletext/types'

export type GalleryImage = {
  url: string
  altText?: string
  width?: number
  height?: number
}

export type ColorSize = {
  variantId: string // gid://shopify/ProductVariant/...
  label: string // '240X220'
  price: number
  compareAtPrice?: number
  availableForSale: boolean
  // Precio descontado SOLO para mostrar (reseller). El cart sigue usando `price`.
  displayPrice?: number
}

export type ProductColor = {
  slug: string // 'cardon-seed'
  label: string // 'CARDON SEED'
  hex: string // '#757331'
  taxonomyValueGids: string[] // ['gid://shopify/TaxonomyValue/9']
  images: GalleryImage[]
  sizes: ColorSize[]
  // Optional per-color override of the related products. When set, the PDP
  // shows this list instead of ProductView.related for this color.
  related?: ProductMiniCard[]
}

export type ProductEditorial = {
  /** Description comes from Shopify (descriptionHtml), rendered as HTML. */
  descripcion: string | null
  propiedadesMaterial: PortableTextBlock[] | null
  recomendacionesLavado: PortableTextBlock[] | null
  usoRecomendado: PortableTextBlock[] | null
}

export type ProductMiniCard = {
  handle: string
  title: string
  imageUrl?: string
  imageAlt?: string
  minPrice?: number
  maxPrice?: number
  /** Original (struck-through) price when a B2B display discount is applied. */
  compareAtPrice?: number
  /** Color slug for the variant chosen in Sanity (used in link query). */
  colorSlug?: string
}

export type ProductView = {
  id: string
  handle: string
  title: string
  /** Shopify productType (categoría) — usado para alt/SEO. */
  productType?: string
  /** Etiqueta de material principal (cover/fabric/filler) — usado para alt/SEO. */
  material?: string
  currency: string
  minPrice: number
  maxPrice: number
  /** Original (struck-through) min price when a B2B display discount is applied. */
  compareMinPrice?: number
  /** Original (struck-through) max price when a B2B display discount is applied. */
  compareMaxPrice?: number
  featuredImageUrl?: string
  editorial: ProductEditorial
  hasEditorial: boolean
  colors: ProductColor[]
  defaultColorSlug: string
  related: ProductMiniCard[]
}

export type ProductInitialState = {
  color: string
  size: string | undefined
}
