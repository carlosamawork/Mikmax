// sanity/types/singletons/home.ts
import type {SEO} from '../objects/seo'
import type {PageBuilderBlock} from '../objects/blocks'

export type HomeData = {
  _id?: string
  pageBuilder?: PageBuilderBlock[]
  seo?: SEO
}
