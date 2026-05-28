import type {PortableTextBlock} from 'next-sanity'
import type {SEO} from '../objects/seo'

export type LegalSection = {
  title: string
  slug: string
  body?: PortableTextBlock[]
  seo?: SEO
}

export type LegalPageData = {
  title: string
  sections: LegalSection[]
  seo?: SEO
}
