import type {Metadata} from 'next'
import {permanentRedirect} from 'next/navigation'
import {Breadcrumb} from '@/components/Common'
import {PageBuilder} from '@/components/PageBuilder'
import {getPage, getPageSlugs} from '@/sanity/queries/queries/page'
import {urlFor} from '@/sanity/queries'
import {BASE_URL, siteTitle, siteDescription} from '@/utils/seoHelper'

export const revalidate = 3600

export async function generateStaticParams() {
  const slugs = await getPageSlugs()
  return slugs.map((slug) => ({slug: [slug]}))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{slug: string[]}>
}): Promise<Metadata> {
  const {slug} = await params
  const handle = slug?.join('/') ?? ''
  const page = await getPage(handle)
  if (!page) return {title: `Not found | ${siteTitle}`}

  const title = page.seo?.title || page.title
  const description = page.seo?.description || siteDescription
  const canonical = `${BASE_URL.origin}/${page.slug}`
  const ogImageUrl = page.seo?.image ? urlFor(page.seo.image).width(1200).url() : undefined

  return {
    title: `${title} | ${siteTitle}`,
    description,
    alternates: {canonical},
    openGraph: {
      title,
      description,
      url: canonical,
      ...(ogImageUrl ? {images: [{url: ogImageUrl}]} : {}),
    },
  }
}

export default async function CatchAllPage({params}: {params: Promise<{slug: string[]}>}) {
  const {slug} = await params
  const handle = slug?.join('/') ?? ''
  const page = await getPage(handle)

  // Slug desconocido → conserva el comportamiento previo (redirección a home).
  if (!page) permanentRedirect('/')

  return (
    <>
      <Breadcrumb items={[{label: 'Home', href: '/'}, {label: page.title}]} />
      <PageBuilder blocks={page.pageBuilder} />
    </>
  )
}
