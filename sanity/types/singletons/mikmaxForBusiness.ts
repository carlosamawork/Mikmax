// sanity/types/singletons/mikmaxForBusiness.ts
import type {Image} from '../primitives/image'
import type {SEO} from '../objects/seo'
import type {PageBuilderBlock} from '../objects/blocks'

export type MikmaxForBusinessData = {
  heroImage?: Image & {ref?: string; alt?: string}
  pageBuilder?: PageBuilderBlock[]
  seo?: SEO
}
