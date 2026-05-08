// sanity/types/objects/blocks/index.ts
export * from './heroCampaign'
export * from './campaignImageVideo'
export * from './featuredSection'
export * from './imageWithProduct'
export * from './richText'

import type {HeroCampaignBlock} from './heroCampaign'
import type {CampaignImageVideoBlock} from './campaignImageVideo'
import type {FeaturedSectionBlock} from './featuredSection'
import type {ImageWithProductBlock} from './imageWithProduct'
import type {RichTextBlock} from './richText'

export type PageBuilderBlock =
  | HeroCampaignBlock
  | CampaignImageVideoBlock
  | FeaturedSectionBlock
  | ImageWithProductBlock
  | RichTextBlock
  | {_key: string; _type: string} // forward-compat for unimplemented types (productModule, lookModule, setModule)
