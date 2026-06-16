// sanity/types/objects/blocks/downloadButton.ts
import type {Image} from '@/sanity/types/primitives/image'

export type DownloadButtonBlock = {
  _type: 'block.downloadButton'
  _key: string
  title: string
  description?: string
  image?: Image & {alt?: string}
  fileUrl?: string
  fileName?: string
}
