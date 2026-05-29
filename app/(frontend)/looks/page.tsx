import type {Metadata} from 'next'
import LooksArchive from './LooksArchive'
import {siteTitle} from '@/utils/seoHelper'

export const revalidate = 300

export const metadata: Metadata = {
  title: `Looks | ${siteTitle}`,
}

export default async function LooksIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  return <LooksArchive searchParams={params} />
}
