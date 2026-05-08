import type {SanityImageRef} from './blocks/heroCampaign'

export type ProductCardData = {
  _id: string
  title?: string
  handle?: string
  imageUrl?: string
  minPrice?: number
  maxPrice?: number
  compareAtPrice?: number
  tags?: string
}

export type BundleCardData = {
  _id: string
  title?: string
  slug?: string
  image?: SanityImageRef
  priceFixed?: number
  priceCompareAt?: number
  colorLocked?: string
}
