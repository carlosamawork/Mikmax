// sanity/types/objects/blocks/campaignImageVideo.ts
import type {SanityImageRef, SanityVideo} from './heroCampaign'

export type CampaignAspectRatio = '16:9' | '4:5' | '1:1' | '3:4' | '21:9'

export type CampaignImageVideoBlock = {
  _key: string
  _type: 'block.campaignImageVideo'
  mediaType?: 'image' | 'video'
  image?: SanityImageRef
  video?: SanityVideo
  headline?: string
  url?: string
  aspectRatio?: CampaignAspectRatio
  fullBleed?: boolean
}
