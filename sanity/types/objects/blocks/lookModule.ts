// sanity/types/objects/blocks/lookModule.ts
import type {BundleCardData} from '../cards'

export type LookModuleLayout = 'row-wide' | 'grid-2col'

export type LookModuleBlock = {
  _key: string
  _type: 'block.lookModule'
  title?: string
  layout?: LookModuleLayout
  // Resolved by GROQ from looks references.
  looks?: BundleCardData[]
}
