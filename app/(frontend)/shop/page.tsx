import ShopArchive from './ShopArchive'
import {ALL_HANDLE} from '@/types/shop'

export const revalidate = 300

export default async function ShopIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  return <ShopArchive handle={ALL_HANDLE} searchParams={params} />
}
