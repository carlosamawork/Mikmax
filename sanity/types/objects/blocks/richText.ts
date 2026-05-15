// sanity/types/objects/blocks/richText.ts
import type {PortableTextBlock} from './heroCampaign'

export type RichTextBlock = {
  _key: string
  _type: 'block.richText'
  body?: PortableTextBlock[]
}
