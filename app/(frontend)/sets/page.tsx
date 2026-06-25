import type {Metadata} from 'next'
import SetsArchive from './SetsArchive'
import JsonLd from '@/components/Common/JsonLd/JsonLd'
import {
  buildUrl,
  siteTitle,
  localeAlternates,
  BASE_IMAGE_URL,
  BASE_IMAGE_WIDTH,
  BASE_IMAGE_HEIGHT,
} from '@/utils/seoHelper'
import {getAllSets} from '@/sanity/queries/queries/set'
import {getLocale} from '@/lib/i18n/getLocale'
import {getDictionary} from '@/lib/i18n/getDictionary'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const {meta} = getDictionary(locale)
  const title = `Sets | ${siteTitle}`
  return {
    title,
    description: meta.description,
    alternates: localeAlternates('/sets'),
    openGraph: {
      title,
      description: meta.description,
      url: buildUrl('/sets'),
      siteName: siteTitle,
      type: 'website',
      images: [{url: BASE_IMAGE_URL, width: BASE_IMAGE_WIDTH, height: BASE_IMAGE_HEIGHT}],
    },
  }
}

export default async function SetsIndexPage() {
  const locale = await getLocale()
  const sets = await getAllSets(locale)

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    url: buildUrl('/sets'),
    itemListElement: sets
      .filter((s) => !!s.slug)
      .map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: buildUrl(`/sets/${s.slug}`),
        name: s.title ?? s.slug,
      })),
  }

  return (
    <>
      <JsonLd data={itemList} />
      <h1 className="sr-only">Sets</h1>
      <SetsArchive />
    </>
  )
}
