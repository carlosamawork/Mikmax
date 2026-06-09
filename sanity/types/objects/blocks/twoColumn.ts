import type {PortableTextBlock} from '@portabletext/types'
import type {SanityImageRef, SanityVideo} from './heroCampaign'

export type TwoColumnCell =
  | {
      kind: 'text'
      body?: PortableTextBlock[]
    }
  | {
      kind: 'media'
      mediaType?: 'image' | 'video'
      image?: SanityImageRef
      video?: SanityVideo
      caption?: string
      captionTheme?: 'light' | 'dark'
      url?: string
    }

export type TwoColumnBlock = {
  _key: string
  _type: 'block.twoColumn'
  left: TwoColumnCell
  right: TwoColumnCell
}
