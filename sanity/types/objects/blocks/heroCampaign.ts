// sanity/types/objects/blocks/heroCampaign.ts
import type {PortableTextBlock} from '@portabletext/types'

export type SanityImageRef = {
  imageUrl?: string
  alt?: string
  caption?: string
  ref?: string
  hotspot?: {x: number; y: number; height: number; width: number}
  crop?: {top: number; right: number; bottom: number; left: number}
  metadata?: {dimensions?: {width: number; height: number; aspectRatio?: number}}
  filename?: string
}

export type SanityVideo = {
  src?: string
  posterAlt?: string
  poster?: SanityImageRef
}

export type HeroCampaignSlide = {
  _key: string
  mediaType?: 'image' | 'video'
  image?: SanityImageRef
  video?: SanityVideo
  title?: string
  url?: string
}

export type HeroCampaignBlock = {
  _key: string
  _type: 'block.heroCampaign'
  slides?: HeroCampaignSlide[]
}

export type {PortableTextBlock}
