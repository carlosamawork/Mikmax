import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getLegalPage} from '@/sanity/queries/queries/legal'
import {siteTitle, siteDescription, localeAlternates, buildUrl} from '@/utils/seoHelper'
import {urlFor} from '@/sanity/queries'
import {getLocale} from '@/lib/i18n/getLocale'
import LegalLayout from '@/components/Legal/LegalLayout'

export const revalidate = 3600

export async function generateStaticParams() {
  const locale = await getLocale()
  const data = await getLegalPage(locale)
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
  return <LegalLayout data={data} activeSlug={section.slug} />
}
