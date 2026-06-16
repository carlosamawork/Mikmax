import type {ReactNode} from 'react'
import {notFound, redirect} from 'next/navigation'
import {getCurrentCustomer} from '@/lib/auth/customer'
import {isB2bApproved} from '@/lib/b2b/isB2bApproved'
import {B2B_ENABLED} from '@/lib/b2b/flag'

export default async function B2bAreaLayout({children}: {children: ReactNode}) {
  if (!B2B_ENABLED) notFound()
  const session = await getCurrentCustomer()
  if (!session) redirect('/mikmax-for-business')
  if (!isB2bApproved(session.customer)) redirect('/mikmax-for-business')
  return <>{children}</>
}
