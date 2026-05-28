import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getLook, getLookSlugs, getLookSEO} from '@/sanity/queries/queries/look'
import {getProductDetail, getProductCards} from '@/lib/shopify'
import {buildLookView} from '@/lib/look/buildLookView'
import {BASE_URL, siteTitle} from '@/utils/seoHelper'
import LookDetail from '@/components/Look/LookDetail'

export const revalidate = 300

export async function generateStaticParams() {
  const slugs = await getLookSlugs()
  return slugs.map((slug) => ({slug}))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{slug: string}>
}): Promise<Metadata> {
  const {slug} = await params
  const data = await getLookSEO(slug)
  if (!data) return {title: `Look not found | ${siteTitle}`}
  const seo = (data.seo ?? {}) as {title?: string; description?: string}
  const title = seo.title || data.title
  const canonical = `${BASE_URL.origin}/looks/${slug}`
  return {
    title: `${title} | ${siteTitle}`,
    description: seo.description,
    alternates: {canonical},
    openGraph: {title, description: seo.description, url: canonical},
  }
}

export default async function LookPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params
  const look = await getLook(slug)
  if (!look) notFound()

  // Unique product handles across components, fetched live from Shopify in parallel.
  const handles = Array.from(
    new Set((look.components ?? []).map((c) => c.productHandle).filter((h): h is string => !!h)),
  )
  const detailsList = await Promise.all(handles.map((h) => getProductDetail(h)))
  const details: Record<string, Awaited<ReturnType<typeof getProductDetail>>> = {}
  handles.forEach((h, i) => {
    details[h] = detailsList[i]
  })

  const relatedHandles = (look.relatedProducts ?? [])
    .map((r) => r.handle)
    .filter((h): h is string => !!h)
  const relatedCards = relatedHandles.length ? await getProductCards(relatedHandles) : []

  const view = buildLookView(look, details, relatedCards)

  if (view.components.length === 0) notFound()

  return <LookDetail view={view} />
}
