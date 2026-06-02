// sanity/types/objects/blocks/setModule.ts
import type {SanityImageRef} from './heroCampaign'
import type {ProductCardData} from '../cards'

export type SetModuleBlock = {
  _key: string
  _type: 'block.setModule'
  title?: string
  subtitle?: string
  // Resolved by GROQ from the product reference.
  product?: ProductCardData
  images?: SanityImageRef[]
}
