// sanity/types/objects/blocks/imageWithProduct.ts
import type {SanityImageRef} from './heroCampaign'

export type ImageWithProductFeature = {
  image?: SanityImageRef
  title?: string
  url?: string
}

export type ImageWithProductProduct = {
  _id: string
  title?: string
  handle?: string
  imageUrl?: string
  price?: number
  compareAtPrice?: number
}

export type ImageWithProductBlock = {
  _key: string
  _type: 'block.imageWithProduct'
  feature?: ImageWithProductFeature
  product?: ImageWithProductProduct
  imagePosition?: 'left' | 'right'
}
