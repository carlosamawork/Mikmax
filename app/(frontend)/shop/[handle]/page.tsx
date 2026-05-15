import {notFound} from 'next/navigation'
import ShopArchive from '../ShopArchive'
import {getCollectionMeta} from '@/lib/shopify'

export const revalidate = 300

export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{handle: string}>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const {handle} = await params
  const parsedSearchParams = await searchParams
  const meta = await getCollectionMeta(handle)
  if (!meta) notFound()
  return <ShopArchive handle={handle} searchParams={parsedSearchParams} />
}
