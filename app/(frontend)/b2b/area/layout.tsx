import type {ReactNode} from 'react'
import {redirect} from 'next/navigation'
import {getCurrentCustomer} from '@/lib/auth/customer'
import {isB2bApproved} from '@/lib/b2b/isB2bApproved'

export default async function B2bAreaLayout({children}: {children: ReactNode}) {
  const session = await getCurrentCustomer()
  if (!session) redirect('/b2b')
  if (!isB2bApproved(session.customer)) redirect('/b2b')
  return <>{children}</>
}
