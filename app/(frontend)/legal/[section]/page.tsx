import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getLegalPage} from '@/sanity/queries/queries/legal'
import {siteTitle, siteDescription, localeAlternates, buildUrl} from '@/utils/seoHelper'
import {urlFor} from '@/sanity/queries'
import {getLocale} from '@/lib/i18n/getLocale'
import {DEFAULT_LOCALE} from '@/lib/i18n/config'
import LegalLayout from '@/components/Legal/LegalLayout'
import JsonLd from '@/components/Common/JsonLd/JsonLd'

export const revalidate = 3600

export async function generateStaticParams() {
  // Build-time: no request scope, so getLocale()/headers() is unavailable here.
  // Section slugs are locale-independent, so resolve with the default locale.
  const data = await getLegalPage(DEFAULT_LOCALE)
  return (data?.sections ?? []).map((sec) => ({section: sec.slug}))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{section: string}>
}): Promise<Metadata> {
  const {section: slug} = await params
  const locale = await getLocale()
  const data = await getLegalPage(locale)
  const section = data?.sections.find((sec) => sec.slug === slug)
  if (!section) return {title: `Not found | ${siteTitle}`}

  const title = section.seo?.title || section.title
  const description =
    section.seo?.description || data?.seo?.description || siteDescription
  const legalPath = '/legal/' + section.slug

  const ogImageSource = section.seo?.image || data?.seo?.image
  const ogImageUrl = ogImageSource ? urlFor(ogImageSource).width(1200).url() : undefined

  return {
    title: `${title} | ${siteTitle}`,
    description,
    alternates: localeAlternates(legalPath),
    openGraph: {
      title,
      description,
      url: buildUrl(legalPath),
      ...(ogImageUrl ? {images: [{url: ogImageUrl}]} : {}),
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      ...(ogImageUrl ? {images: [ogImageUrl]} : {}),
    },
  }
}

export default async function LegalSectionPage({
  params,
}: {
  params: Promise<{section: string}>
}) {
  const {section: slug} = await params
  const locale = await getLocale()
  const data = await getLegalPage(locale)
  if (!data) notFound()
  const section = data.sections.find((sec) => sec.slug === slug)
  if (!section) notFound()

  const legalPath = '/legal/' + section.slug
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: section.seo?.title || section.title,
    description: section.seo?.description || data.seo?.description || siteDescription,
    url: buildUrl(legalPath),
    isPartOf: {'@type': 'WebSite', url: buildUrl('/')},
  }

  return (
    <>
      <JsonLd data={webPage} />
      <LegalLayout data={data} activeSlug={section.slug} />
    </>
  )
}
