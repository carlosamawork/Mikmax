// sanity/types/objects/blocks/index.ts
export * from './heroCampaign'
export * from './campaignImageVideo'
export * from './featuredSection'
export * from './imageWithProduct'
export * from './productModule'
export * from './lookModule'
export * from './setModule'
export * from './richText'
export * from './twoColumn'

import type {HeroCampaignBlock} from './heroCampaign'
import type {CampaignImageVideoBlock} from './campaignImageVideo'
import type {FeaturedSectionBlock} from './featuredSection'
import type {ImageWithProductBlock} from './imageWithProduct'
import type {ProductModuleBlock} from './productModule'
import type {LookModuleBlock} from './lookModule'
import type {SetModuleBlock} from './setModule'
import type {RichTextBlock} from './richText'
import type {TwoColumnBlock} from './twoColumn'

export type PageBuilderBlock =
  | HeroCampaignBlock
  | CampaignImageVideoBlock
  | FeaturedSectionBlock
  | ImageWithProductBlock
  | ProductModuleBlock
  | LookModuleBlock
  | SetModuleBlock
  | RichTextBlock
  | TwoColumnBlock
  | {_key: string; _type: string} // forward-compat for any future block type
