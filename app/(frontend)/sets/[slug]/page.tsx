import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getSet, getSetSlugs, getSetSEO} from '@/sanity/queries/queries/set'
import {getProductDetail, getProductCards} from '@/lib/shopify'
import {buildLookView} from '@/lib/look/buildLookView'
import {BASE_URL, siteTitle} from '@/utils/seoHelper'
import LookDetail from '@/components/Look/LookDetail'

export const revalidate = 300

export async function generateStaticParams() {
  const slugs = await getSetSlugs()
  return slugs.map((slug) => ({slug}))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{slug: string}>
}): Promise<Metadata> {
  const {slug} = await params
  const data = await getSetSEO(slug)
  if (!data) return {title: `Set not found | ${siteTitle}`}
  const seo = (data.seo ?? {}) as {title?: string; description?: string}
  const title = seo.title || data.title
  const canonical = `${BASE_URL.origin}/sets/${slug}`
  return {
    title: `${title} | ${siteTitle}`,
    description: seo.description,
    alternates: {canonical},
    openGraph: {title, description: seo.description, url: canonical},
  }
}

export default async function SetPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params
  const set = await getSet(slug)
  if (!set) notFound()

  // Unique product handles across components, fetched live from Shopify in parallel.
  const handles = Array.from(
    new Set((set.components ?? []).map((c) => c.productHandle).filter((h): h is string => !!h)),
  )
  const detailsList = await Promise.all(handles.map((h) => getProductDetail(h)))
  const details: Record<string, Awaited<ReturnType<typeof getProductDetail>>> = {}
  handles.forEach((h, i) => {
    details[h] = detailsList[i]
  })

  const relatedHandles = (set.relatedProducts ?? [])
    .map((r) => r.handle)
    .filter((h): h is string => !!h)
  const relatedCards = relatedHandles.length ? await getProductCards(relatedHandles) : []

  const view = buildLookView(set, details, relatedCards)

  if (view.components.length === 0) notFound()

  return <LookDetail view={view} />
}
