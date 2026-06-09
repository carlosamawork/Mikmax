import {groq} from 'next-sanity'
import {client} from '..'
import {seo} from '../fragments/seo'
import {pageBuilderProjection} from '../fragments/pageBuilder'
import type {PageBuilderBlock} from '@/sanity/types'

export type PageData = {
  _id: string
  title: string
  slug: string
  pageBuilder?: PageBuilderBlock[]
  seo?: {
    title?: string
    description?: string
    image?: unknown
  }
}

export async function getPageSlugs(): Promise<string[]> {
  const slugs = await client.fetch<string[]>(
    groq`*[_type == "page" && defined(slug.current)].slug.current`,
    {},
    {next: {tags: ['page'], revalidate: 3600}},
  )
  return slugs ?? []
}

export async function getPage(slug: string): Promise<PageData | null> {
  const result = await client.fetch<PageData | null>(
    groq`*[_type == "page" && slug.current == $slug][0]{
      _id,
      title,
      "slug": slug.current,
      pageBuilder[]{
        _key,
        _type,
        ${pageBuilderProjection}
      },
      seo{
        ${seo}
      }
    }`,
    {slug},
    {next: {tags: ['page', 'product', 'look', `page:${slug}`], revalidate: 3600}},
  )
  return result ?? null
}
