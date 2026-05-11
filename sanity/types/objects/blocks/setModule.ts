// sanity/types/objects/blocks/setModule.ts
import type {SetCardData} from '../cards'

export type SetModuleLayout = 'row-mini' | 'grid'

export type SetModuleBlock = {
  _key: string
  _type: 'block.setModule'
  title?: string
  layout?: SetModuleLayout
  // Resolved by GROQ from sets references.
  sets?: SetCardData[]
}
