import type {Metadata} from 'next'
import ShopArchive from './ShopArchive'
import JsonLd from '@/components/Common/JsonLd/JsonLd'
import {ALL_HANDLE, CHUNK_SIZE} from '@/types/shop'
import {getCardsForRequest, searchKeyFor} from '@/lib/shop/cards'
import {siteTitle, localeAlternates, buildUrl} from '@/utils/seoHelper'
import {getLocale} from '@/lib/i18n/getLocale'
import {getDictionary} from '@/lib/i18n/getDictionary'

export const revalidate = 300

const SHOP_TITLE = 'Shop'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const {meta} = getDictionary(locale)
  const title = `${SHOP_TITLE} | ${siteTitle}`
  return {
    title,
    description: meta.description,
    alternates: localeAlternates('/shop'),
    openGraph: {
      title,
      description: meta.description,
      url: buildUrl('/shop'),
    },
  }
}

export default async function ShopIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams

  const {cards} = await getCardsForRequest(ALL_HANDLE, searchKeyFor(params))
  const listed = cards.slice(0, CHUNK_SIZE).filter((c) => c.handle)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${SHOP_TITLE} | ${siteTitle}`,
    url: buildUrl('/shop'),
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
      <h1 className="sr-only">{SHOP_TITLE}</h1>
      <JsonLd data={itemList} />
      <ShopArchive handle={ALL_HANDLE} searchParams={params} />
    </>
  )
}
