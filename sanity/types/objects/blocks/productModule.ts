import type {ProductCardData} from '../cards'

export type ProductModuleLayout = 'carousel' | 'grid-4col' | 'grid-mixed'
export type ProductModuleSource = 'manual' | 'collection'

export type ProductModuleBlock = {
  _key: string
  _type: 'block.productModule'
  title?: string
  layout?: ProductModuleLayout
  source?: ProductModuleSource
  // Resolved by GROQ from manualProducts or collection.
  products?: ProductCardData[]
}
