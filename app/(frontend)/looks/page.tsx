import type {Metadata} from 'next'
import LooksArchive from './LooksArchive'
import JsonLd from '@/components/Common/JsonLd/JsonLd'
import {
  buildUrl,
  siteTitle,
  localeAlternates,
  BASE_IMAGE_URL,
  BASE_IMAGE_WIDTH,
  BASE_IMAGE_HEIGHT,
} from '@/utils/seoHelper'
import {getAllLooks} from '@/sanity/queries/queries/look'
import {getLocale} from '@/lib/i18n/getLocale'
import {getDictionary} from '@/lib/i18n/getDictionary'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const {meta} = getDictionary(locale)
  const title = `Looks | ${siteTitle}`
  return {
    title,
    description: meta.description,
    alternates: localeAlternates('/looks'),
    openGraph: {
      title,
      description: meta.description,
      url: buildUrl('/looks'),
      siteName: siteTitle,
      type: 'website',
      images: [{url: BASE_IMAGE_URL, width: BASE_IMAGE_WIDTH, height: BASE_IMAGE_HEIGHT}],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: meta.description,
      images: [BASE_IMAGE_URL],
    },
  }
}

export default async function LooksIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const locale = await getLocale()
  const looks = await getAllLooks(locale)

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    url: buildUrl('/looks'),
    itemListElement: looks
      .filter((l) => !!l.slug)
      .map((l, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: buildUrl(`/looks/${l.slug}`),
        name: l.title ?? l.slug,
      })),
  }

  return (
    <>
      <JsonLd data={itemList} />
      <h1 className="sr-only">Looks</h1>
      <LooksArchive searchParams={params} />
    </>
  )
}
