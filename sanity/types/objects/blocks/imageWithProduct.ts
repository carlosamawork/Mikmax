// sanity/types/objects/blocks/imageWithProduct.ts
import type {SanityImageRef} from './heroCampaign'
import type {ProductCardData} from '../cards'

export type ImageWithProductFeature = {
  image?: SanityImageRef
  title?: string
  url?: string
}

export type ImageWithProductBlock = {
  _key: string
  _type: 'block.imageWithProduct'
  feature?: ImageWithProductFeature
  product?: ProductCardData
  imagePosition?: 'left' | 'right'
}
