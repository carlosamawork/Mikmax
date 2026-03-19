import Landing from '@/components/Landing'
import {buildUrl, siteTitle, siteDescription, BASE_IMAGE_URL, BASE_IMAGE_WIDTH, BASE_IMAGE_HEIGHT} from '@/utils/seoHelper'

export const revalidate = 3600

export async function generateMetadata() {
  return {
    title: siteTitle,
    description: siteDescription,
    alternates: {canonical: buildUrl('/')},
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: buildUrl('/'),
      siteName: siteTitle,
      type: 'website' as const,
      images: [{url: BASE_IMAGE_URL, width: BASE_IMAGE_WIDTH, height: BASE_IMAGE_HEIGHT}],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: siteTitle,
      description: siteDescription,
      images: [BASE_IMAGE_URL],
    },
  }
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteTitle,
  url: buildUrl('/'),
  logo: buildUrl('/mikmax-logo.svg'),
  description: siteDescription,
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
  name: siteTitle,
  url: buildUrl('/'),
}

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: siteTitle,
  description: siteDescription,
  url: buildUrl('/'),
  isPartOf: {'@type': 'WebSite', url: buildUrl('/')},
}

export default function Home() {
  return (
    <>
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
      <Landing />
    </>
  )
}
