import {notFound, redirect} from 'next/navigation'
import {getLegalPage} from '@/sanity/queries/queries/legal'

export const revalidate = 3600

export default async function LegalIndexPage() {
  const data = await getLegalPage()
  const first = data?.sections?.[0]
  if (!first) notFound()
  redirect(`/legal/${first.slug}`)
}
