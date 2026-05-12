import {notFound} from 'next/navigation'
import {getProductDetail, getProductCards} from '@/lib/shopify'
import {getSanityProduct} from '@/sanity/queries/queries/product'
import {buildProductView} from '@/lib/product/buildProductView'
import {resolveInitialState} from '@/lib/product/resolveInitialState'

export const revalidate = 300

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{handle: string}>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const {handle} = await params
  const search = await searchParams

  const [sanityDoc, shopifyProduct] = await Promise.all([
    getSanityProduct(handle),
    getProductDetail(handle),
  ])
  if (!shopifyProduct) notFound()

  const relatedHandles = sanityDoc?.relatedProductHandles ?? []
  const relatedCards = relatedHandles.length ? await getProductCards(relatedHandles) : []

  const view = buildProductView(sanityDoc, shopifyProduct, relatedCards)
  const initial = resolveInitialState(view, search)

  return (
    <pre style={{padding: 20, fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap'}}>
      {JSON.stringify({initial, view}, null, 2)}
    </pre>
  )
}
