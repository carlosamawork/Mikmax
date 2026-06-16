// sanity/types/objects/blocks/downloadButton.ts
export type DownloadButtonBlock = {
  _type: 'block.downloadButton'
  _key: string
  title: string
  description?: string
  fileUrl?: string
  fileName?: string
}
