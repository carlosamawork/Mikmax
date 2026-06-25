import {cache} from 'react'
import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import ShopArchive from '../ShopArchive'
import JsonLd from '@/components/Common/JsonLd/JsonLd'
import {getCollectionMeta} from '@/lib/shopify'
import {CHUNK_SIZE} from '@/types/shop'
import {getCardsForRequest, searchKeyFor} from '@/lib/shop/cards'
import {siteTitle, siteDescription, localeAlternates, buildUrl} from '@/utils/seoHelper'

export const revalidate = 300

type CollectionMeta = {
  title?: string | null
  descriptionHtml?: string | null
  image?: {url?: string | null; altText?: string | null} | null
}

// Cached so generateMetadata + the page share a single fetch per request.
const getMeta = cache(
  (handle: string): Promise<CollectionMeta | null> => getCollectionMeta(handle),
)

function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{handle: string}>
}): Promise<Metadata> {
  const {handle} = await params
  const meta = await getMeta(handle)
  if (!meta) return {title: `Collection not found | ${siteTitle}`}

  const title = meta.title || handle
  const description = stripHtml(meta.descriptionHtml).slice(0, 160) || siteDescription
  const imageUrl = meta.image?.url

  return {
    title: `${title} | ${siteTitle}`,
    description,
    alternates: localeAlternates('/shop/' + handle),
    openGraph: {
      title,
      description,
      url: buildUrl('/shop/' + handle),
      images: imageUrl
        ? [{url: imageUrl, alt: meta.image?.altText ?? title}]
        : undefined,
    },
  }
}

export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{handle: string}>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const {handle} = await params
  const parsedSearchParams = await searchParams
  const meta = await getMeta(handle)
  if (!meta) notFound()

  const title = meta.title || handle
  const {cards} = await getCardsForRequest(handle, searchKeyFor(parsedSearchParams))
  const listed = cards.slice(0, CHUNK_SIZE).filter((c) => c.handle)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${title} | ${siteTitle}`,
    url: buildUrl('/shop/' + handle),
    numberOfItems: cards.length,
    itemListElement: listed.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: buildUrl('/products/' + c.handle),
      name: c.title,
    })),
  }

  return (
    <>
      <h1 className="sr-only">{title}</h1>
      <JsonLd data={itemList} />
      <ShopArchive handle={handle} searchParams={parsedSearchParams} />
    </>
  )
}
