import {buildUrl, BASE_IMAGE_URL, BASE_IMAGE_WIDTH, BASE_IMAGE_HEIGHT, localeAlternates} from '@/utils/seoHelper'
import {PageBuilder} from '@/components/PageBuilder'
import {getHome} from '@/sanity/queries/queries/home'
import {getLocale} from '@/lib/i18n/getLocale'
import {getDictionary} from '@/lib/i18n/getDictionary'

export const revalidate = 3600

export async function generateMetadata() {
  const locale = await getLocale()
  const {meta} = getDictionary(locale)
  return {
    title: meta.title,
    description: meta.description,
    alternates: localeAlternates('/'),
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: buildUrl('/'),
      siteName: meta.title,
      type: 'website' as const,
      images: [{url: BASE_IMAGE_URL, width: BASE_IMAGE_WIDTH, height: BASE_IMAGE_HEIGHT}],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: meta.title,
      description: meta.description,
      images: [BASE_IMAGE_URL],
    },
  }
}

export default async function Home() {
  const locale = await getLocale()
  const {meta} = getDictionary(locale)
  const data = await getHome(locale)

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: meta.title,
    url: buildUrl('/'),
    logo: buildUrl('/icons/mikmax.svg'),
    description: meta.description,
    foundingLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Barcelona',
        addressCountry: 'ES',
      },
    },
  }

  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: meta.title,
    url: buildUrl('/'),
  }

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: meta.title,
    description: meta.description,
    url: buildUrl('/'),
    isPartOf: {'@type': 'WebSite', url: buildUrl('/')},
  }

  return (
    <>
      <h1 className="sr-only">{meta.title}</h1>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(organizationSchema)}}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(webSiteSchema)}}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(webPageSchema)}}
      />
      <PageBuilder blocks={data?.pageBuilder} spaced />
    </>
  )
}
