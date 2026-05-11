// sanity/types/objects/blocks/featuredSection.ts
import type {SanityImageRef} from './heroCampaign'

export type FeaturedSectionSlide = {
  _key: string
  image?: SanityImageRef
  title?: string
  url?: string
}

export type FeaturedSectionBlock = {
  _key: string
  _type: 'block.featuredSection'
  slides?: FeaturedSectionSlide[]
}
