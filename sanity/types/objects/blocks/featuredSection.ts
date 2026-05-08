// sanity/types/objects/blocks/featuredSection.ts
import type {PortableTextBlock, SanityImageRef} from './heroCampaign'

export type FeaturedSectionCta = {
  label?: string
  url?: string
}

export type FeaturedSectionBlock = {
  _key: string
  _type: 'block.featuredSection'
  image?: SanityImageRef
  headline?: string
  body?: PortableTextBlock[]
  cta?: FeaturedSectionCta
  mediaPosition?: 'left' | 'right'
}
