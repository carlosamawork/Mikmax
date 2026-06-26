import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {B2bHero} from '@/components/B2B'
import PageBuilder from '@/components/PageBuilder/PageBuilder'
import {getMikmaxForBusiness} from '@/sanity/queries/queries/mikmaxForBusiness'
import {urlFor} from '@/sanity/queries'
import {getLocale} from '@/lib/i18n/getLocale'
import {B2B_ENABLED} from '@/lib/b2b/flag'
import {
  buildUrl,
  siteTitle,
  localeAlternates,
  BASE_IMAGE_URL,
  BASE_IMAGE_WIDTH,
  BASE_IMAGE_HEIGHT,
} from '@/utils/seoHelper'
import JsonLd from '@/components/Common/JsonLd/JsonLd'
import s from './B2b.module.scss'

const B2B_TITLE = 'Mikmax for Business'
const B2B_DESCRIPTION =
  'Mikmax professional account: hospitality textiles for resellers and interior designers.'

export function generateMetadata(): Metadata {
  return {
    title: B2B_TITLE,
    description: B2B_DESCRIPTION,
    alternates: localeAlternates('/mikmax-for-business'),
    openGraph: {
      title: B2B_TITLE,
      description: B2B_DESCRIPTION,
      url: buildUrl('/mikmax-for-business'),
      siteName: siteTitle,
      type: 'website',
      images: [{url: BASE_IMAGE_URL, width: BASE_IMAGE_WIDTH, height: BASE_IMAGE_HEIGHT}],
    },
    twitter: {
      card: 'summary_large_image',
      title: B2B_TITLE,
      description: B2B_DESCRIPTION,
      images: [BASE_IMAGE_URL],
    },
  }
}

// Fallback estático para el hero cuando aún no se ha cargado imagen en Sanity.
const HERO_IMAGE = '/images/b2b/hero.jpg'

export default async function B2bLandingPage() {
  if (!B2B_ENABLED) notFound()
  const locale = await getLocale()
  const data = await getMikmaxForBusiness(locale)

  const heroImage = data?.heroImage
  const heroSrc = heroImage?.ref
    ? urlFor(heroImage.ref).width(1200).url()
    : heroImage?.imageUrl || HERO_IMAGE
  const heroAlt = heroImage?.alt || 'Mikmax for Business'

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: data?.seo?.title || B2B_TITLE,
    description: data?.seo?.description || B2B_DESCRIPTION,
    url: buildUrl('/mikmax-for-business'),
    isPartOf: {'@type': 'WebSite', url: buildUrl('/')},
  }

  return (
    <div className={s.page}>
      <JsonLd data={webPage} />
      <B2bHero imageSrc={heroSrc} imageAlt={heroAlt} />

      <PageBuilder blocks={data?.pageBuilder} />
    </div>
  )
}
