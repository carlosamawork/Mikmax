// types/look.ts
import type {ProductEditorial} from '@/types/product'

export type LookSizeOption = {
  size: string
  variantGid: string
  price: number
  compareAtPrice?: number
  availableForSale: boolean
}

export type LookComponentView = {
  label: string
  imageUrl?: string
  /** GID del producto Shopify — necesario para el item_id de analytics. */
  productGid?: string
  sizes: LookSizeOption[]
}

export type LookGalleryImage = {
  url: string
  altText?: string
  width?: number
  height?: number
}

export type LookRelatedCard = {
  handle: string
  title: string
  imageUrl?: string
  imageAlt?: string
  minPrice: number
  maxPrice: number
}

export type LookView = {
  id: string
  title: string
  slug: string
  description: string | null
  currency: string
  images: LookGalleryImage[]
  components: LookComponentView[]
  discountStrategy: 'none' | 'sumMinusFixed' | 'sumMinusPercent'
  discountValue: number
  discountCode: string | null
  editorial: ProductEditorial
  hasEditorial: boolean
  related: LookRelatedCard[]
  // Pre-computed price range across all components (cheapest → most expensive size each)
  minTotal: number
  maxTotal: number
}

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
