import type {Metadata} from 'next'
import SetsArchive from './SetsArchive'
import {siteTitle} from '@/utils/seoHelper'

export const revalidate = 300

export const metadata: Metadata = {
  title: `Sets | ${siteTitle}`,
}

export default async function SetsIndexPage() {
  return <SetsArchive />
}
