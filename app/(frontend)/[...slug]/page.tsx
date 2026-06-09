import type {Metadata} from 'next'
import {permanentRedirect} from 'next/navigation'
import {Breadcrumb} from '@/components/Common'
import {PageBuilder} from '@/components/PageBuilder'
import {getPage, getPageSlugs} from '@/sanity/queries/queries/page'
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
  // El fragmento `seo` aplana la imagen a {imageUrl, ...} (asset->url), no a una
  // referencia que `urlFor` pueda resolver. Usamos el imageUrl proyectado y
  // pedimos el ancho con el query param del CDN de Sanity.
  const seoImageUrl = (page.seo?.image as {imageUrl?: string} | undefined)?.imageUrl
  const ogImageUrl = seoImageUrl ? `${seoImageUrl}?w=1200&fit=max&auto=format` : undefined

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
