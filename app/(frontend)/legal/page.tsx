import {notFound, redirect} from 'next/navigation'
import {getLegalPage} from '@/sanity/queries/queries/legal'
import {getLocale} from '@/lib/i18n/getLocale'

export const revalidate = 3600

export default async function LegalIndexPage() {
  const locale = await getLocale()
  const data = await getLegalPage(locale)
  const first = data?.sections?.[0]
  if (!first) notFound()
  redirect(`/legal/${first.slug}`)
}
