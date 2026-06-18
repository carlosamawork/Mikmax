// sanity/queries/queries/legal.ts
import {groq} from 'next-sanity'
import {client} from '..'
import type {LegalPageData} from '@/sanity/types'
import type {Locale} from '@/lib/i18n/config'
import {seo} from '../fragments/seo'
import {body} from '../fragments/body'

const LEGAL_PAGE_QUERY = groq`*[_type == "legalPage"][0]{
  title,
  sections[]{
    title,
    "slug": slug.current,
    body[]{
      ${body}
    },
    seo{
      ${seo}
    }
  },
  seo{
    ${seo}
  }
}`

export async function getLegalPage(lang: Locale): Promise<LegalPageData | null> {
  const result = await client.fetch<LegalPageData | null>(
    LEGAL_PAGE_QUERY,
    {lang},
    {next: {tags: ['legalPage'], revalidate: 3600}},
  )
  return result ?? null
}
